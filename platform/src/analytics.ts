import type { Env } from "./env";

export type EventName = "claim" | "pass_issued" | "registered" | "push_sent" | "redeemed";

/**
 * Fire-and-forget usage metric. Indexed by merchant so per-merchant
 * dashboards can query the SQL API later; blobs carry the dimensions.
 * A no-op when the Analytics Engine binding is absent (local dev).
 */
export function track(
	env: Env,
	event: EventName,
	dims: { merchantId?: string; couponId?: string; platform?: string; count?: number } = {},
): void {
	if (!env.ANALYTICS) {
		return;
	}
	try {
		env.ANALYTICS.writeDataPoint({
			indexes: [dims.merchantId ?? "unknown"],
			blobs: [event, dims.couponId ?? "", dims.platform ?? ""],
			doubles: [dims.count ?? 1],
		});
	} catch {
		// Metrics must never break a request.
	}
}
