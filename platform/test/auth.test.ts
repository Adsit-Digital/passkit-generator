import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth";

describe("password hashing", () => {
	it("round-trips a correct password", async () => {
		const stored = await hashPassword("pilotpass1");
		expect(await verifyPassword("pilotpass1", stored)).toBe(true);
	});

	it("rejects a wrong password", async () => {
		const stored = await hashPassword("pilotpass1");
		expect(await verifyPassword("wrongpass", stored)).toBe(false);
	});

	it("produces a unique salt per hash", async () => {
		const a = await hashPassword("samepass");
		const b = await hashPassword("samepass");
		expect(a).not.toBe(b);
		// but both still verify
		expect(await verifyPassword("samepass", a)).toBe(true);
		expect(await verifyPassword("samepass", b)).toBe(true);
	});

	it("rejects a tampered hash", async () => {
		const stored = await hashPassword("pilotpass1");
		const [salt, hash] = stored.split(":");
		const flipped = hash[0] === "0" ? "1" : "0";
		const tampered = `${salt}:${flipped}${hash.slice(1)}`;
		expect(await verifyPassword("pilotpass1", tampered)).toBe(false);
	});

	it("rejects a malformed stored value without throwing", async () => {
		expect(await verifyPassword("x", "not-a-valid-format")).toBe(false);
		expect(await verifyPassword("x", "")).toBe(false);
	});
});
