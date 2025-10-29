import jwt from "jsonwebtoken";
import { GoogleAuth } from "google-auth-library";
import type { NeutralEventTicket } from "./types";

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

  // Ensure the class resource exists (idempotent upsert). For demo, we build JWT without REST calls.
  // In production, call walletobjects.googleapis.com to create Class/Object and manage updates.

  buildSaveLinkForEvent(ticket: NeutralEventTicket): string {
    const { issuerId, classSuffix, serviceAccountEmail, serviceAccountPrivateKey, origins } = this.config;

    const eventClassId = `${issuerId}.${classSuffix}`; // EventTicketClass ID
    const objectSuffix = ticket.id.replace(/[^A-Za-z0-9._-]/g, "-");
    const objectId = `${issuerId}.${objectSuffix}`; // EventTicketObject ID

    const eventClass = {
      id: eventClassId,
      issuerName: ticket.issuerName,
      reviewStatus: "UNDER_REVIEW", // or "APPROVED" once published
      eventName: { defaultValue: { language: "en-US", value: ticket.eventName } },
      logo: ticket.logoImageUrl ? { sourceUri: { uri: ticket.logoImageUrl } } : undefined,
      heroImage: ticket.backgroundImageUrl ? { sourceUri: { uri: ticket.backgroundImageUrl } } : undefined
    } as const;

    const object: any = {
      id: objectId,
      classId: eventClassId,
      state: "ACTIVE",
      heroImage: ticket.backgroundImageUrl ? { sourceUri: { uri: ticket.backgroundImageUrl } } : undefined,
      barcode: ticket.barcodeMessage
        ? { type: "QR_CODE", value: ticket.barcodeMessage } 
        : undefined,
      seatInfo: ticket.seat
        ? {
            seat: { defaultValue: { language: "en-US", value: ticket.seat.seat ?? "" } },
            row: { defaultValue: { language: "en-US", value: ticket.seat.row ?? "" } },
            section: { defaultValue: { language: "en-US", value: ticket.seat.section ?? "" } }
          }
        : undefined,
      locations: ticket.venue
        ? [ { name: ticket.venue } ]
        : undefined,
      validTimeInterval: ticket.startDate
        ? {
            start: { dateTime: new Date(ticket.startDate).toISOString() },
            end: ticket.endDate ? { dateTime: new Date(ticket.endDate).toISOString() } : undefined
          }
        : undefined
    };

    // JWT per https://developers.google.com/wallet/reference/s2w-reference
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600; // 1 hour

    const claims = {
      iss: serviceAccountEmail,
      aud: "google",
      typ: "savetowallet",
      iat,
      exp,
      origins: origins ?? ["http://localhost:3000"],
      payload: {
        // Pre-authorize class and object creation via JWT
        eventTicketClasses: [eventClass],
        eventTicketObjects: [object]
      }
    } as const;

    const token = jwt.sign(claims, serviceAccountPrivateKey, { algorithm: "RS256" });
    return `https://pay.google.com/gp/v/save/${token}`;
  }
}
