import { Hono } from "hono";
import type { Env } from "./env";
import { publicRoutes } from "./routes/public";
import { dashboardRoutes } from "./routes/dashboard";
import { appleWebService } from "./routes/appleWebService";
import { redeemRoutes } from "./routes/redeem";

const app = new Hono<{ Bindings: Env }>();

app.route("/", publicRoutes);
app.route("/", dashboardRoutes);
app.route("/", appleWebService);
app.route("/", redeemRoutes);

app.notFound((c) => c.text("Not found", 404));
app.onError((err, c) => {
	console.error(err);
	return c.text("Something went wrong on our side. Please try again.", 500);
});

export default app;
