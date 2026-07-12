import type { ApnsPushMessage, Env } from "./env";
import { apnsConfigured } from "./env";

/** Device tokens per queue message (100-msg batch cap → ~5k-token bursts fit easily). */
const TOKENS_PER_MESSAGE = 50;

const APNS_HOST = "https://api.push.apple.com";
/** APNs provider tokens may be reused for up to an hour; refresh at 50 min. */
const TOKEN_TTL_SECONDS = 50 * 60;
const TOKEN_KV_KEY = "apns:provider-token";

function base64url(data: ArrayBuffer | Uint8Array): string {
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
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

async function createProviderToken(env: Env): Promise<string> {
	const key = await crypto.subtle.importKey(
		"pkcs8",
		pemToDer(env.APNS_KEY!) as BufferSource,
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"],
	);
	const header = base64url(
		new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: env.APNS_KEY_ID })),
	);
	const payload = base64url(
		new TextEncoder().encode(
			JSON.stringify({ iss: env.APPLE_TEAM_ID, iat: Math.floor(Date.now() / 1000) }),
		),
	);
	const signature = await crypto.subtle.sign(
		{ name: "ECDSA", hash: "SHA-256" },
		key,
		new TextEncoder().encode(`${header}.${payload}`),
	);
	return `${header}.${payload}.${base64url(signature)}`;
}

async function getProviderToken(env: Env): Promise<string> {
	const cached = await env.SESSIONS.get(TOKEN_KV_KEY);
	if (cached) {
		return cached;
	}
	const token = await createProviderToken(env);
	await env.SESSIONS.put(TOKEN_KV_KEY, token, { expirationTtl: TOKEN_TTL_SECONDS });
	return token;
}

export interface PushResult {
	sent: number;
	failed: number;
	goneTokens: string[];
}

/**
 * Notifies every registered device holding a pass for this coupon.
 * Wallet pass pushes carry an empty payload — the device responds by
 * calling our web service to fetch changed serials, then re-fetches passes.
 */
export async function pushPassUpdates(env: Env, pushTokens: string[]): Promise<PushResult> {
	const result: PushResult = { sent: 0, failed: 0, goneTokens: [] };
	if (!apnsConfigured(env) || pushTokens.length === 0) {
		return result;
	}

	const providerToken = await getProviderToken(env);
	const BATCH = 25;

	for (let i = 0; i < pushTokens.length; i += BATCH) {
		const batch = pushTokens.slice(i, i + BATCH);
		const settled = await Promise.allSettled(
			batch.map(async (token) => {
				const res = await fetch(`${APNS_HOST}/3/device/${token}`, {
					method: "POST",
					headers: {
						authorization: `bearer ${providerToken}`,
						"apns-topic": env.APPLE_PASS_TYPE_ID,
						// Wallet update pushes carry an empty payload. Confirm this
						// header value against a real device during the R2 smoke test.
						"apns-push-type": "background",
						"apns-priority": "5",
					},
					body: "{}",
				});
				if (res.status === 410) {
					result.goneTokens.push(token);
				} else if (!res.ok) {
					throw new Error(`APNs ${res.status}`);
				}
			}),
		);
		for (const s of settled) {
			if (s.status === "fulfilled") {
				result.sent++;
			} else {
				result.failed++;
			}
		}
	}

	// Prune devices Apple reports as gone so future fan-outs shrink.
	for (const token of result.goneTokens) {
		await env.DB.prepare("DELETE FROM apple_devices WHERE push_token = ?").bind(token).run();
	}

	return result;
}

/**
 * Durable fan-out entry point used by request handlers. Splits tokens into
 * ~50-token messages on the APNs queue so bursts of thousands are delivered
 * with retries and a dead-letter queue instead of racing the 30s request
 * budget. Falls back to an inline send when no queue is bound (local dev
 * without the Queues simulator, or a plan without Queues).
 */
export async function enqueuePushUpdates(
	env: Env,
	tokens: string[],
	meta: Omit<ApnsPushMessage, "tokens">,
): Promise<void> {
	const unique = [...new Set(tokens)].filter(Boolean);
	if (unique.length === 0) {
		return;
	}
	if (!env.APNS_QUEUE) {
		await pushPassUpdates(env, unique);
		return;
	}
	const messages: MessageSendRequest<ApnsPushMessage>[] = [];
	for (let i = 0; i < unique.length; i += TOKENS_PER_MESSAGE) {
		messages.push({ body: { ...meta, tokens: unique.slice(i, i + TOKENS_PER_MESSAGE) } });
	}
	await env.APNS_QUEUE.sendBatch(messages);
}

/** Queue consumer: send one batch of pushes. Throwing triggers Queues' retry. */
export async function consumeApnsBatch(
	env: Env,
	batch: MessageBatch<ApnsPushMessage>,
): Promise<void> {
	for (const msg of batch.messages) {
		try {
			const result = await pushPassUpdates(env, msg.body.tokens);
			if (result.failed > 0) {
				msg.retry();
			} else {
				msg.ack();
			}
		} catch (err) {
			console.error("APNs batch failed", msg.body.reason, err);
			msg.retry();
		}
	}
}
