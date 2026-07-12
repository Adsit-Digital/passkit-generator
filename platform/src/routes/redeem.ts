import { Hono } from "hono";
import type { Env } from "../env";
import { getCoupon, getMerchantById, getPass, redeemPass } from "../db";
import { currentMerchant } from "../auth";
import { pushPassUpdates } from "../apns";
import { redeemPage } from "../ui";

/**
 * Staff-facing redemption flow. The QR inside every wallet pass points
 * here; any phone camera resolves it. Marking a pass redeemed requires a
 * signed-in merchant account matching the coupon's owner, then voids the
 * pass on the customer's phone via a push update.
 */
export const redeemRoutes = new Hono<{ Bindings: Env }>();

redeemRoutes.get("/r/:serial", async (c) => {
	const pass = await getPass(c.env, c.req.param("serial"));
	if (!pass) {
		return c.notFound();
	}
	const coupon = (await getCoupon(c.env, pass.coupon_id))!;
	const merchant = (await getMerchantById(c.env, coupon.merchant_id))!;
	const viewer = await currentMerchant(c);
	return c.html(
		redeemPage({
			merchantName: merchant.name,
			coupon,
			serial: pass.serial,
			redeemedAt: pass.redeemed_at,
			canRedeem: viewer?.id === merchant.id,
			message: c.req.query("notice"),
		}),
	);
});

redeemRoutes.post("/r/:serial/redeem", async (c) => {
	const pass = await getPass(c.env, c.req.param("serial"));
	if (!pass) {
		return c.notFound();
	}
	const coupon = (await getCoupon(c.env, pass.coupon_id))!;
	const viewer = await currentMerchant(c);
	if (!viewer || viewer.id !== coupon.merchant_id) {
		return c.text("Sign in as this restaurant to redeem passes.", 403);
	}
	if (pass.redeemed_at) {
		return c.redirect(`/r/${pass.serial}`);
	}
	await redeemPass(c.env, pass);

	// Void the pass on the holder's phone right away.
	c.executionCtx.waitUntil(
		(async () => {
			const { results } = await c.env.DB.prepare(
				`SELECT d.push_token AS token FROM apple_devices d
				 JOIN apple_registrations r ON r.device_library_id = d.device_library_id
				 WHERE r.serial = ?`,
			)
				.bind(pass.serial)
				.all<{ token: string }>();
			await pushPassUpdates(c.env, results.map((r) => r.token));
		})(),
	);
	return c.redirect(`/r/${pass.serial}?notice=${encodeURIComponent("Redeemed — enjoy!")}`);
});
