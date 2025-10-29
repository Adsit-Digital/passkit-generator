export type Platform = "apple" | "google";

export interface NeutralEventTicket {
  id: string; // internal id
  eventName: string;
  venue: string;
  startDate: Date | string;
  endDate?: Date | string;
  seat?: {
    section?: string;
    row?: string;
    seat?: string;
  };
  barcodeMessage?: string;
  logoImageUrl?: string; // public URL accessible by Google
  backgroundImageUrl?: string; // public URL
  issuerName: string;
}
