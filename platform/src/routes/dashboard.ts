import { Hono } from "hono";
import type { Env } from "../env";
import {
	createCoupon,
	createMerchant,
	getCoupon,
	getMerchantByEmail,
	getPushTokensForCoupon,
	listCoupons,
	updateCoupon,
	type CouponInput,
} from "../db";
import { createSession, currentMerchant, destroySession, hashPassword, verifyPassword } from "../auth";
import { enqueuePushUpdates } from "../apns";
import { updateGoogleOfferClass } from "../googleWallet";
import { turnstileWidget, verifyTurnstile } from "../turnstile";
import { track } from "../analytics";
import { BRAND } from "../brand";
import {
	authPage,
	couponDetailPage,
	couponFormPage,
	dashboardPage,
	hexToRgbString,
} from "../ui";
import { qrSvg } from "../qr";

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

// ---------- auth ----------

dashboardRoutes.get("/signup", (c) =>
	c.html(authPage("signup", undefined, turnstileWidget(c.env))),
);
dashboardRoutes.get("/login", (c) => c.html(authPage("login")));

dashboardRoutes.post("/signup", async (c) => {
	const form = await c.req.parseBody();
	const widget = turnstileWidget(c.env);
	if (!(await verifyTurnstile(c, form["cf-turnstile-response"] as string | undefined))) {
		return c.html(
			authPage("signup", "Couldn't verify you're human. Please try again.", widget),
			400,
		);
	}
	const name = String(form.name ?? "").trim();
	const email = String(form.email ?? "").trim();
	const password = String(form.password ?? "");
	if (!name || !email.includes("@") || password.length < 8) {
		return c.html(
			authPage("signup", "Please fill every field (password: 8+ characters).", widget),
			400,
		);
	}
	if (await getMerchantByEmail(c.env, email)) {
		return c.html(authPage("signup", "An account with that email already exists.", widget), 400);
	}
	const merchant = await createMerchant(c.env, {
		name,
		email,
		passwordHash: await hashPassword(password),
	});
	await createSession(c, merchant.id);
	return c.redirect("/dashboard");
});

dashboardRoutes.post("/login", async (c) => {
	const form = await c.req.parseBody();
	const email = String(form.email ?? "").toLowerCase();
	// Throttle both a single IP hammering many accounts (credential stuffing)
	// and many IPs targeting one account, by limiting on each key independently.
	if (c.env.LOGIN_LIMITER) {
		const ip = c.req.header("cf-connecting-ip") ?? "anon";
		const [byIp, byAccount] = await Promise.all([
			c.env.LOGIN_LIMITER.limit({ key: `ip:${ip}` }),
			c.env.LOGIN_LIMITER.limit({ key: `email:${email}` }),
		]);
		if (!byIp.success || !byAccount.success) {
			return c.html(authPage("login", "Too many attempts. Wait a minute and try again."), 429);
		}
	}
	const merchant = await getMerchantByEmail(c.env, email);
	if (!merchant || !(await verifyPassword(String(form.password ?? ""), merchant.password_hash))) {
		return c.html(authPage("login", "Email or password didn't match."), 401);
	}
	await createSession(c, merchant.id);
	return c.redirect("/dashboard");
});

dashboardRoutes.post("/logout", async (c) => {
	await destroySession(c);
	return c.redirect("/");
});

// ---------- coupons ----------

function parseCouponForm(form: Record<string, unknown>): CouponInput | null {
	const title = String(form.title ?? "").trim();
	const offer = String(form.offer ?? "").trim();
	if (!title || !offer) {
		return null;
	}
	const bg = hexToRgbString(String(form.background_color ?? "")) ?? BRAND.pass.backgroundColor;
	const expiresRaw = String(form.expires_at ?? "").trim();
	return {
		title,
		offer,
		description: String(form.description ?? "").trim(),
		terms: String(form.terms ?? "").trim(),
		background_color: bg,
		foreground_color: BRAND.pass.foregroundColor,
		label_color: BRAND.pass.labelColor,
		expires_at: expiresRaw ? `${expiresRaw}T23:59:59` : null,
	};
}

dashboardRoutes.get("/dashboard", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	const coupons = await listCoupons(c.env, merchant.id);
	return c.html(dashboardPage(merchant, coupons, c.req.query("notice")));
});

dashboardRoutes.get("/dashboard/coupons/new", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	return c.html(
		couponFormPage(merchant, { action: "/dashboard/coupons/new", heading: "New coupon" }),
	);
});

