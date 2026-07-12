import type { Coupon, Env, Merchant, PassRow } from "./env";
import { googleConfigured } from "./env";

const SAVE_URL = "https://pay.google.com/gp/v/save/";
const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

function base64url(data: ArrayBuffer | Uint8Array | string): string {
	const bytes =
		typeof data === "string"
			? new TextEncoder().encode(data)
			: data instanceof Uint8Array
				? data
				: new Uint8Array(data);
	let binary = "";
	for (const b of bytes) {
		binary += String.fromCharCode(b);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array {
	const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
	const raw = atob(body);
	const out = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) {
		out[i] = raw.charCodeAt(i);
	}
	return out;
}

async function signRs256(env: Env, header: object, payload: object): Promise<string> {
	const key = await crypto.subtle.importKey(
		"pkcs8",
		pemToDer(env.GOOGLE_SA_KEY!) as BufferSource,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(signingInput),
	);
	return `${signingInput}.${base64url(signature)}`;
}

function classId(env: Env, coupon: Coupon): string {
	return `${env.GOOGLE_ISSUER_ID}.coupon_${coupon.id}`;
}

function offerClass(env: Env, merchant: Merchant, coupon: Coupon) {
	return {
		id: classId(env, coupon),
		issuerName: merchant.name,
		provider: merchant.name,
		title: `${coupon.offer} — ${coupon.title}`,
		redemptionChannel: "INSTORE",
		reviewStatus: "UNDER_REVIEW",
		hexBackgroundColor: rgbToHex(coupon.background_color),
		...(coupon.terms ? { finePrint: coupon.terms } : {}),
	};
}

function rgbToHex(rgb: string): string {
	const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!m) {
		return "#c53d20";
	}
	return (
		"#" +
		[m[1], m[2], m[3]]
			.map((n) => Number(n).toString(16).padStart(2, "0"))
			.join("")
	);
}

/**
 * Builds a "Save to Google Wallet" link. The offer class and object are
 * embedded in the signed JWT, so no API pre-provisioning is needed for
 * the save flow itself.
 */
export async function buildGoogleSaveUrl(
	env: Env,
	merchant: Merchant,
	coupon: Coupon,
	pass: PassRow,
): Promise<string> {
	const redeemUrl = `${env.BASE_URL}/r/${pass.serial}`;
	const offerObject = {
		id: `${env.GOOGLE_ISSUER_ID}.pass_${pass.serial}`,
		classId: classId(env, coupon),
		state: "ACTIVE",
		barcode: { type: "QR_CODE", value: redeemUrl, alternateText: pass.serial.slice(0, 8).toUpperCase() },
		...(coupon.expires_at
			? { validTimeInterval: { end: { date: new Date(coupon.expires_at).toISOString() } } }
			: {}),
	};

	const jwt = await signRs256(
		env,
		{ alg: "RS256", typ: "JWT" },
		{
			iss: env.GOOGLE_SA_EMAIL,
			aud: "google",
			typ: "savetowallet",
			iat: Math.floor(Date.now() / 1000),
			origins: [env.BASE_URL],
			payload: {
				offerClasses: [offerClass(env, merchant, coupon)],
				offerObjects: [offerObject],
			},
		},
	);
	return SAVE_URL + jwt;
}

async function getAccessToken(env: Env): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const assertion = await signRs256(
		env,
		{ alg: "RS256", typ: "JWT" },
		{ iss: env.GOOGLE_SA_EMAIL, scope: WALLET_SCOPE, aud: OAUTH_TOKEN_URL, iat: now, exp: now + 3600 },
	);
	const res = await fetch(OAUTH_TOKEN_URL, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion,
		}),
	});
	if (!res.ok) {
		throw new Error(`Google OAuth ${res.status}`);
	}
	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

/**
 * Google Wallet objects are server-side stateful: updating the shared
 * offer class updates every saved pass. Best-effort — the coupon edit
 * must succeed even if Google is unreachable or not configured.
 */
export async function updateGoogleOfferClass(
	env: Env,
	merchant: Merchant,
	coupon: Coupon,
): Promise<void> {
	if (!googleConfigured(env)) {
		return;
	}
	try {
		const token = await getAccessToken(env);
		const id = classId(env, coupon);
		const res = await fetch(`${WALLET_API}/offerClass/${encodeURIComponent(id)}`, {
			method: "PATCH",
			headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
			body: JSON.stringify(offerClass(env, merchant, coupon)),
		});
		// 404 simply means no Google pass was ever saved for this coupon.
		if (!res.ok && res.status !== 404) {
			console.warn(`Google Wallet class update failed: ${res.status}`);
		}
	} catch (err) {
		console.warn("Google Wallet class update error", err);
	}
}
