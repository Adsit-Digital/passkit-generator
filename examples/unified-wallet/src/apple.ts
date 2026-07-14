import path from "node:path";
import { PKPass } from "passkit-generator";
import type { CreateEventTicketRequest } from "./types";

export interface AppleCerts {
  signerCert: Buffer | string;
  signerKey: Buffer | string;
  signerKeyPassphrase?: string;
  wwdr: Buffer | string;
}

export async function buildApplePkpass(
  req: CreateEventTicketRequest,
  certs: AppleCerts
): Promise<Buffer> {
  // Use example model. In real usage, supply your own model path or buffers.
  const modelPath = path.resolve(
    process.cwd(),
    "examples/models/examplePass.pass"
  );

  const pass = await PKPass.from({
    model: modelPath,
    certificates: {
      signerCert: certs.signerCert,
      signerKey: certs.signerKey,
      signerKeyPassphrase: certs.signerKeyPassphrase,
      wwdr: certs.wwdr
    }
  });

  const appleOpts = (req.apple ?? { type: "eventTicket" }) as NonNullable<
    CreateEventTicketRequest["apple"]
  >;

  if (appleOpts.type) {
    pass.type = appleOpts.type;
  }

  if (appleOpts.type === "boardingPass" && appleOpts.transitType) {
    pass.transitType = appleOpts.transitType;
  }

  if (req.barcodeMessage) {
    pass.setBarcodes(req.barcodeMessage);
  }

  if (appleOpts.localizations) {
    for (const [lang, map] of Object.entries(appleOpts.localizations)) {
      pass.localize(lang, map as Record<string, string>);
    }
  }

  if (appleOpts.description) {
    // minimal props override using PKPass.from second arg is not available here;
    // we can add description by injecting a pass.json later if needed.
    // For demo purposes we skip description wiring.
  }

  // Apple requires an icon in the model; the example model already has assets.
  // For demo we just export the pkpass buffer.
  return pass.getAsBuffer();
}
