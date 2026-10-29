# LabLink commercial source of truth

Every public claim about LabLink's price, eligibility, billing, onboarding and API. Each one has a source, a verification status and an approver.

**Machine-readable prices** live in [`data/lablink-commercial.json`](../data/lablink-commercial.json). Every dollar amount on the public site and in `llms.txt` must come from that file, and `tests/pricing.test.mjs` fails the build otherwise. To change a price: edit the JSON, then the pages (`lablink.html`, `llms.txt`, and `quest-api-without-account.html` where it quotes fees), then this table.

## Status key

- **Owner-published:** stated on the live site in owner commit `08677bc` (27 Oct 2026, "Pricing follows the October 2026 Quest Subaccount Fee Schedule"). Not yet checked against LabLink billing configuration or the signed fee schedule, because neither is in this repository and the LabLink app repository was not reachable from this work session.
- **Derived:** follows from owner-published copy, but no page states it directly.
- **NEEDS OWNER CONFIRMATION:** not verifiable from available sources. Do not publish it, or keep it only with the wording shown.
- **Retired:** from the retired `/quest` or `/lab-ordering` pages. Must not appear as a current offer.

Approval owner for every commercial fact: the CareGap owner (Jeremy Walker, jeremy@caregap.io). Last verified for every row: 2026-10-29, against repository history and the live caregap.io site.

## Pricing and billing

| # | Fact (as published) | Source | Status |
|---|---|---|---|
| P1 | Subaccount onboarding $1,500, one time; covers NPI and license verification, Quest subaccount setup, API keys, sandbox access and BAA | `08677bc`; fee schedule cited, not in repo | Owner-published. **NEEDS OWNER CONFIRMATION** against LabLink billing config / Stripe price |
| P2 | Same onboarding fee for new and existing Quest customers | `08677bc` | Owner-published. **NEEDS OWNER CONFIRMATION** |
| P3 | Order platform fee: $5.00 (orders 1–100), $3.00 (101–500), $2.00 (501+), graduated; earlier orders are not repriced; resets on the first of each calendar month | `08677bc` | Owner-published. **NEEDS OWNER CONFIRMATION** that billing code implements graduated (not volume-repriced) tiers and a calendar-month reset |
| P4 | Patient record $1.00 per patient per year, billed annually | `08677bc` | Owner-published. **NEEDS OWNER CONFIRMATION** of when the year starts and how a "patient" is counted |
| P5 | Platform fees apply to every order regardless of bill type | `08677bc` | Owner-published |
| P6 | Fees exclude taxes; charged to the payment method on file; card data handled by Stripe | `08677bc` | Owner-published |
| P7 | Pricing is indicative; final terms set in the CareGap Platform Agreement | `08677bc` | Owner-published |
| P8 | Onboarding is charged up front, before sandbox keys are issued (steps 3 → 5 on `/lablink`; `/thanks` step 2 → 3) | `lablink.html`, `thanks.html` | Derived. **NEEDS OWNER CONFIRMATION.** If sandbox is open before payment, the site can say so and the CTA can become "Create Sandbox Account". The spec says sandbox *usage* is not billed, which does not settle whether onboarding is paid before sandbox access |
| P9 | "Free", "no credit card" or "no setup fee" | — | **Not claimed anywhere.** Do not add unless P8 changes |

## Quest relationship and bill types

