import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, Merchant } from "./env";
import { getMerchantById } from "./db";

const SESSION_COOKIE = "tp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
const PBKDF2_ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
		key,
		256,
	);
	return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `${toHex(salt.buffer)}:${await pbkdf2(password, salt)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, expected] = stored.split(":");
	if (!saltHex || !expected) {
		return false;
	}
	const actual = await pbkdf2(password, fromHex(saltHex));
	// Constant-time comparison
	if (actual.length !== expected.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < actual.length; i++) {
		diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return diff === 0;
}

export async function createSession(c: Context<{ Bindings: Env }>, merchantId: string) {
	const token = crypto.randomUUID() + crypto.randomUUID();
	await c.env.SESSIONS.put(`session:${token}`, merchantId, {
		expirationTtl: SESSION_TTL_SECONDS,
	});
	setCookie(c, SESSION_COOKIE, token, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/",
		maxAge: SESSION_TTL_SECONDS,
	});
}

export async function destroySession(c: Context<{ Bindings: Env }>) {
	const token = getCookie(c, SESSION_COOKIE);
	if (token) {
		await c.env.SESSIONS.delete(`session:${token}`);
	}
	deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function currentMerchant(
	c: Context<{ Bindings: Env }>,
): Promise<Merchant | null> {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) {
		return null;
	}
	const merchantId = await c.env.SESSIONS.get(`session:${token}`);
	if (!merchantId) {
		return null;
	}
	return getMerchantById(c.env, merchantId);
}
