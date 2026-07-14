import jwt from "jsonwebtoken";
import type { CreateEventTicketRequest } from "./types";

export interface GoogleWalletConfig {
  issuerId: string; // e.g. 3388000000000000000
  classSuffix: string; // developer-chosen suffix for class
  origins?: string[]; // allowed origins for JWT save
  serviceAccountEmail: string; // client_email from service account
  serviceAccountPrivateKey: string; // private_key from service account
}

export class GoogleWalletAdapter {
  private config: GoogleWalletConfig;

  constructor(config: GoogleWalletConfig) {
    this.config = config;
  }

  buildSaveLinkForEvent(req: Pick<CreateEventTicketRequest, "id" | "eventName" | "issuerName" | "startDate" | "endDate" | "venue" | "seat" | "barcodeMessage" | "logoImageUrl" | "backgroundImageUrl">): string {
    const { issuerId, classSuffix, serviceAccountEmail, serviceAccountPrivateKey, origins } = this.config;

    const eventClassId = `${issuerId}.${classSuffix}`; // EventTicketClass ID
    const objectSuffix = String(req.id).replace(/[^A-Za-z0-9._-]/g, "-");
    const objectId = `${issuerId}.${objectSuffix}`; // EventTicketObject ID

    const eventClass = {
      id: eventClassId,
      issuerName: req.issuerName,
      reviewStatus: "UNDER_REVIEW",
      eventName: { defaultValue: { language: "en-US", value: req.eventName } },
      logo: req.logoImageUrl ? { sourceUri: { uri: req.logoImageUrl } } : undefined,
      heroImage: req.backgroundImageUrl ? { sourceUri: { uri: req.backgroundImageUrl } } : undefined
    } as const;

    const object: any = {
      id: objectId,
      classId: eventClassId,
      state: "ACTIVE",
      heroImage: req.backgroundImageUrl ? { sourceUri: { uri: req.backgroundImageUrl } } : undefined,
      barcode: req.barcodeMessage ? { type: "QR_CODE", value: req.barcodeMessage } : undefined,
      seatInfo: req.seat
        ? {
            seat: { defaultValue: { language: "en-US", value: req.seat.seat ?? "" } },
            row: { defaultValue: { language: "en-US", value: req.seat.row ?? "" } },
            section: { defaultValue: { language: "en-US", value: req.seat.section ?? "" } }
          }
        : undefined,
      locations: req.venue ? [{ name: req.venue }] : undefined,
      validTimeInterval: req.startDate
        ? {
            start: { dateTime: new Date(req.startDate).toISOString() },
            end: req.endDate ? { dateTime: new Date(req.endDate).toISOString() } : undefined
          }
        : undefined
    };

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const claims = {
      iss: serviceAccountEmail,
      aud: "google",
      typ: "savetowallet",
      iat,
      exp,
      origins: origins ?? ["http://localhost:3000"],
      payload: {
        eventTicketClasses: [eventClass],
        eventTicketObjects: [object]
      }
    } as const;

    const token = jwt.sign(claims, serviceAccountPrivateKey, { algorithm: "RS256" });
    return `https://pay.google.com/gp/v/save/${token}`;
  }
}
