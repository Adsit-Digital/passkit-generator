import { BRAND } from "./brand";
import type { Coupon, Merchant } from "./env";

export function esc(value: string | null | undefined): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function layout(title: string, body: string, opts?: { merchant?: Merchant | null }): string {
	const c = BRAND.color;
	const nav = opts?.merchant
		? `<nav>
				<a class="brand" href="/dashboard">${esc(BRAND.name)}</a>
				<span class="nav-right">
					<span class="muted">${esc(opts.merchant.name)}</span>
					<form method="post" action="/logout" class="inline"><button class="link">Sign out</button></form>
				</span>
			</nav>`
		: `<nav>
				<a class="brand" href="/">${esc(BRAND.name)}</a>
				<span class="nav-right"><a href="/login">Sign in</a></span>
			</nav>`;

	const d = BRAND.dark;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<title>${esc(title)} · ${esc(BRAND.name)}</title>
<style>
	:root {
		--primary: ${c.primary}; --primary-ink: ${c.primaryInk};
		--ink: ${c.ink}; --ink-soft: ${c.inkSoft};
		--paper: ${c.paper}; --card: ${c.card}; --line: ${c.line};
		--success: ${c.success}; --danger: ${c.danger};
	}
	@media (prefers-color-scheme: dark) {
		:root {
			--primary: ${d.primary}; --primary-ink: ${d.paper};
			--ink: ${d.ink}; --ink-soft: ${d.inkSoft};
			--paper: ${d.paper}; --card: ${d.card}; --line: ${d.line};
			--success: ${d.success}; --danger: ${d.danger};
		}
	}
	* { box-sizing: border-box; }
	body { margin: 0; background: var(--paper); color: var(--ink);
		font: 16px/1.5 ${BRAND.fonts.body}; }
	h1, .brand, .hero h1 { font-family: ${BRAND.fonts.display}; }
	.stat b, td.n { font-family: ${BRAND.fonts.data}; }
	main { max-width: 44rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
	nav { display: flex; justify-content: space-between; align-items: center; gap: 1rem;
		padding: 0.9rem 1rem; border-bottom: 1px solid var(--line); }
	nav .brand { font-weight: 750; letter-spacing: -0.01em; color: var(--ink); text-decoration: none; font-size: 1.1rem; }
	nav a { color: var(--ink); }
	.nav-right { display: flex; align-items: center; gap: 0.9rem; }
	h1 { font-size: 1.6rem; letter-spacing: -0.015em; line-height: 1.2; margin: 1.2rem 0 0.6rem; }
	h2 { font-size: 1.15rem; margin: 1.8rem 0 0.6rem; }
	p { margin: 0 0 0.9rem; }
	a { color: var(--primary); }
	.muted { color: var(--ink-soft); font-size: 0.9rem; }
	.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 1.1rem 1.2rem; margin: 0.9rem 0; }
	.row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
	.grow { flex: 1; }
	button, .btn { display: inline-block; background: var(--primary); color: var(--primary-ink);
		border: none; border-radius: 8px; padding: 0.6rem 1.1rem; font-size: 1rem; font-weight: 600;
		cursor: pointer; text-decoration: none; text-align: center; }
	button.secondary, .btn.secondary { background: transparent; color: var(--ink); border: 1px solid var(--line); }
	button.link { background: none; border: none; color: var(--primary); padding: 0; font-size: 0.9rem; cursor: pointer; }
	form.inline { display: inline; }
	label { display: block; font-weight: 600; font-size: 0.88rem; margin: 0.9rem 0 0.25rem; }
	input, textarea, select { width: 100%; padding: 0.55rem 0.7rem; font-size: 1rem; color: var(--ink);
		background: var(--paper); border: 1px solid var(--line); border-radius: 8px; }
	input[type="color"] { width: 3.2rem; height: 2.4rem; padding: 0.15rem; }
	textarea { min-height: 5.5rem; resize: vertical; }
	.stat { text-align: center; padding: 0.4rem 1rem; }
	.stat b { display: block; font-size: 1.5rem; font-variant-numeric: tabular-nums; }
	.pill { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em;
		padding: 0.12rem 0.6rem; border-radius: 999px; text-transform: uppercase; }
	.pill.active { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); }
	.pill.archived { background: color-mix(in srgb, var(--ink-soft) 16%, transparent); color: var(--ink-soft); }
	.pill.redeemed { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); }
	.qr { max-width: 260px; margin: 0.5rem auto; }
	.qr svg { width: 100%; height: auto; display: block; }
	.error { color: var(--danger); font-weight: 600; }
	.notice { color: var(--success); font-weight: 600; }
	.wallet-buttons { display: flex; flex-direction: column; gap: 0.7rem; margin: 1.2rem 0; }
	.wallet-buttons .btn { padding: 0.85rem 1.1rem; font-size: 1.05rem; }
	.apple-btn { background: #000; color: #fff; }
	.google-btn { background: #fff; color: #1f1f1f; border: 1px solid #dadce0; }
	.hero { text-align: center; padding: 2.5rem 0 1rem; }
	.hero h1 { font-size: 2.1rem; }
	table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
	th, td { text-align: left; padding: 0.55rem 0.6rem; border-bottom: 1px solid var(--line); }
	th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-soft); }
	td.n { font-variant-numeric: tabular-nums; }
	footer { text-align: center; color: var(--ink-soft); font-size: 0.85rem; padding: 2rem 1rem; }