dashboardRoutes.post("/dashboard/coupons/new", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	const input = parseCouponForm(await c.req.parseBody());
	if (!input) {
		return c.html(
			couponFormPage(merchant, {
				action: "/dashboard/coupons/new",
				heading: "New coupon",
				error: "Coupon name and offer are required.",
			}),
			400,
		);
	}
	const id = await createCoupon(c.env, merchant.id, input);
	return c.redirect(`/dashboard/coupons/${id}`);
});

dashboardRoutes.get("/dashboard/coupons/:id", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	const coupon = await getCoupon(c.env, c.req.param("id"));
	if (!coupon || coupon.merchant_id !== merchant.id) {
		return c.notFound();
	}
	const stats = await c.env.DB.prepare(
		`SELECT
			(SELECT COUNT(*) FROM passes WHERE coupon_id = ?1) AS passes,
			(SELECT COUNT(*) FROM redemptions WHERE coupon_id = ?1) AS redemptions`,
	)
		.bind(coupon.id)
		.first<{ passes: number; redemptions: number }>();
	const claimUrl = `${c.env.BASE_URL}/c/${merchant.slug}/${coupon.slug}`;
	return c.html(
		couponDetailPage(
			merchant,
			coupon,
			stats ?? { passes: 0, redemptions: 0 },
			claimUrl,
			qrSvg(claimUrl),
			c.req.query("notice"),
		),
	);
});

dashboardRoutes.get("/dashboard/coupons/:id/edit", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	const coupon = await getCoupon(c.env, c.req.param("id"));
	if (!coupon || coupon.merchant_id !== merchant.id) {
		return c.notFound();
	}
	return c.html(
		couponFormPage(merchant, {
			action: `/dashboard/coupons/${coupon.id}/edit`,
			heading: `Edit: ${coupon.title}`,
			values: { ...coupon, expires_at: coupon.expires_at ?? "" },
			isEdit: true,
		}),
	);
});

dashboardRoutes.post("/dashboard/coupons/:id/edit", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	const coupon = await getCoupon(c.env, c.req.param("id"));
	if (!coupon || coupon.merchant_id !== merchant.id) {
		return c.notFound();
	}
	const form = await c.req.parseBody();
	const input = parseCouponForm(form);
	if (!input) {
		return c.html(
			couponFormPage(merchant, {
				action: `/dashboard/coupons/${coupon.id}/edit`,
				heading: `Edit: ${coupon.title}`,
				values: { ...coupon, expires_at: coupon.expires_at ?? "" },
				isEdit: true,
				error: "Coupon name and offer are required.",
			}),
			400,
		);
	}
	const status = String(form.status ?? "active") === "archived" ? "archived" : "active";
	await updateCoupon(c.env, coupon.id, input, status);

	// Fan out wallet updates without blocking the response.
	const updated = (await getCoupon(c.env, coupon.id))!;
	c.executionCtx.waitUntil(
		(async () => {
			const tokens = await getPushTokensForCoupon(c.env, coupon.id);
			await enqueuePushUpdates(c.env, tokens, { reason: "coupon_update", couponId: coupon.id });
			await updateGoogleOfferClass(c.env, merchant, updated);
			track(c.env, "push_sent", {
				merchantId: merchant.id,
				couponId: coupon.id,
				count: tokens.length,
			});
		})(),
	);
	return c.redirect(
		`/dashboard/coupons/${coupon.id}?notice=${encodeURIComponent("Saved. Wallet updates are on their way.")}`,
	);
});

dashboardRoutes.post("/dashboard/coupons/:id/push", async (c) => {
	const merchant = await currentMerchant(c);
	if (!merchant) {
		return c.redirect("/login");
	}
	const coupon = await getCoupon(c.env, c.req.param("id"));
	if (!coupon || coupon.merchant_id !== merchant.id) {
		return c.notFound();
	}
	const tokens = await getPushTokensForCoupon(c.env, coupon.id);
	await enqueuePushUpdates(c.env, tokens, { reason: "coupon_update", couponId: coupon.id });
	track(c.env, "push_sent", { merchantId: merchant.id, couponId: coupon.id, count: tokens.length });
	return c.redirect(
		`/dashboard/coupons/${coupon.id}?notice=${encodeURIComponent(
			tokens.length
				? `Update queued for ${tokens.length} device${tokens.length === 1 ? "" : "s"}.`
				: "No wallets hold this coupon yet.",
		)}`,
	);
});
