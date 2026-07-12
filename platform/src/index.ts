import { Hono } from "hono";
import type { ApnsPushMessage, Env } from "./env";
import { publicRoutes } from "./routes/public";
import { dashboardRoutes } from "./routes/dashboard";
import { appleWebService } from "./routes/appleWebService";
import { redeemRoutes } from "./routes/redeem";
import { consumeApnsBatch } from "./apns";
import { checkCertExpiry, sweepExpiredCoupons } from "./cron";

const app = new Hono<{ Bindings: Env }>();

app.route("/", publicRoutes);
app.route("/", dashboardRoutes);
app.route("/", appleWebService);
app.route("/", redeemRoutes);

app.notFound((c) => c.text("Not found", 404));
app.onError((err, c) => {
	console.error(err);
	return c.text("Something went wrong on our side. Please try again.", 500);
});

export default {
	fetch: app.fetch,

	/** APNs push fan-out consumer (see apns.ts / wrangler.toml queues). */
	async queue(batch: MessageBatch<ApnsPushMessage>, env: Env): Promise<void> {
		await consumeApnsBatch(env, batch);
	},

	/** Cron Triggers: 03:00 UTC expiry sweep, Mon 09:00 UTC cert reminder. */
	async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		if (event.cron === "0 9 * * 1") {
			ctx.waitUntil(checkCertExpiry(env));
		} else {
			ctx.waitUntil(
				sweepExpiredCoupons(env).then((n) => {
					if (n > 0) {
						console.log(`[cron] archived ${n} expired coupon(s)`);
					}
				}),
			);
		}
	},
};