</style>
</head>
<body>
${nav}
<main>
${body}
</main>
<footer>${esc(BRAND.name)} — ${esc(BRAND.tagline)}</footer>
</body>
</html>`;
}

export function landingPage(): string {
	return layout(
		"Wallet coupons for restaurants",
		`<div class="hero">
			<h1>Turn one scan into a regular.</h1>
			<p class="muted">${esc(BRAND.name)} puts your coupon in your diners' Apple or Google Wallet — no app for them to install, no email for you to collect — and lets you change the offer in 60 seconds.</p>
			<p><a class="btn" href="/signup">Create your first coupon — free</a> &nbsp; <a class="btn secondary" href="/login">Sign in</a></p>
		</div>
		<div class="card"><b>No app. No email. No friction.</b><p class="muted">Diners scan a QR on the table, tap once, and your offer is in their wallet — that's the whole flow. You never ask for their email or number, and they never forget where the coupon went.</p></div>
		<div class="card"><b>Live on their lock screen.</b><p class="muted">A pass in the wallet isn't a flyer in the trash — it's on the phone they check 100 times a day. Change your offer and every pass updates itself, so Tuesday's special is never advertising last Tuesday.</p></div>
		<div class="card"><b>Sixty seconds, twenty-nine dollars.</b><p class="muted">Write the offer, pick the color, print the QR — you're live before the lunch rush. From $29 a month per location, self-serve, no POS contract and no sales call required.</p></div>`,
	);
}

export function authPage(
	kind: "signup" | "login",
	error?: string,
	widgetHtml = "",
): string {
	const isSignup = kind === "signup";
	return layout(
		isSignup ? "Create your account" : "Sign in",
		`<h1>${isSignup ? "Create your account" : "Sign in"}</h1>
		${error ? `<p class="error">${esc(error)}</p>` : ""}
		<form method="post" action="/${kind}" class="card">
			${isSignup ? `<label for="name">Restaurant name</label><input id="name" name="name" required maxlength="80" placeholder="e.g. Harbor & Vine">` : ""}
			<label for="email">Email</label>
			<input id="email" name="email" type="email" required autocomplete="email">
			<label for="password">Password</label>
			<input id="password" name="password" type="password" required minlength="8" autocomplete="${isSignup ? "new-password" : "current-password"}">
			${isSignup ? `<div style="margin-top:1rem">${widgetHtml}</div>` : ""}
			<p style="margin-top:1.1rem"><button>${isSignup ? "Create account" : "Sign in"}</button></p>
		</form>
		<p class="muted">${
			isSignup
				? `Already have an account? <a href="/login">Sign in</a>`
				: `New here? <a href="/signup">Create an account</a>`
		}</p>`,
	);
}

