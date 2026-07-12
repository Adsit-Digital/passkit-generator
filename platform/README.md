# Dinnertide — wallet coupons for restaurants

The Dinnertide platform Worker: merchant dashboard, diner claim pages, Apple/Google Wallet pass issuance, live pass updates, and redemption tracking. Built with [Hono](https://hono.dev) on Cloudflare Workers + D1 + KV, using this repo's `passkit-generator` for `.pkpass` signing.

Brand: `docs/BRAND.md` · Architecture & roadmap: `docs/DEVELOPMENT_PLAN.md` · Market research: `docs/MARKET_OPPORTUNITY.md`

## Local development

```sh
pnpm install                       # from repo root
pnpm --filter passkit-generator build
cd platform
pnpm exec wrangler d1 migrations apply dinnertide-db --local
pnpm dev                           # http://localhost:8787
```

Without Apple/Google credentials the app runs fully except wallet issuance (`.pkpass` returns 503, Google button disabled). To exercise pass generation locally, put self-signed PEMs in `.dev.vars` (see below) — passes won't install on a real iPhone, but the full signing path runs.

## Configuration

Non-secret vars live in `wrangler.toml` (`BASE_URL`, `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `GOOGLE_ISSUER_ID`). Secrets via `wrangler secret put` (or `.dev.vars` locally, dotenv format with `\n`-escaped PEMs):

| Secret | What it is |
|---|---|
| `SIGNER_CERT` / `SIGNER_KEY` / `SIGNER_PASSPHRASE` | Apple Pass Type ID certificate + key (PEM) |
| `WWDR` | Apple WWDR G4 intermediate certificate (PEM) |
| `APNS_KEY` / `APNS_KEY_ID` | APNs auth key (.p8 contents) + its Key ID — powers live pass updates |
| `GOOGLE_SA_EMAIL` / `GOOGLE_SA_KEY` | Google Wallet service account (PKCS#8 PEM) |
| `SESSION_SECRET` | Random string (sessions) |

### One-time platform credentials

1. **Apple ($99/yr, once for the whole platform):** Apple Developer Program → Identifiers → create a Pass Type ID (`pass.com.yourdomain.dinnertide`) → create & download its certificate; export cert + key as PEM. Also create an APNs auth key (Keys → new key with APNs enabled). Note your Team ID.
2. **Google (free):** Google Wallet API console → issuer account → create a service account with Wallet Object Issuer role; request production access.

## Deploy

The **D1 database (`dinnertide-db`) and KV namespace (`dinnertide-sessions`) are
already provisioned** in the Adsit Digital Cloudflare account and their IDs are
wired into `wrangler.toml`. Deploys run through GitHub Actions
(`.github/workflows/deploy-dinnertide.yml`) so no interactive `wrangler login`
is needed.

### One-time setup (enables deploys)

1. Create a Cloudflare API token (My Profile → API Tokens → *Edit Cloudflare
   Workers* template; it needs Workers Scripts, D1, Queues, and KV edit).
2. In the GitHub repo: **Settings → Secrets and variables → Actions** add:
   - `CLOUDFLARE_API_TOKEN` — the token above
   - `CLOUDFLARE_ACCOUNT_ID` — `34b84c2c053c7aac2c85d8016fc2195d`
3. Push to the branch (or run the workflow manually). The pipeline creates the
   queues if missing, applies D1 migrations, and deploys the Worker.

The Worker deploys and runs **without** Apple/Google secrets — the merchant
dashboard and landing page go live immediately; wallet issuance returns 503 /
the Google button is disabled until you add the secrets:

```sh
# After deploy, add wallet + session secrets (once you have them):
wrangler secret put SIGNER_CERT   # ...and SIGNER_KEY, WWDR, APNS_KEY, APNS_KEY_ID,
                                  #    GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SESSION_SECRET,
                                  #    TURNSTILE_SECRET
```

### After the first deploy

Set `BASE_URL` in `wrangler.toml` to the real origin (the assigned
`https://dinnertide.<subdomain>.workers.dev`, or a custom domain) and redeploy —
it's baked into pass `webServiceURL` and QR/redemption links, so passes issued
before it's correct won't receive updates.

### Local deploy (alternative)

If you'd rather deploy from your machine: `wrangler login`, then from `platform/`
run `wrangler queues create dinnertide-apns && wrangler queues create dinnertide-apns-dlq`,
`pnpm exec wrangler d1 migrations apply dinnertide-db --remote`, and `pnpm deploy`.

## What's running

- **Queues** (`dinnertide-apns` + DLQ): APNs push fan-out with retries. The producer enqueues ~50-token batches on coupon edit / redeem / expiry; the same Worker's consumer sends them. Falls back to inline send if no queue is bound.
- **Cron Triggers**: `0 3 * * *` archives expired coupons (and pushes a final update); `0 9 * * 1` warns when the Apple signing cert is within 30 days of expiry.
- **Turnstile**: invisible bot check on signup (set `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET`; skipped when unset).
- **Rate limiting**: login (per IP+email), wallet issuance (per IP), Apple device registration (per device).
- **Analytics Engine** (`dinnertide_events`): `claim`, `pass_issued`, `registered`, `push_sent`, `redeemed`, indexed by merchant.
- **Static assets** (`./public`): favicon + robots.txt, served before the Worker.

## How it works

- `GET /c/:merchant/:coupon` — diner claim page → `…/apple.pkpass` (signed in-Worker) or `…/google` (Save-to-Wallet JWT redirect). Every issuance creates a `passes` row (serial + auth token).
- `POST|DELETE|GET /v1/…` — Apple Wallet web service protocol (device registration, `passesUpdatedSince`, pass re-fetch, logs).
- Coupon edit → bumps `passes.updated_at` → APNs push (empty payload) → devices re-fetch the pass. Google offer class is PATCHed best-effort.
- `GET /r/:serial` — redemption page (the QR baked into every pass); merchant-authenticated redeem voids the pass on the holder's phone.
