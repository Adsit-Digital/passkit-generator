# Market Research Report: Digital-Wallet Coupon Platform for Restaurants

**Prepared:** July 12, 2026 · **Scope:** US market · **Status:** Decision document — does this idea have legs?

---

## The idea being assessed

A SaaS platform where restaurants create and update coupons delivered as **Apple Wallet / Google Wallet passes**. Customers claim a coupon by scanning a QR code on a plain web page — no app install, no email, no phone number. From then on, the restaurant can push updated offers directly to the pass sitting in the customer's wallet. Positioning: a privacy-respecting replacement for email promotions. Target customers: US independent restaurants and small regional groups (2–20 locations).

## How this research was done

A deep-research pipeline decomposed the question into 5 search angles (market size/trends, competitive landscape, demand evidence, pricing benchmarks, and a deliberately contrarian "why this fails" angle), ran parallel web searches, fetched 21 sources, extracted 15 falsifiable claims, and put **every claim through 3-vote adversarial verification** (2 of 3 independent verifiers attempting to refute a claim kills it). 11 claims survived; 4 were refuted. Findings below are labeled:

- ✅ **Verified** — survived adversarial verification, source cited
- ⚠️ **Indicative** — from vendor marketing, blogs, or software directories; useful directionally, not to be treated as fact
- ❌ **Refuted** — killed in verification; listed so they don't sneak back into the pitch

---

## 1. Bottom line up front

**The opportunity is unrefuted but unproven.** The honest one-paragraph verdict:

> The delivery channel is real and growing — consumers demonstrably use mobile wallets, and the pass infrastructure is cheap and commoditized. There is no verified restaurant-specific incumbent at the SMB price point, which is a plausible gap. But **no independent evidence survived verification that wallet-pass coupons outperform email/SMS on redemption or retention, or that customers will reliably scan-to-add** — the core value proposition is an untested hypothesis. The cost to test it is very low (see §7). Validate with real restaurants before building further.

This is a "**cheap to test, don't bet the farm yet**" opportunity — which happens to fit perfectly with a bootstrap approach on Cloudflare, where the infrastructure cost of running a pilot rounds to zero.

**One structural point in the idea's favor (architecture fact, not research):** this needs **no customer mobile app**. Apple Wallet and Google Wallet are preinstalled; a customer scans a QR → web page → "Add to Apple Wallet" (`.pkpass`) or "Save to Google Wallet" (signed link). Updates push server-side via Apple's pass web service and Google's Wallet API. The entire product is a web app (restaurant dashboard + customer claim page + staff redemption scanner), which is why competitors can charge as little as $10–40/month and still run a business.

---

## 2. Market size & channel adoption

### ✅ Verified