export function dashboardPage(
	merchant: Merchant,
	coupons: Array<Coupon & { pass_count: number; redemption_count: number }>,
	notice?: string,
): string {
	const rows = coupons
		.map(
			(c) => `<tr>
				<td><a href="/dashboard/coupons/${esc(c.id)}">${esc(c.title)}</a><br><span class="muted">${esc(c.offer)}</span></td>
				<td><span class="pill ${c.status === "active" ? "active" : "archived"}">${esc(c.status)}</span></td>
				<td class="n">${c.pass_count}</td>
				<td class="n">${c.redemption_count}</td>
			</tr>`,
		)
		.join("");
	return layout(
		"Dashboard",
		`<h1>Your coupons</h1>
		${notice ? `<p class="notice">${esc(notice)}</p>` : ""}
		<p><a class="btn" href="/dashboard/coupons/new">Create a coupon</a></p>
		${
			coupons.length
				? `<div class="card"><table>
						<tr><th>Coupon</th><th>Status</th><th>In wallets</th><th>Redeemed</th></tr>
						${rows}
					</table></div>`
				: `<div class="card"><p><b>No coupons yet.</b></p><p class="muted">Your first one takes about a minute. Put the QR where people wait — table tents and receipts work best.</p></div>`
		}`,
		{ merchant },
	);
}

export interface CouponFormValues {
	title: string;
	offer: string;
	description: string;
	terms: string;
	background_color: string;
	expires_at: string;
	status: string;
}

export function couponFormPage(
	merchant: Merchant,
	opts: { action: string; heading: string; values?: Partial<CouponFormValues>; isEdit?: boolean; error?: string },
): string {
	const v = opts.values ?? {};
	const bgHex = rgbStringToHex(v.background_color ?? "") || "#c53d20";
	return layout(
		opts.heading,
		`<h1>${esc(opts.heading)}</h1>
		${opts.error ? `<p class="error">${esc(opts.error)}</p>` : ""}
		<form method="post" action="${esc(opts.action)}" class="card">
			<label for="title">Coupon name</label>
			<input id="title" name="title" required maxlength="60" value="${esc(v.title ?? "")}" placeholder="e.g. Weekday lunch deal">
			<label for="offer">The offer (big text on the pass)</label>
			<input id="offer" name="offer" required maxlength="40" value="${esc(v.offer ?? "")}" placeholder="e.g. 20% off entrées">
			<label for="description">Details</label>
			<textarea id="description" name="description" maxlength="300" placeholder="Mon–Fri 11am–2pm, dine-in only.">${esc(v.description ?? "")}</textarea>
			<label for="terms">Terms (shown on the back of the pass)</label>
			<textarea id="terms" name="terms" maxlength="500">${esc(v.terms ?? "")}</textarea>
			<div class="row">
				<div>
					<label for="background_color">Pass color</label>
					<input id="background_color" name="background_color" type="color" value="${esc(bgHex)}">
				</div>
				<div class="grow">
					<label for="expires_at">Expires (optional)</label>
					<input id="expires_at" name="expires_at" type="date" value="${esc((v.expires_at ?? "").slice(0, 10))}">
				</div>
				${
					opts.isEdit
						? `<div>
								<label for="status">Status</label>
								<select id="status" name="status">
									<option value="active" ${v.status !== "archived" ? "selected" : ""}>Active</option>
									<option value="archived" ${v.status === "archived" ? "selected" : ""}>Archived (voids passes)</option>
								</select>
							</div>`
						: ""
				}
			</div>
			<p style="margin-top:1.2rem"><button>${opts.isEdit ? "Update the offer" : "Create a coupon"}</button>
			&nbsp;<a class="btn secondary" href="/dashboard">Cancel</a></p>
			${opts.isEdit ? `<p class="muted">Saving pushes the update to every phone that holds this pass.</p>` : ""}
		</form>`,
		{ merchant },
	);
}

