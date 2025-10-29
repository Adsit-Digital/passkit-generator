import { GoogleWalletAdapter } from "../../examples/google-wallet/src/GoogleWalletAdapter";
import type { CreateEventTicketRequest } from "./types";

export interface GoogleConfig {
  issuerId: string;
  classSuffix: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  origins?: string[];
}

export function buildGoogleSaveLink(
  req: CreateEventTicketRequest,
  cfg: GoogleConfig
): string {
  const adapter = new GoogleWalletAdapter({
    issuerId: cfg.issuerId,
    classSuffix: cfg.classSuffix,
    serviceAccountEmail: cfg.serviceAccountEmail,
    serviceAccountPrivateKey: cfg.serviceAccountPrivateKey,
    origins: cfg.origins
  });

  return adapter.buildSaveLinkForEvent({
    id: req.id,
    eventName: req.eventName,
    issuerName: req.issuerName,
    startDate: req.startDate,
    endDate: req.endDate,
    venue: req.venue || "",
    seat: req.seat,
    barcodeMessage: req.barcodeMessage,
    logoImageUrl: req.logoImageUrl,
    backgroundImageUrl: req.backgroundImageUrl
  });
}
