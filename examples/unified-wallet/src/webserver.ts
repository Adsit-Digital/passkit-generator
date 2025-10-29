import express from "express";
import { buildApplePkpass } from "./apple";
import { buildGoogleSaveLink } from "./google";
import type { CreateEventTicketRequest } from "./types";
import fs from "node:fs";

const {
  // Apple
  SIGNER_CERT,
  SIGNER_KEY,
  SIGNER_KEY_PASSPHRASE,
  WWDR,
  // Google
  GW_ISSUER_ID,
  GW_CLASS_SUFFIX = "exampleEvent",
  GW_SERVICE_ACCOUNT_EMAIL,
  GW_SERVICE_ACCOUNT_PRIVATE_KEY,
  GW_ALLOWED_ORIGINS
} = process.env;

function getAppleCerts() {
  if (!SIGNER_CERT || !SIGNER_KEY || !WWDR) {
    throw new Error("Missing Apple cert env: SIGNER_CERT, SIGNER_KEY, WWDR");
  }

  const maybeRead = (v?: string) => {
    if (!v) return v;
    if (v.startsWith("-----BEGIN")) return v; // PEM content
    if (fs.existsSync(v)) return fs.readFileSync(v);
    return v;
  };

  return {
    signerCert: maybeRead(SIGNER_CERT)!,
    signerKey: maybeRead(SIGNER_KEY)!,
    signerKeyPassphrase: SIGNER_KEY_PASSPHRASE,
    wwdr: maybeRead(WWDR)!
  };
}

function getGoogleCfg() {
  if (!GW_ISSUER_ID || !GW_SERVICE_ACCOUNT_EMAIL || !GW_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Missing Google env: GW_ISSUER_ID, GW_SERVICE_ACCOUNT_EMAIL, GW_SERVICE_ACCOUNT_PRIVATE_KEY");
  }
  return {
    issuerId: GW_ISSUER_ID,
    classSuffix: GW_CLASS_SUFFIX,
    serviceAccountEmail: GW_SERVICE_ACCOUNT_EMAIL,
    serviceAccountPrivateKey: GW_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    origins: GW_ALLOWED_ORIGINS ? GW_ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"]
  };
}

const app = express();
app.use(express.json());

app.post("/wallet/event", async (req, res) => {
  const body = req.body as CreateEventTicketRequest;
  if (!body || !body.platform) {
    return res.status(400).json({ error: "platform is required: 'apple' | 'google'" });
  }
  if (!body.id || !body.eventName || !body.issuerName || !body.startDate) {
    return res.status(400).json({ error: "id, eventName, issuerName, startDate required" });
  }

  try {
    if (body.platform === "apple") {
      const pkpass = await buildApplePkpass(body, getAppleCerts());
      res.setHeader("content-type", "application/vnd.apple.pkpass");
      res.setHeader("content-disposition", `attachment; filename=event-${body.id}.pkpass`);
      return res.send(pkpass);
    }

    if (body.platform === "google") {
      const link = buildGoogleSaveLink(body, getGoogleCfg());
      return res.json({ saveUrl: link });
    }

    return res.status(400).json({ error: "unsupported platform" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "failed" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Unified wallet demo running on :${port}`);
});