export function couponDetailPage(
	merchant: Merchant,
	coupon: Coupon,
	stats: { passes: number; redemptions: number },
	claimUrl: string,
	claimQrSvg: string,
	notice?: string,
): string {
	return layout(
		coupon.title,
		`<h1>${esc(coupon.title)}</h1>
		<p><span class="pill ${coupon.status === "active" ? "active" : "archived"}">${esc(coupon.status)}</span>
		&nbsp;<span class="muted">${esc(coupon.offer)}${coupon.expires_at ? ` · expires ${esc(coupon.expires_at.slice(0, 10))}` : ""}</span></p>
		${notice ? `<p class="notice">${esc(notice)}</p>` : ""}
		<div class="card"><div class="row">
			<div class="stat grow"><b>${stats.passes}</b><span class="muted">in wallets</span></div>
			<div class="stat grow"><b>${stats.redemptions}</b><span class="muted">redeemed</span></div>
		</div></div>
		<div class="card">
			<h2 style="margin-top:0">Share this coupon</h2>
			<p class="muted">Print this QR on table tents, receipts, or your window. Guests scan it to add the coupon to their wallet.</p>
			<div class="qr">${claimQrSvg}</div>
			<p style="text-align:center"><a href="${esc(claimUrl)}">${esc(claimUrl)}</a></p>
		</div>
		<div class="row">
			<a class="btn" href="/dashboard/coupons/${esc(coupon.id)}/edit">Edit coupon</a>
			<form method="post" action="/dashboard/coupons/${esc(coupon.id)}/push" class="inline">
				<button class="secondary" title="Re-send the lock screen update to all wallets">Push update to wallets</button>
			</form>
			<a class="btn secondary" href="/dashboard">Back</a>
		</div>`,
		{ merchant },
	);
}

export function claimPage(
	merchantName: string,
	coupon: Coupon,
	appleUrl: string | null,
	googleUrl: string | null,
): string {
	return layout(
		`${coupon.offer} at ${merchantName}`,
		`<div class="hero">
			<h1>${esc(coupon.offer)}, from ${esc(merchantName)}.</h1>
			<p>Add it to your wallet and it's yours. No app, no email, no signup.</p>
			<p class="muted">${esc(coupon.title)}${coupon.description ? ` — ${esc(coupon.description)}` : ""}${coupon.expires_at ? ` · valid through ${esc(coupon.expires_at.slice(0, 10))}` : ""}</p>
		</div>
		<div class="wallet-buttons">
			${
				appleUrl
					? `<a class="btn apple-btn" href="${esc(appleUrl)}"> Add to Apple Wallet</a>`
					: `<span class="btn apple-btn" style="opacity:.5" title="Apple Wallet not configured yet"> Add to Apple Wallet</span>`
			}
			${
				googleUrl
					? `<a class="btn google-btn" href="${esc(googleUrl)}">Save to Google Wallet</a>`
					: `<span class="btn google-btn" style="opacity:.5" title="Google Wallet not configured yet">Save to Google Wallet</span>`
			}
		</div>
		<p class="muted" style="text-align:center">${esc(merchantName)} never sees your name, email, or number. The coupon just lives on your phone — and we'll keep it up to date.</p>`,
	);
}

export function redeemPage(opts: {
	merchantName: string;
	coupon: Coupon;
	serial: string;
	redeemedAt: string | null;
	canRedeem: boolean;
	message?: string;
}): string {
	const { coupon } = opts;
	const state = opts.redeemedAt
		? `<p><span class="pill redeemed">Already redeemed</span></p><p class="muted">Redeemed at ${esc(opts.redeemedAt)} UTC.</p>`
		: coupon.status !== "active"
			? `<p><span class="pill archived">No longer active</span></p>`
			: `<p><span class="pill active">Valid</span></p>`;
	return layout(
		"Redeem pass",
		`<h1>${esc(coupon.offer)}</h1>
		<p class="muted">${esc(coupon.title)} · ${esc(opts.merchantName)} · pass ${esc(opts.serial.slice(0, 8).toUpperCase())}</p>
		${state}
		${opts.message ? `<p class="notice">${esc(opts.message)}</p>` : ""}
		${
			opts.canRedeem && !opts.redeemedAt && coupon.status === "active"
				? `<form method="post" action="/r/${esc(opts.serial)}/redeem"><button>Mark as redeemed</button></form>`
				: !opts.canRedeem
					? `<p class="muted">Staff: <a href="/login">sign in</a> on this device to mark passes redeemed.</p>`
					: ""
		}`,
	);
}

export function rgbStringToHex(rgb: string): string | null {
	const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (!m) {
		return null;
	}
	return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

export function hexToRgbString(hex: string): string | null {
	const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
	if (!m) {
		return null;
	}
	const n = parseInt(m[1], 16);
	return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
