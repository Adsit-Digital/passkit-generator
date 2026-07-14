export type Platform = "apple" | "google";

export interface CreateEventTicketRequest {
  platform: Platform;
  id: string; // internal id for google object suffix
  eventName: string;
  issuerName: string;
  startDate: string; // ISO
  endDate?: string; // ISO
  venue?: string;
  seat?: {
    section?: string;
    row?: string;
    seat?: string;
  };
  barcodeMessage?: string;
  logoImageUrl?: string; // required for Google if used
  backgroundImageUrl?: string; // required for Google if used

  // Apple-specific (optional)
  apple?: {
    type: "eventTicket" | "boardingPass" | "coupon" | "storeCard" | "generic";
    transitType?:
      | "PKTransitTypeAir"
      | "PKTransitTypeBoat"
      | "PKTransitTypeBus"
      | "PKTransitTypeGeneric"
      | "PKTransitTypeTrain";
    localizations?: Record<string, Record<string, string>>; // lang -> { key: value }
    serialNumber?: string;
    description?: string;
  };
}
