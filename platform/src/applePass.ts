import { PKPass } from "passkit-generator";
import { Buffer } from "node:buffer";
import type { Coupon, Env, PassRow } from "./env";
import type { Merchant } from "./env";
import { BRAND } from "./brand";

import icon from "../assets/icon.png";
import icon2x from "../assets/icon@2x.png";
import icon3x from "../assets/icon@3x.png";
import logo from "../assets/logo.png";
import logo2x from "../assets/logo@2x.png";

/**
 * Builds and signs the .pkpass for a claimed coupon.
 * The barcode encodes the staff-facing redemption URL, so any phone
 * camera at the counter resolves the pass to its live redemption state.
 */
export function buildApplePass(
	env: Env,
	merchant: Merchant,
	coupon: Coupon,
	pass: PassRow,
): PKPass {
	const redeemUrl = `${env.BASE_URL}/r/${pass.serial}`;

	const pkpass = new PKPass(
		{
			"icon.png": Buffer.from(icon),
			"icon@2x.png": Buffer.from(icon2x),
			"icon@3x.png": Buffer.from(icon3x),
			"logo.png": Buffer.from(logo),
			"logo@2x.png": Buffer.from(logo2x),
		},
		{
			signerCert: env.SIGNER_CERT!,
			signerKey: env.SIGNER_KEY!,
			signerKeyPassphrase: env.SIGNER_PASSPHRASE || undefined,
			wwdr: env.WWDR!,
		},
		{
			description: `${merchant.name} — ${coupon.title}`,
			serialNumber: pass.serial,
			passTypeIdentifier: env.APPLE_PASS_TYPE_ID,
			teamIdentifier: env.APPLE_TEAM_ID,
			organizationName: merchant.name || BRAND.organization,
			logoText: merchant.name,
			backgroundColor: coupon.background_color,
			foregroundColor: coupon.foreground_color,
			labelColor: coupon.label_color,
			webServiceURL: env.BASE_URL,
			authenticationToken: pass.auth_token,
			voided: Boolean(pass.redeemed_at) || coupon.status !== "active",
			sharingProhibited: true,
		},
	);

	pkpass.type = "coupon";

	pkpass.setBarcodes({
		message: redeemUrl,
		format: "PKBarcodeFormatQR",
		messageEncoding: "iso-8859-1",
		altText: pass.serial.slice(0, 8).toUpperCase(),
	});

	if (coupon.expires_at) {
		const expires = new Date(coupon.expires_at);
		if (!Number.isNaN(expires.getTime())) {
			pkpass.setExpirationDate(expires);
		}
	}

	pkpass.primaryFields.push({
		key: "offer",
		label: coupon.title,
		value: coupon.offer,
	});

	if (coupon.description) {
		pkpass.secondaryFields.push({
			key: "details",
			label: "Details",
			value: coupon.description,
		});
	}

	if (coupon.expires_at) {
		pkpass.auxiliaryFields.push({
			key: "expires",
			label: "Valid through",
			value: coupon.expires_at.slice(0, 10),
			textAlignment: "PKTextAlignmentRight",
		});
	}

	pkpass.backFields.push(
		{
			key: "how",
			label: "How to redeem",
			value: "Show this pass at the counter. Staff scan the code above — one redemption per pass.",
		},
		...(coupon.terms
			? [{ key: "terms", label: "Terms", value: coupon.terms }]
			: []),
		{
			key: "about",
			label: "About this pass",
			value: `Offers from ${merchant.name} update automatically — no email or phone number required. Powered by ${BRAND.name}.`,
		},
	);

	return pkpass;
}