| # | Fact | Source | Status |
|---|---|---|---|
| Q1 | LabLink works with existing Quest customers and with organizations new to Quest | `08677bc` | Owner-published |
| Q2 | For new customers, CareGap files a Quest subaccount and tracks it to a client number | `lablink.html` | Owner-published. **NEEDS OWNER CONFIRMATION** of whose name the subaccount is in, since the guide says "for your organization" |
| Q3 | Bill types: Client Bill (Quest bills the subaccount at Quest program rates), Patient Cash (Quest's standard patient pricing), Patient Insurance (billed to the plan; insurance details and ICD-10 required) | `08677bc` | Owner-published |
| Q4 | CareGap does not sell, bill or collect for laboratory testing | `08677bc` | Owner-published |
| Q5 | All bill types are available to new and existing Quest customers | `lablink.html` ("Any Quest relationship. Any bill type.") | Owner-published |

## Eligibility and onboarding

| # | Fact | Source | Status |
|---|---|---|---|
| E1 | Every order requires a licensed ordering provider with an active NPI; CareGap does not originate orders | `08677bc` | Owner-published |
| E2 | Platform Agreement and BAA signed before go-live | `08677bc` | Owner-published |
| E3 | Steps: account (NPI and license verified) → agreement → payment method → Quest subaccount → keys and sandbox → certify and go live | `lablink.html` | Owner-published |
| E4 | Steps 1, 2, 3, 5 and 6 are automated; Quest subaccount setup is manual and typically several business days | `lablink.html` | Owner-published |
| E5 | Certification: an automated test order and result round trip; passing it moves the account to production | `lablink.html` | Owner-published. **NEEDS OWNER CONFIRMATION** against the app |
| E6 | Self-service signup at `https://lablink.caregap.io`, with no meeting required | `lablink.html` | Owner-published. Exact signup path not confirmed; CTAs use the app root |
| E7 | Re-billing lab work is regulated in roughly half the states; counsel review advised | `lablink.html` | Owner-published (informational, not legal advice) |

## API and developer experience

`npm run check:live` from a normal network on 2026-10-29 confirmed that the docs, `llms.txt` and `openapi.json` (OpenAPI 3.1.0, "LabLink API" 1.0.0) are public, and read the spec's `servers`. Endpoint-level claims (A2–A8) are still unchecked against the spec's paths.

| # | Fact | Source | Status |
|---|---|---|---|
| A1 | REST API with separate sandbox and production base URLs (and keys) | `openapi.json` `servers`: sandbox `https://lablink.caregap.io/api/sandbox/v1` ("Synthetic data only. Nothing reaches a real lab or a real patient, and nothing is billed. Use a sandbox key."); production `https://lablink.caregap.io/api/v1` ("Available once your account is live. Use a production key.") | **Verified** 2026-10-29 |
| A2 | Patients with caller-supplied `externalId` so retries do not duplicate | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A3 | Test catalog search by name or order code; ask-at-order-entry questions | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A4 | Requisition: patient, tests, provider and answers in one request; CareGap completes questionnaire and provider authorization | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A5 | Status with `actionRequired` and the call that completes it | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A6 | Signed webhooks when Quest receives the requisition and when results post, separately for sandbox and production | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A7 | Playground in the console for sandbox calls | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A8 | One error shape across endpoints | `lablink.html` | Owner-published. **NEEDS VERIFICATION** |
| A9 | Docs at `/docs`, agent docs at `/llms.txt`, spec at `/openapi.json` on `lablink.caregap.io` | `npm run check:live` | **Verified** 2026-10-29: each returns 200 without auth |
| A10 | Structured results; FHIR layer; HL7 and file handling with Quest; audit logging | `lablink.html` | Owner-published |
| A11 | Rate limits, idempotency keys beyond `externalId`, result formats (PDF, LOINC and so on), sandbox result simulation | — | **Not published.** Unknown until the spec is reviewed |
| A12 | Runnable code examples (cURL / JavaScript) | — | **Not published.** Blocked on spec access; the `data-openapi-operation` and `check:live` harness is ready |

## Services, proof points and support

| # | Fact | Source | Status |
|---|---|---|---|
| S1 | At-home collection as an add-on through a mobile phlebotomy partner | `08677bc` | Owner-published. Add-on price not published |
| S2 | CareGap build team can build and maintain a branded app or portal | `08677bc` | Owner-published |
| S3 | "Who We Work With" logos on `/lablink` (Lumen, UpShiftHR, InfinitiHR, Muse Bio, Nutrivue, Getlabs, Thorne, Tru Niagen, Tachin.ai, TRD) | pre-existing | **NEEDS OWNER CONFIRMATION** that each is permissioned and accurately presented on a LabLink page (customer, partner or vendor) |
| S4 | Support contact: sales@caregap.io; no response-time commitment published | site | Owner-published. Dedicated developer support channel: **NEEDS OWNER DECISION** |

## Retired offers (must not be presented as available)

From `quest.html` (removed in `08677bc`) and `lab-ordering.html` (removed in `08677bc`):

| Retired claim | Was on | Replacement on the site |
|---|---|---|
| Order on CareGap's own Quest account; no Quest account of your own needed | `/lab-ordering` | Q1–Q2: new customers get a Quest subaccount through onboarding |
| $0 setup / no setup fee / sandbox with no card | `/lab-ordering` | P1, P8 |
| Testing charged by CareGap at the CareGap Testing Price List; "CareGap account rates" | `/lab-ordering`, `/quest` | Q3–Q4: Quest bills testing by bill type |
| $1,500 setup then a flat $2.00 per order | `/quest` | P1, P3 (graduated tiers) |
| Cash pay only; insurance not supported; no federal program beneficiaries | `/quest`, `/lab-ordering` | Q3: Patient Insurance supported |
| "Two Quest account models" comparison | `/lab-ordering` | Single LabLink offer |
| Every sandbox account has a test ordering provider; critical-value relay to provider's 24/7 contact | `/lab-ordering` | Not carried over. **NEEDS OWNER CONFIRMATION** before reuse |
| Host `app.caregap.io` for docs and OpenAPI | `/lab-ordering` | A9: `lablink.caregap.io` |

`tests/legacy-content.test.mjs` fails the build if any retired claim appears outside a passage that says it is retired.
