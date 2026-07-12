import forge from "node-forge";
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

	let swept = 0;
	for (const coupon of results) {
		// Isolate each coupon so one failure doesn't abort the whole sweep.
		try {
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
			swept++;
		} catch (err) {
			console.error(`[cron] failed to sweep coupon ${coupon.id}`, err);
		}
	}
	return swept;
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
 * Reads a PEM certificate's notAfter using node-forge (already bundled for
 * pass signing). Best-effort; returns null if the PEM can't be parsed.
 */
function parseCertNotAfter(pem: string): Date | null {
	try {
		return forge.pki.certificateFromPem(pem).validity.notAfter;
	} catch {
		return null;
	}
}
