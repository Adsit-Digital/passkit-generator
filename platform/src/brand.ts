/**
 * Central brand tokens, implementing docs/BRAND.md (Brand Book v1.1, Dinnertide).
 * Change values here and the whole app (UI + default pass design) follows.
 */
export const BRAND = {
	/** Product name shown in UI, passes and page titles. */
	name: "Dinnertide",
	tagline: "Your offer, on their lock screen.",
	/** Legal/organization name used on Apple passes. */
	organization: "Adsit Digital",

	// Web UI palette — light theme (dark handled in ui.ts CSS)
	color: {
		primary: "#7D2A3A", // merlot
		primaryInk: "#FAF5EC", // cream
		accent: "#A8541F", // copper
		ink: "#241E19",
		inkSoft: "#6E6259", // oat
		paper: "#FAF5EC", // cream
		card: "#FFFFFF",
		line: "#E4DACB",
		success: "#3E7A4C", // herb
		warning: "#96610D", // honey
		danger: "#8C2F23",
	},
	dark: {
		primary: "#E08D9B",
		accent: "#E29B6A",
		ink: "#F2E9DD",
		inkSoft: "#A99C8F",
		paper: "#1B1512", // char
		card: "#262019",
		line: "#3A3128",
		success: "#86C29A",
		warning: "#E4B45A",
		danger: "#E58C80",
	},

	fonts: {
		display: `ui-serif, "New York", "Iowan Old Style", Georgia, Cambria, "Times New Roman", serif`,
		body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
		data: `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`,
	},

	// Default Apple Wallet pass colors (rgb() strings, per Brand Book §4.4)
	pass: {
		backgroundColor: "rgb(125, 42, 58)",
		foregroundColor: "rgb(250, 245, 236)",
		labelColor: "rgb(237, 176, 136)",
	},
} as const;
