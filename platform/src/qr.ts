import qrcode from "qrcode-generator";

/**
 * Renders `text` as an inline QR SVG string.
 * Type number 0 = auto-size; error correction M is plenty for URLs.
 */
export function qrSvg(text: string, cellSize = 5): string {
	const qr = qrcode(0, "M");
	qr.addData(text);
	qr.make();
	return qr.createSvgTag({ cellSize, margin: 3, scalable: true });
}
