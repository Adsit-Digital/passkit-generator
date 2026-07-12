// Wrangler bundles .png files as ArrayBuffer via the Data rule in wrangler.toml
declare module "*.png" {
	const content: ArrayBuffer;
	export default content;
}
