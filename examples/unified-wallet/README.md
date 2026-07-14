# Unified Wallet Example API

A simple API exposing both Apple Wallet (.pkpass) and Google Wallet (Save link) flows so a UI can call a single service.

## Endpoints
- POST `/wallet/event`
  - Request body (JSON):
  ```json
  {
    "platform": "apple" | "google",
    "id": "ticket-123",
    "eventName": "My Concert",
    "issuerName": "My Org",
    "startDate": "2025-11-01T19:00:00Z",
    "endDate": "2025-11-01T21:00:00Z",
    "venue": "Main Arena",
    "seat": { "section": "A", "row": "2", "seat": "14" },
    "barcodeMessage": "ABC123456",
    "logoImageUrl": "https://example.com/logo.png",
    "backgroundImageUrl": "https://example.com/bg.png",
    "apple": {
      "type": "eventTicket",
      "transitType": "PKTransitTypeAir",
      "localizations": { "en": { "EVENT_TITLE": "My Concert" } },
      "serialNumber": "SN-001",
      "description": "Event ticket"
    }
  }
  ```
  - Response:
    - `platform=apple`: returns the `.pkpass` file (content-type `application/vnd.apple.pkpass`).
    - `platform=google`: returns `{ "saveUrl": "https://pay.google.com/gp/v/save/<JWT>" }`.

## Environment

Apple certs (PEM contents or file paths):
```bash
export SIGNER_CERT=/path/to/cert.pem
export SIGNER_KEY=/path/to/key.pem
export SIGNER_KEY_PASSPHRASE="optional"
export WWDR=/path/to/WWDR.pem
```

Google Wallet:
```bash
export GW_ISSUER_ID="3388000000000000000"
export GW_CLASS_SUFFIX="exampleEvent"
export GW_SERVICE_ACCOUNT_EMAIL="service@project.iam.gserviceaccount.com"
export GW_SERVICE_ACCOUNT_PRIVATE_KEY="$(cat key.json | jq -r .private_key)"
export GW_ALLOWED_ORIGINS="http://localhost:3000"
```

## Run
```bash
pnpm -C examples/unified-wallet install
pnpm -C examples/unified-wallet build
pnpm -C examples/unified-wallet start
```

## Notes
- The Apple flow uses the sample model at `examples/models/examplePass.pass`. Replace with your production model(s).
- The Google flow uses JWT pre-authorized creation for demo; manage Classes/Objects via REST API for production readiness.
