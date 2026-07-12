import { Hono } from "hono";
import type { Env } from "../env";
import { appleConfigured } from "../env";
import { getCoupon, getMerchantById, getPass } from "../db";
import { buildApplePass } from "../applePass";

/**
 * Apple Wallet Web Service protocol.
 * https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
 *
 * iOS calls these endpoints to register devices for updates, poll for
 * changed passes after an APNs push, and re-download the pass itself.
 */
export const appleWebService = new Hono<{ Bindings: Env }>();

/** D1's datetime('now') is "YYYY-MM-DD HH:MM:SS" (UTC); normalize to ISO before parsing. */
function d1ToDate(d1Timestamp: string): Date {
	return new Date(d1Timestamp.replace(" ", "T") + "Z");
}

async function authedPass(c: { env: Env; req: { param: (k: string) => string; header: (k: string) => string | undefined } }) {
	const serial = c.req.param("serialNumber");
	const auth = c.req.header("authorization") ?? "";
	const token = auth.startsWith("ApplePass ") ? auth.slice("ApplePass ".length) : null;
	if (!token) {
		return null;
	}
	const pass = await getPass(c.env, serial);
	if (!pass || pass.auth_token !== token) {
		return null;
	}
	return pass;
}

/** Register a device for push updates on a pass. */
appleWebService.post(
	"/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
	async (c) => {
		const pass = await authedPass(c);
		if (!pass) {
			return c.body(null, 401);
		}
		const { pushToken } = (await c.req.json().catch(() => ({}))) as { pushToken?: string };
		if (!pushToken) {
			return c.body(null, 400);
		}
		const deviceId = c.req.param("deviceLibraryIdentifier");
		const existing = await c.env.DB.prepare(
			"SELECT 1 FROM apple_registrations WHERE device_library_id = ? AND serial = ?",
		)
			.bind(deviceId, pass.serial)
			.first();
		await c.env.DB.batch([
			c.env.DB.prepare(
				`INSERT INTO apple_devices (device_library_id, push_token) VALUES (?, ?)
				 ON CONFLICT(device_library_id) DO UPDATE SET push_token = excluded.push_token`,
			).bind(deviceId, pushToken),
			c.env.DB.prepare(
				`INSERT OR IGNORE INTO apple_registrations (device_library_id, serial) VALUES (?, ?)`,
			).bind(deviceId, pass.serial),
		]);
		return c.body(null, existing ? 200 : 201);
	},
);

/** Unregister a device (pass removed from Wallet). */
appleWebService.delete(
	"/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
	async (c) => {
		const pass = await authedPass(c);
		if (!pass) {
			return c.body(null, 401);
		}
		const deviceId = c.req.param("deviceLibraryIdentifier");
		await c.env.DB.prepare(
			"DELETE FROM apple_registrations WHERE device_library_id = ? AND serial = ?",
		)
			.bind(deviceId, pass.serial)
			.run();
		return c.body(null, 200);
	},
);

/** Which of this device's passes changed since the given tag? */
appleWebService.get(
	"/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier",
	async (c) => {
		const deviceId = c.req.param("deviceLibraryIdentifier");
		const since = c.req.query("passesUpdatedSince");
		const { results } = await c.env.DB.prepare(
			`SELECT p.serial, p.updated_at FROM passes p
			 JOIN apple_registrations r ON r.serial = p.serial
			 WHERE r.device_library_id = ?${since ? " AND p.updated_at > ?" : ""}`,
		)
			.bind(...(since ? [deviceId, since] : [deviceId]))
			.all<{ serial: string; updated_at: string }>();
		if (!results.length) {
			return c.body(null, 204);
		}
		const lastUpdated = results.map((r) => r.updated_at).sort().at(-1)!;
		return c.json({
			serialNumbers: results.map((r) => r.serial),
			lastUpdated,
		});
	},
);

/** Serve the latest version of a pass. */
appleWebService.get("/v1/passes/:passTypeIdentifier/:serialNumber", async (c) => {
	if (!appleConfigured(c.env)) {
		return c.body(null, 503);
	}
	const pass = await authedPass(c);
	if (!pass) {
		return c.body(null, 401);
	}
	const modifiedSince = c.req.header("if-modified-since");
	if (modifiedSince && d1ToDate(pass.updated_at) <= new Date(modifiedSince)) {
		return c.body(null, 304);
	}
	const coupon = (await getCoupon(c.env, pass.coupon_id))!;
	const merchant = (await getMerchantById(c.env, coupon.merchant_id))!;
	const pkpass = buildApplePass(c.env, merchant, coupon, pass);
	return c.body(pkpass.getAsBuffer() as unknown as ArrayBuffer, 200, {
		"content-type": pkpass.mimeType,
		"last-modified": d1ToDate(pass.updated_at).toUTCString(),
	});
});

/** Device-side error logs from Wallet — invaluable while integrating. */
appleWebService.post("/v1/log", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as { logs?: string[] };
	for (const line of body.logs ?? []) {
		console.log("[wallet-device-log]", line);
	}
	return c.body(null, 200);
});
