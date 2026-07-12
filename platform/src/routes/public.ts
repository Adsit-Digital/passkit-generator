import { Hono } from "hono";
import type { Env } from "../env";
import { appleConfigured, googleConfigured } from "../env";
import { createPass, getCouponBySlugs, getMerchantById } from "../db";
import { buildApplePass } from "../applePass";
import { buildGoogleSaveUrl } from "../googleWallet";
import { claimPage, landingPage } from "../ui";
import { track } from "../analytics";

export const publicRoutes = new Hono<{ Bindings: Env }>();

/** Throttle a public wallet-issuance endpoint per client IP. Returns true when allowed. */
async function allowWalletIssue(c: {
	env: Env;
	req: { header: (k: string) => string | undefined };
}): Promise<boolean> {
	if (!c.env.WALLET_LIMITER) {
		return true;
	}
	const ip = c.req.header("cf-connecting-ip") ?? "anon";
	const { success } = await c.env.WALLET_LIMITER.limit({ key: ip });
	return success;
}

publicRoutes.get("/", (c) => c.html(landingPage()));

/**
 * The claim page a diner lands on after scanning the printed QR.
 * Wallet buttons point at per-platform issuance endpoints below.
 */
publicRoutes.get("/c/:merchantSlug/:couponSlug", async (c) => {
	const coupon = await getCouponBySlugs(
		c.env,
		c.req.param("merchantSlug"),
		c.req.param("couponSlug"),
	);
	if (!coupon || coupon.status !== "active") {
		return c.html("Coupon not found or no longer active.", 404);
	}
	const merchant = await getMerchantById(c.env, coupon.merchant_id);
	const base = `/c/${c.req.param("merchantSlug")}/${c.req.param("couponSlug")}`;
	track(c.env, "claim", { merchantId: coupon.merchant_id, couponId: coupon.id });
	return c.html(
		claimPage(
			merchant?.name ?? "",
			coupon,
			appleConfigured(c.env) ? `${base}/apple.pkpass` : null,
			googleConfigured(c.env) ? `${base}/google` : null,
		),
	);
});

/** Issues a freshly signed .pkpass; every download is a trackable pass row. */
publicRoutes.get("/c/:merchantSlug/:couponSlug/apple.pkpass", async (c) => {
	if (!appleConfigured(c.env)) {
		return c.text("Apple Wallet is not configured for this deployment.", 503);
	}
	if (!(await allowWalletIssue(c))) {
		return c.text("Too many requests. Please try again in a moment.", 429);
	}
	const coupon = await getCouponBySlugs(
		c.env,
		c.req.param("merchantSlug"),
		c.req.param("couponSlug"),
	);
	if (!coupon || coupon.status !== "active") {
		return c.text("Coupon not found or no longer active.", 404);
	}
	const merchant = (await getMerchantById(c.env, coupon.merchant_id))!;
	const pass = await createPass(c.env, coupon.id, "apple");
	const pkpass = buildApplePass(c.env, merchant, coupon, pass);
	track(c.env, "pass_issued", {
		merchantId: coupon.merchant_id,
		couponId: coupon.id,
		platform: "apple",
	});
	return c.body(pkpass.getAsBuffer() as unknown as ArrayBuffer, 200, {
		"content-type": pkpass.mimeType,
		"content-disposition": `attachment; filename=${pass.serial}.pkpass`,
		"cache-control": "no-store",
	});
});

/** Redirects to a signed "Save to Google Wallet" URL. */
publicRoutes.get("/c/:merchantSlug/:couponSlug/google", async (c) => {
	if (!googleConfigured(c.env)) {
		return c.text("Google Wallet is not configured for this deployment.", 503);
	}
	if (!(await allowWalletIssue(c))) {
		return c.text("Too many requests. Please try again in a moment.", 429);
	}
	const coupon = await getCouponBySlugs(
		c.env,
		c.req.param("merchantSlug"),
		c.req.param("couponSlug"),
	);
	if (!coupon || coupon.status !== "active") {
		return c.text("Coupon not found or no longer active.", 404);
	}
	const merchant = (await getMerchantById(c.env, coupon.merchant_id))!;
	const pass = await createPass(c.env, coupon.id, "google");
	const url = await buildGoogleSaveUrl(c.env, merchant, coupon, pass);
	track(c.env, "pass_issued", {
		merchantId: coupon.merchant_id,
		couponId: coupon.id,
		platform: "google",
	});
	return c.redirect(url, 302);
});
