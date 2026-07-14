import express from "express";
import { GoogleWalletAdapter } from "./GoogleWalletAdapter";
import type { NeutralEventTicket } from "./types";

// Read config from env
const {
  GW_ISSUER_ID,
  GW_CLASS_SUFFIX = "exampleEvent",
  GW_SERVICE_ACCOUNT_EMAIL,
  GW_SERVICE_ACCOUNT_PRIVATE_KEY,
  GW_ALLOWED_ORIGINS
} = process.env;

if (!GW_ISSUER_ID || !GW_SERVICE_ACCOUNT_EMAIL || !GW_SERVICE_ACCOUNT_PRIVATE_KEY) {
  // eslint-disable-next-line no-console
  console.warn("Missing Google Wallet env configuration. Set GW_ISSUER_ID, GW_SERVICE_ACCOUNT_EMAIL, GW_SERVICE_ACCOUNT_PRIVATE_KEY.");
}

const adapter = new GoogleWalletAdapter({
  issuerId: GW_ISSUER_ID || "0000000000000000000",
  classSuffix: GW_CLASS_SUFFIX,
  serviceAccountEmail: GW_SERVICE_ACCOUNT_EMAIL || "service@example.iam.gserviceaccount.com",
  serviceAccountPrivateKey: (GW_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  origins: GW_ALLOWED_ORIGINS ? GW_ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"]
});

const app = express();
app.use(express.json());

app.post("/save/event", (req, res) => {
  const body = req.body as Partial<NeutralEventTicket>;
  if (!body || !body.id || !body.eventName || !body.issuerName || !body.startDate) {
    return res.status(400).json({ error: "id, eventName, issuerName, startDate are required" });
  }

  try {
    const link = adapter.buildSaveLinkForEvent({
      id: String(body.id),
      eventName: String(body.eventName),
      issuerName: String(body.issuerName),
      startDate: new Date(body.startDate as any),
      endDate: body.endDate ? new Date(body.endDate as any) : undefined,
      venue: body.venue ?? "",
      seat: body.seat as any,
      barcodeMessage: body.barcodeMessage,
      logoImageUrl: body.logoImageUrl,
      backgroundImageUrl: body.backgroundImageUrl
    });

    return res.json({ saveUrl: link });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "failed" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Google Wallet demo running on :${port}`);
});
