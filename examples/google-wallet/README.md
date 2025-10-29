# Google Wallet Example Component

This example shows how to generate a Save to Google Wallet link for Event Tickets, kept separate from the Apple `.pkpass` generator.

## What it does
- Maps a neutral event ticket shape to Google Wallet EventTicket Class/Object
- Creates a signed Save link JWT (`RS256`) using a Google service account
- Exposes an example HTTP endpoint to return the Save URL

## Setup
1. Enable Google Wallet API for your GCP project and create a service account with Wallet permissions.
2. Create an issuer and get your `issuerId`.
3. Set environment variables:

```bash
export GW_ISSUER_ID="3388000000000000000"
export GW_CLASS_SUFFIX="exampleEvent" # any short suffix
export GW_SERVICE_ACCOUNT_EMAIL="service@project.iam.gserviceaccount.com"
export GW_SERVICE_ACCOUNT_PRIVATE_KEY="$(cat key.json | jq -r .private_key)"
export GW_ALLOWED_ORIGINS="http://localhost:3000"
```

## Run
```bash
pnpm i
pnpm -C examples/google-wallet install
pnpm -C examples/google-wallet build
pnpm -C examples/google-wallet start
```

Then POST to create a Save link:

```bash
curl -X POST http://localhost:3001/save/event \
  -H 'content-type: application/json' \
  -d '{
    "id": "ticket-123",
    "eventName": "My Concert",
    "issuerName": "My Org",
    "startDate": "2025-11-01T19:00:00Z",
    "venue": "Main Arena",
    "barcodeMessage": "ABC123456",
    "logoImageUrl": "https://example.com/logo.png",
    "backgroundImageUrl": "https://example.com/bg.png"
  }'
```

Response contains `saveUrl` to redirect users for adding to Google Wallet.

> Note: This demo uses JWT pre-authorized object creation. For production, manage Classes/Objects via the Wallet Objects REST API and set `reviewStatus` appropriately.
