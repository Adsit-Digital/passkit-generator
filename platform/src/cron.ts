import type { Coupon, Env } from "./env";
import { appleConfigured } from "./env";
import { enqueuePushUpdates } from "./apns";
import { track } from "./analytics";

/**
 * Nightly sweep: archive coupons past their expiry and push one final
 * update so held passes flip to expired/voided on the lock screen.
 */
export async function sweepExpiredCoupons(env: Env): Promise<number> {
	const { results } = await env.DB.prepare(
		`SELECT * FROM coupons
		 WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < datetime('now')`,
	).all<Coupon>();

	for (const coupon of results) {
		await env.DB.batch([
			env.DB.prepare(
				"UPDATE coupons SET status = 'archived', updated_at = datetime('now') WHERE id = ?",
			).bind(coupon.id),
			env.DB.prepare(
				"UPDATE passes SET updated_at = datetime('now') WHERE coupon_id = ?",
			).bind(coupon.id),
		]);
		const { results: tokens } = await env.DB.prepare(
			`SELECT DISTINCT d.push_token AS token FROM apple_devices d
			 JOIN apple_registrations r ON r.device_library_id = d.device_library_id
			 JOIN passes p ON p.serial = r.serial
			 WHERE p.coupon_id = ?`,
		)
			.bind(coupon.id)
			.all<{ token: string }>();
		await enqueuePushUpdates(
			env,
			tokens.map((t) => t.token),
			{ reason: "expired", couponId: coupon.id },
		);
		track(env, "push_sent", {
			merchantId: coupon.merchant_id,
			couponId: coupon.id,
			count: tokens.length,
		});
	}
	return results.length;
}

/**
 * Weekly reminder: warn when the Apple pass-signing certificate is within
 * 30 days of expiry, so passes never silently stop signing. Logs a warning
 * (surfaced via Workers Logs / alerting); a no-op without Apple configured.
 */
export async function checkCertExpiry(env: Env): Promise<void> {
	if (!appleConfigured(env) || !env.SIGNER_CERT) {
		return;
	}
	const notAfter = parseCertNotAfter(env.SIGNER_CERT);
	if (!notAfter) {
		console.warn("[cert-check] could not parse SIGNER_CERT notAfter date");
		return;
	}
	const daysLeft = Math.floor((notAfter.getTime() - Date.now()) / 86_400_000);
	if (daysLeft <= 30) {
		console.warn(
			`[cert-check] Apple pass certificate expires in ${daysLeft} day(s), on ${notAfter.toISOString().slice(0, 10)}. Renew it in the Apple Developer portal and update the SIGNER_CERT secret.`,
		);
	}
}

/**
 * Extracts a PEM certificate's notAfter without pulling in a parser: decode
 * the base64 body and read the second UTCTime/GeneralizedTime in the
 * validity SEQUENCE. Best-effort; returns null if the shape is unexpected.
 */
function parseCertNotAfter(pem: string): Date | null {
	const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
	let der: Uint8Array;
	try {
		const raw = atob(b64);
		der = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
	} catch {
		return null;
	}
	// Find time tags: UTCTime (0x17) and GeneralizedTime (0x18). The validity
	// window is the first two consecutive time values; take the second.
	const times: Date[] = [];
	for (let i = 0; i < der.length - 1 && times.length < 2; i++) {
		const tag = der[i];
		if (tag !== 0x17 && tag !== 0x18) {
			continue;
		}
		const len = der[i + 1];
		if (len === 0 || len > 0x7f || i + 2 + len > der.length) {
			continue;
		}
		const bytes = der.subarray(i + 2, i + 2 + len);
		const str = String.fromCharCode(...bytes);
		const parsed = parseAsn1Time(str, tag === 0x18);
		if (parsed) {
			times.push(parsed);
			i += 1 + len;
		}
	}
	return times[1] ?? null;
}

function parseAsn1Time(value: string, generalized: boolean): Date | null {
	// UTCTime: YYMMDDHHMMSSZ ; GeneralizedTime: YYYYMMDDHHMMSSZ
	const m = generalized
		? value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/)
		: value.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
	if (!m) {
		return null;
	}
	let [, y, mo, d, h, mi, s] = m;
	const year = generalized ? Number(y) : Number(y) >= 50 ? 1900 + Number(y) : 2000 + Number(y);
	const date = new Date(
		Date.UTC(year, Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)),
	);
	return Number.isNaN(date.getTime()) ? null : date;
}
