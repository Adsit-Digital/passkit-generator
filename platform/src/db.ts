import type { Coupon, Env, Merchant, PassRow } from "./env";

export function newId(): string {
	return crypto.randomUUID().replace(/-/g, "");
}

export function slugify(input: string): string {
	return (
		input
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 48) || "x"
	);
}

export async function getMerchantByEmail(env: Env, email: string) {
	return env.DB.prepare("SELECT * FROM merchants WHERE email = ?")
		.bind(email.toLowerCase())
		.first<Merchant>();
}

export async function getMerchantById(env: Env, id: string) {
	return env.DB.prepare("SELECT * FROM merchants WHERE id = ?").bind(id).first<Merchant>();
}

export async function createMerchant(
	env: Env,
	fields: { name: string; email: string; passwordHash: string },
): Promise<Merchant> {
	const id = newId();
	let slug = slugify(fields.name);
	const clash = await env.DB.prepare("SELECT 1 FROM merchants WHERE slug = ?")
		.bind(slug)
		.first();
	if (clash) {
		slug = `${slug}-${id.slice(0, 6)}`;
	}
	await env.DB.prepare(
		"INSERT INTO merchants (id, slug, name, email, password_hash) VALUES (?, ?, ?, ?, ?)",
	)
		.bind(id, slug, fields.name, fields.email.toLowerCase(), fields.passwordHash)
		.run();
	return (await getMerchantById(env, id))!;
}

export async function listCoupons(env: Env, merchantId: string) {
	const { results } = await env.DB.prepare(
		`SELECT c.*,
			(SELECT COUNT(*) FROM passes p WHERE p.coupon_id = c.id) AS pass_count,
			(SELECT COUNT(*) FROM redemptions r WHERE r.coupon_id = c.id) AS redemption_count
		 FROM coupons c WHERE c.merchant_id = ? ORDER BY c.created_at DESC`,
	)
		.bind(merchantId)
		.all<Coupon & { pass_count: number; redemption_count: number }>();
	return results;
}

export async function getCoupon(env: Env, id: string) {
	return env.DB.prepare("SELECT * FROM coupons WHERE id = ?").bind(id).first<Coupon>();
}

export async function getCouponBySlugs(env: Env, merchantSlug: string, couponSlug: string) {
	return env.DB.prepare(
		`SELECT c.* FROM coupons c JOIN merchants m ON m.id = c.merchant_id
		 WHERE m.slug = ? AND c.slug = ?`,
	)
		.bind(merchantSlug, couponSlug)
		.first<Coupon>();
}

export interface CouponInput {
	title: string;
	offer: string;
	description: string;
	terms: string;
	background_color: string;
	foreground_color: string;
	label_color: string;
	expires_at: string | null;
}

export async function createCoupon(env: Env, merchantId: string, input: CouponInput) {
	const id = newId();
	let slug = slugify(input.title);
	const clash = await env.DB.prepare(
		"SELECT 1 FROM coupons WHERE merchant_id = ? AND slug = ?",
	)
		.bind(merchantId, slug)
		.first();
	if (clash) {
		slug = `${slug}-${id.slice(0, 6)}`;
	}
	await env.DB.prepare(
		`INSERT INTO coupons (id, merchant_id, slug, title, offer, description, terms,
			background_color, foreground_color, label_color, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			id,
			merchantId,
			slug,
			input.title,
			input.offer,
			input.description,
			input.terms,
			input.background_color,
			input.foreground_color,
			input.label_color,
			input.expires_at,
		)
		.run();
	return id;
}

/**
 * Updates a coupon and bumps updated_at on the coupon and on every
 * issued pass, so Apple devices re-fetch it after the push notification.
 */
export async function updateCoupon(env: Env, id: string, input: CouponInput, status: string) {
	await env.DB.batch([
		env.DB.prepare(
			`UPDATE coupons SET title = ?, offer = ?, description = ?, terms = ?,
				background_color = ?, foreground_color = ?, label_color = ?,
				expires_at = ?, status = ?, updated_at = datetime('now')
			 WHERE id = ?`,
		).bind(
			input.title,
			input.offer,
			input.description,
			input.terms,
			input.background_color,
			input.foreground_color,
			input.label_color,
			input.expires_at,
			status,
			id,
		),
		env.DB.prepare(
			"UPDATE passes SET updated_at = datetime('now') WHERE coupon_id = ?",
		).bind(id),
	]);
}

export async function createPass(
	env: Env,
	couponId: string,
	platform: "apple" | "google",
): Promise<PassRow> {
	const serial = newId();
	const authToken = newId() + newId();
	await env.DB.prepare(
		"INSERT INTO passes (serial, coupon_id, auth_token, platform) VALUES (?, ?, ?, ?)",
	)
		.bind(serial, couponId, authToken, platform)
		.run();
	return (await getPass(env, serial))!;
}

export async function getPass(env: Env, serial: string) {
	return env.DB.prepare("SELECT * FROM passes WHERE serial = ?").bind(serial).first<PassRow>();
}

export async function redeemPass(env: Env, pass: PassRow) {
	await env.DB.batch([
		env.DB.prepare(
			"UPDATE passes SET redeemed_at = datetime('now'), updated_at = datetime('now') WHERE serial = ?",
		).bind(pass.serial),
		env.DB.prepare("INSERT INTO redemptions (serial, coupon_id) VALUES (?, ?)").bind(
			pass.serial,
			pass.coupon_id,
		),
	]);
}

/** Push tokens of every Apple device that holds a pass for this coupon. */
export async function getPushTokensForCoupon(env: Env, couponId: string): Promise<string[]> {
	const { results } = await env.DB.prepare(
		`SELECT DISTINCT d.push_token AS token
		 FROM apple_devices d
		 JOIN apple_registrations r ON r.device_library_id = d.device_library_id
		 JOIN passes p ON p.serial = r.serial
		 WHERE p.coupon_id = ?`,
	)
		.bind(couponId)
		.all<{ token: string }>();
	return results.map((r) => r.token);
}
