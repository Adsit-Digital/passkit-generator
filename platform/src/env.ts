/** One APNs push job: a batch of device tokens to wake for a coupon/pass. */
export interface ApnsPushMessage {
	tokens: string[];
	/** For observability only. */
	reason: "coupon_update" | "redeemed" | "expired";
	couponId?: string;
	serial?: string;
}

export interface Env {
	DB: D1Database;
	SESSIONS: KVNamespace;
	/** Bound only on the Workers Paid plan; guarded by apnsQueueConfigured(). */
	APNS_QUEUE?: Queue<ApnsPushMessage>;
	/** Usage metrics; guarded by analyticsConfigured(). */
	ANALYTICS?: AnalyticsEngineDataset;
	/** Rate limiters (unsafe bindings); guarded before use. */
	LOGIN_LIMITER?: RateLimit;
	CLAIM_LIMITER?: RateLimit;
	WALLET_LIMITER?: RateLimit;

	BASE_URL: string;
	APPLE_PASS_TYPE_ID: string;
	APPLE_TEAM_ID: string;
	GOOGLE_ISSUER_ID: string;

	// Secrets
	SIGNER_CERT?: string;
	SIGNER_KEY?: string;
	SIGNER_PASSPHRASE?: string;
	WWDR?: string;
	APNS_KEY?: string;
	APNS_KEY_ID?: string;
	GOOGLE_SA_EMAIL?: string;
	GOOGLE_SA_KEY?: string;
	SESSION_SECRET?: string;
	/** Turnstile secret key; when unset, bot checks are skipped. */
	TURNSTILE_SECRET?: string;
	/** Turnstile public site key, injected into pages; empty disables the widget. */
	TURNSTILE_SITE_KEY?: string;
}

/** Minimal shape of Cloudflare's rate-limit binding (avoids a types dependency). */
export interface RateLimit {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Merchant {
	id: string;
	slug: string;
	name: string;
	email: string;
	password_hash: string;
	created_at: string;
}

export interface Coupon {
	id: string;
	merchant_id: string;
	slug: string;
	title: string;
	offer: string;
	description: string;
	terms: string;
	background_color: string;
	foreground_color: string;
	label_color: string;
	expires_at: string | null;
	status: "active" | "archived";
	created_at: string;
	updated_at: string;
}

export interface PassRow {
	serial: string;
	coupon_id: string;
	auth_token: string;
	platform: "apple" | "google";
	created_at: string;
	updated_at: string;
	redeemed_at: string | null;
}

export function appleConfigured(env: Env): boolean {
	return Boolean(
		env.SIGNER_CERT &&
			env.SIGNER_KEY &&
			env.WWDR &&
			env.APPLE_TEAM_ID &&
			!env.APPLE_TEAM_ID.startsWith("REPLACE"),
	);
}

export function googleConfigured(env: Env): boolean {
	return Boolean(env.GOOGLE_ISSUER_ID && env.GOOGLE_SA_EMAIL && env.GOOGLE_SA_KEY);
}

export function apnsConfigured(env: Env): boolean {
	return Boolean(env.APNS_KEY && env.APNS_KEY_ID && env.APPLE_TEAM_ID);
}

export function turnstileConfigured(env: Env): boolean {
	return Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY);
}