| Finding | Number | Source |
|---|---|---|
| Mobile wallet share of in-store transactions (11 countries, 216k+ consumers surveyed) | **21%**, up 10.9% since 2022 | [PYMNTS Intelligence 2025](https://www.pymnts.com/mobile-wallets/2025/consumers-use-mobile-wallets-21percent-in-store-purchases/) |
| Mobile wallet share of online transactions (same survey) | **35%** | [PYMNTS](https://www.pymnts.com/study/how-the-world-does-digital-pocket-revolution) |
| **US** in-store wallet usage (lags global leaders Japan/Singapore at 35%) | **19%** | [PYMNTS](https://www.pymnts.com/mobile-wallets/2025/consumers-use-mobile-wallets-21percent-in-store-purchases/) |
| Americans using digital wallets at least weekly | **~38%** (10% daily) | [Capital One Shopping research](https://capitaloneshopping.com/research/digital-wallet-statistics/) (secondary aggregator, corroborated by eMarketer/PYMNTS) |
| US platform reach: Apple Pay / Google Wallet | **34% / 17%** of consumers | same |
| US proximity mobile payment users by 2028 | **132.6M (50.2% of smartphone users)** | same, from eMarketer forecasts |

Interpretation: the channel exists at meaningful scale and grows through any realistic launch window. Note that **pass reach exceeds payment usage** — any iPhone user (~55–58% of US smartphones) can add a Wallet pass without ever using Apple Pay — so the 34% Apple Pay figure understates addressable reach.

### ✅ Verified — but it cuts against the idea

The PYMNTS research explicitly attributes wallet growth to **tokenized card payments** ("consumers are not abandoning established payment methods… mobile wallets effectively store and tokenize existing cards"). Payment adoption is **not** evidence that consumers engage with coupon/loyalty passes in the wallet. Every wallet-adoption tailwind above is a *prerequisite* for this idea, not *proof of demand* for it. This was the single most load-bearing finding of the verification pass.

### ❌ Refuted — do not use these in any pitch

- "69% of US adults used a digital wallet in the past 30 days" (0–3 vote)
- "Global wallet users growing 4.5B → 5.2B in 2026, 11.2% CAGR" (0–3)
- "Wallet use is increasingly age-agnostic; Gen Z in-store use up 23%" (1–2) — **demographic skew toward younger users remains an open concern** for restaurant customer bases
- No claim on digital-coupon market size or restaurant marketing spend survived at all

---

## 3. Competitive landscape

### ✅ Verified

**PassKit** (the incumbent pass-infrastructure leader): paid plans from **$39.50/month** (per-account platform fee: 1 user, 250 multi-use + 250 single-use passes, plus usage-based pass fees; 45-day free trial). Claims 350M+ passes issued and markets coupon distribution at **under 1¢ per pass at scale** (⚠️ vendor self-reported, 2–1 vote). Sources: [PassKit rates](https://passkit.com/pricing/rates/), [help.passkit.com](https://help.passkit.com), [Slashdot comparison](https://slashdot.org/software/comparison/PassKit-vs-Walletly/).

**Walletly**: from **~$10/month**, targets generic "brand marketers" via chatbot integrations (ManyChat), **zero reviews on major software directories** — minimal verified traction. Its "150% foot traffic increase" claim is unverified vendor marketing. Sources: [Slashdot](https://slashdot.org/software/comparison/PassKit-vs-Walletly/), [SourceForge](https://sourceforge.net/software/compare/PassKit-vs-Walletly/).

**What this means:** raw wallet-pass generation is **commoditized at $10–40/month**. Neither verified survivor is a restaurant product — they're horizontal infrastructure with APIs and generic dashboards. A restaurant-specific product cannot win on "we generate passes"; it must win on **vertical workflow** (create a Tuesday-night special in 60 seconds, table-tent QR kits, staff redemption flow, POS-adjacent reporting) and on being sold in restaurant language.

### ⚠️ Indicative — restaurant-vertical incumbents (not adversarially verified)

The tools restaurants actually buy today, from directory/blog sources and one primary community thread:

| Product | Indicative price | Notes |
|---|---|---|
| **Square Loyalty** | **$45/mo per location** (0–500 loyalty visits; $75 to 1,500; $105 to 10,000; 30-day trial) | Corroborated across [multiple](https://passtastic.io/en/blog/square-loyalty-program-review) [directories](https://www.softwareadvice.com/customer-loyalty/square-loyalty-profile/) and a [Square community thread](https://community.squareup.com/t5/Square-Loyalty/Loyalty-Pricing/m-p/382568); no volume discount multi-location |
| **Toast Loyalty** | ~$50–100/mo add-on; **$185/mo** bundled digital marketing suite (loyalty + email + gift cards) | [Blog](https://www.owner.com/blog/toast-pricing) [sources](https://merchantinsiders.com/blogs/toast-fees/); requires Toast POS ($254–379/mo all-in before loyalty) |
| Standalone loyalty platforms (Thanx, Punchh/PAR class) | ~$45–249/mo small operators; enterprise-priced above that | [Medium pricing survey](https://medium.com/@hello_44288/the-real-cost-of-restaurant-loyalty-software-in-2026-i-checked-every-platform-so-you-dont-have-b109f81a1ecf) (unverified) |

Pattern worth noting even at "indicative" confidence: **POS-tied loyalty ($45–185/mo) is priced well above horizontal pass tools ($10–40/mo)**, is locked to the POS vendor, and is loyalty-points-shaped rather than promotions-shaped. A $29–79/month POS-independent promotions tool would sit in a mostly empty band between the two.

**Coverage gap:** Thanx, Punchh, Vibes, and Airship pricing/traction produced no verifiable claims (enterprise "contact sales" opacity). They serve chains/enterprise; nothing found suggests they compete for single-location independents, but absence of evidence ≠ evidence of absence.

---

## 4. Demand evidence — the honest section

This is the make-or-break question, and it's where verification was most brutal: **zero claims survived.**

### What didn't survive and why

- **No independent (non-vendor) case study** with concrete redemption or retention numbers for wallet-pass coupons vs email/SMS was found. Everything with numbers traced back to vendors selling wallet marketing (Vibes, Airship, regulr.ai, rivo.io) — e.g., "lock-screen notifications get ~99% visibility vs ~20% email opens," "60%+ of consumers want wallet offers." Directionally plausible; **never independently verified**.
- One vendor source ([regulr.ai](https://regulr.ai/blog/apple-wallet-loyalty-programs)) offered the most granular scan-to-add numbers: **5–15% conversion for QR at point-of-sale vs 50–70% for a website button post-enrollment** (⚠️ unverified). If even directionally true, it says the QR-on-a-table-tent funnel is *leaky* and placement/incentive design matters enormously.
- Google's own [Wallet case studies](https://developers.google.com/wallet/partners/case-studies) exist but are partner marketing — real deployments, cherry-picked numbers.

### The email side of the comparison (⚠️ first-party platform data, not independently audited)

[Mailchimp's published benchmarks](https://mailchimp.com/resources/email-marketing-benchmarks/): average open rates 35–45% across industries (inflated by Apple Mail privacy prefetching), but **restaurants/cafés have a click rate of ~1.06% — among the lowest of all industries** (click-to-open ~3.3%). So the channel being replaced genuinely performs poorly for restaurants: a 2,000-subscriber list yields roughly **~21 clicks per campaign**. The bar the wallet channel must clear is low. But that also means restaurants may be *unwilling to pay much for promotions at all* — poor email performance could reflect weak diner demand for promotions, not a channel problem. Research found no verified data on restaurant marketing budgets or willingness-to-pay either way.

### Email open rates vs wallet notification read rates — the direct comparison

This comparison is the heart of the pitch, so it deserves its own honest treatment. The short version: **both channels' headline "open rates" are unreliable, in opposite directions** — email's is inflated by tracking artifacts, and wallet's is unmeasurable by construction.

| | Email (restaurants) | Wallet pass notifications |
|---|---|---|
| **Delivery** | Subject to spam filtering, tab sorting, inbox competition | ⚠️ Effectively **100% of installed passes** get the update on the lock screen — no spam folder, no algorithm. Mechanical property of the channel, degraded only by users muting a pass (iOS allows per-pass notification/auto-update toggles) |
| **Reported "open/read" rate** | ⚠️ 35–45% reported averages ([Mailchimp](https://mailchimp.com/resources/email-marketing-benchmarks/)); ~31% ecommerce ([Klaviyo](https://www.threadpoint.agency/blogs/learn-e-mail-marketing/whats-a-good-email-open-rate-for-ecommerce-2026-benchmarks)) — **but phantom-inflated by Apple Mail Privacy Protection**, which auto-prefetches tracking pixels: ~64% of B2C subscribers are on MPP-capable Apple Mail, Apple Mail accounts for ~49% of all recorded "opens," and [campaigns that used to track 28% opens now show 52% with no change in clicks](https://www.geysera.com/blog/email-marketing/email-marketing-benchmarks-2026-open-rates-ctr-and-why-half-your-data-is-wrong) | ❌ **Not measurable at all.** Neither Apple's PassKit web service nor Google's Wallet API provides read receipts for pass notifications. Every circulating figure — "85–95% open rates," "read 99% of the time (Square 2025 Loyalty Report)" — is a vendor assumption that lock-screen presence = read. The "99% / Square" attribution could not be located in any actual Square publication; it mirrors classic "98% SMS open rate" marketing lore. Do not use it |
| **Best measurable action metric** | ⚠️ Click rate ~**1.06%** for restaurants/cafés — among the lowest of all industries ([Mailchimp](https://mailchimp.com/resources/email-marketing-benchmarks/)) | ⚠️ No direct data exists. Closest measurable analogue: **app push notification direct-open/reaction rates, also a lock-screen surface — iOS ~3.4–4.9%, Android ~4.6–10.7%** ([Airship benchmarks](https://www.airship.com/resources/mobile-app-push-notification-benchmarks-2026/), [Business of Apps](https://www.businessofapps.com/marketplace/push-notifications/research/push-notifications-statistics/)) — i.e., single digits, not 99% |

**The honest takeaways:**

1. **Email's "open rate" is fiction; the ~1% click rate is real.** Comparing wallet anything against "20% email opens" (the vendor framing) understates email; comparing against the 35–45% reported opens overstates it. The defensible email baseline for restaurants is ~1% of the list taking action per campaign.
2. **Wallet's genuine, defensible advantage is delivery, not "reads":** every pass in a wallet receives the update on the lock screen, with zero spam filtering and zero inbox competition. That claim survives scrutiny. "99% read" does not.
3. **Realistic expectation setting:** if wallet notification behavior resembles its closest measured analogue (app push), action rates land in the **~3–10% range — roughly 3–5× restaurant email clicks, not 50×**. Still a materially better channel per message *for customers who hold the pass* — which loops back to scan-to-add as the true bottleneck (§4 above).
4. **The pilot can produce the first honest number in this category:** redemptions-per-notification-sent is fully measurable in the proposed platform (you control both the push and the redemption scan). No vendor publishes this independently; measuring it is both the validation gate and a marketing asset.

### The privacy-positioning question (unresolved)

"No email or phone collected" is the product's stated differentiator — but it's double-edged. Many restaurants view **owning the customer list as the entire point** of email/SMS programs; a channel where the platform can't even export contacts may read as a bug, not a feature, to some buyers. No research evidence either way; this is a discovery-interview question.

---

## 5. Signals FOR this having legs

1. ✅ Wallet habit is established and growing (21% in-store globally, 19% US, +11% growth trend) — the channel prerequisite is met.
2. ✅ Pass infrastructure is commoditized and cheap — you can build this for almost nothing (this repo's own `passkit-generator` library + Cloudflare Workers/D1/KV; marginal cost per pass is fractions of a cent).
3. ✅ **No verified restaurant-specific product exists at the SMB price point.** The verified survivors are horizontal dev tools; the restaurant incumbents (indicative) are POS-locked and pricier. The positioning gap is plausible.
4. ⚠️ The incumbent channel (email) genuinely underperforms for restaurants (~1% click rate) — a low bar to clear.
5. Architecture: no app install for customers, no PII liability, no CAN-SPAM/TCPA compliance surface, works on both major phone platforms. Push-like reach without an app is a real capability most independents have never had.
6. Bootstrap economics are exceptional: fixed costs ≈ Apple Developer $99/yr + Cloudflare Workers Paid $5/mo; Google Wallet API is free. A pilot costs approximately nothing to run.

## 6. Signals AGAINST / key risks

1. ✅ **Wallet growth is tap-to-pay, not pass engagement** — the strongest verified finding cuts against the demand thesis. Nobody has proven US diners add and re-engage with coupon passes at scale.
2. **No verified redemption/retention data exists** — the "better than email" pitch currently rests entirely on vendor marketing.
3. ⚠️ The scan-to-add funnel may be leaky (5–15% at POS per one vendor source). The pass only gets in the wallet if the diner acts in-restaurant; there's no list to import and no retargeting. Cold-start is per-restaurant, every restaurant.
4. ❌ The age-agnostic claim was refuted — **older-skewing restaurant customer bases may be poorly reachable** via this channel.
5. Platform dependence: Apple/Google control pass features, push behavior, and lock-screen relevance rules; an OS-level change to pass notifications could kneecap the "push updated offers" capability overnight. Android pass UX is second-class (Google Wallet at 17% reach vs Apple 34%).
6. Restaurants may value owning contact data more than respecting privacy (see §4) — the differentiator could be a demand-killer for part of the market.
7. Low moat: PassKit/Walletly could ship a restaurant skin; Toast/Square already own the POS relationship and already issue wallet-compatible loyalty passes in some flows.
8. SMB restaurant SaaS is a brutal segment: high churn, thin budgets, and (unverified but consistent across sources) loyalty programs commonly die from staff non-adoption at the counter — the redemption workflow has to survive a Friday rush.

---

## 7. Recommended next step: validate before building

The research verdict says: don't write the business plan's revenue projections from these numbers yet — **generate the missing numbers yourself**. The pilot is nearly free to run:

1. **Discovery interviews (2 weeks, $0):** 10–15 local owners/GMs. Key questions: What do you spend monthly on promotions? Did loyalty/email tools disappoint, and why? Does "you don't get their email, but you can update the offer on their phone anytime" excite or concern you? Price reaction at $29 / $49 / $79 per month.
2. **Live pilot (4–8 weeks, ≈$105 total):** 3–5 restaurants, table-tent + receipt QR codes, one evergreen offer plus one weekly-updated offer each. Instrument everything: QR scans → pass adds → redemptions, per placement.
3. **Go / no-go thresholds (suggested):** scan-to-add ≥ 25% (the web-page button step, not raw foot traffic); pass-add-to-redemption ≥ 10% within 30 days; ≥ 3 of 5 pilot restaurants willing to pay ≥ $29/mo unprompted at pilot end; qualitative signal that owners *notice* the channel working without being shown a dashboard.
4. **Only then** write the financial plan — with your own verified redemption data as its centerpiece, which incidentally becomes the sales deck for every subsequent restaurant.

---

## 8. Open questions the research could not answer

1. Do wallet-pass coupons actually outperform email/SMS on redemption and repeat visits for restaurants — any independently verified numbers? Will diners scan-to-add with no app and no contact exchange?
2. What do Thanx, Punchh/PAR, Toast, and Square actually charge per location, what wallet features do they already ship, and how much of the proposed differentiation do they already cover for 2–20-location groups?
3. What is the real marketing budget and willingness-to-pay of US independents for a standalone promotions tool?
4. Does the no-PII positioning convert — or do restaurants insist on owning the customer list? And how much does pass push/geofence engagement depend on OS settings outside anyone's control?

---

## Appendix: source quality notes

- **Primary, high quality:** PYMNTS Intelligence longitudinal survey (216,679 consumers, Jan 2022–Dec 2024, 11 countries). Data runs through Dec 2024; US figures are likely slightly conservative for mid-2026. US wallet growth (+4.3% since 2022) is notably slower than the 11-country average (+10.9%) — global headlines overstate the US tailwind.
- **Secondary, used with corroboration:** Capital One Shopping statistics page (SEO aggregator; figures bracketed against eMarketer/PYMNTS), Slashdot/SourceForge directory listings (vendor-submitted, can be stale).
- **Vendor marketing, flagged ⚠️ wherever used:** PassKit, Walletly, regulr.ai, Vibes, Airship, Google Wallet case studies, Mailchimp benchmarks (first-party platform data).
- **Fetched but rejected as unreliable (no claims extracted):** rivo.io, demandsage.com, restroworks.com, aciworldwide.com PDF, paytronix.com, talkable.com, walletwallet.dev, fancircles.com, stripo.email, bloomintelligence.com, spoton.com, chownow.com, one Medium pricing survey (cited above only as "indicative").

*Report compiled from an adversarially-verified deep-research run (73 research agents, 21 sources fetched, 15 claims tested, 11 confirmed / 4 refuted) plus targeted follow-up checks on competitor pricing and email benchmarks.*
