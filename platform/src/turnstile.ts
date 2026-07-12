import type { Context } from "hono";
import type { Env } from "./env";
import { turnstileConfigured } from "./env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Turnstile token from a submitted form. Returns true (allow)
 * when Turnstile isn't configured, so the app runs fully without it in
 * development. When configured, a missing or invalid token is rejected.
 */
export async function verifyTurnstile(
	c: Context<{ Bindings: Env }>,
	token: string | undefined,
): Promise<boolean> {
	if (!turnstileConfigured(c.env)) {
		return true;
	}
	if (!token) {
		return false;
	}
	const body = new FormData();
	body.append("secret", c.env.TURNSTILE_SECRET!);
	body.append("response", token);
	const ip = c.req.header("cf-connecting-ip");
	if (ip) {
		body.append("remoteip", ip);
	}
	try {
		const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
		const data = (await res.json()) as { success: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}

/** Widget markup for a form; empty string when Turnstile is disabled. */
export function turnstileWidget(env: Env): string {
	if (!turnstileConfigured(env)) {
		return "";
	}
	return `<div class="cf-turnstile" data-sitekey="${env.TURNSTILE_SITE_KEY}"></div>
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`;
}
