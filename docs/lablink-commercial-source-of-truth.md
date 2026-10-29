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
| P1 | Subaccount onboarding $1,500, one time; covers NPI and license verification, Quest subaccount setup, production API keys and BAA | `08677bc`; fee schedule cited, not in repo | Owner-published. **NEEDS OWNER CONFIRMATION** that the figure is current. Sandbox is no longer listed as part of onboarding (row P8) |
| P2 | Same onboarding fee for new and existing Quest customers | `08677bc` | Owner-published. **NEEDS OWNER CONFIRMATION** |
| P3 | Order platform fee: $5.00 (orders 1–100), $3.00 (101–500), $2.00 (501+), graduated; earlier orders are not repriced; resets on the first of each calendar month | `08677bc` | Owner-published. **NEEDS OWNER CONFIRMATION** that billing code implements graduated (not volume-repriced) tiers and a calendar-month reset |
| P4 | Patient record $1.00 per patient per year, billed annually | `08677bc` | Owner-published. **NEEDS OWNER CONFIRMATION** of when the year starts and how a "patient" is counted, |
| P5 | Platform fees apply to every order regardless of bill type | `08677bc` | Owner-published |
| P6 | Fees exclude taxes; charged to the payment method on file; card data handled by Stripe | `08677bc` | Owner-published |
| P7 | Pricing is indicative; final terms set in the CareGap Platform Agreement | `08677bc` | Owner-published |
| P8 | Sandbox opens when an account is created, before any payment | Owner, 2026-10-29 | **Owner-confirmed.** Primary CTA is now "Create Sandbox Account", with "no payment needed for sandbox". "Free" and "no credit card" are still not claimed |
| P9 | "Free", "no credit card" or "no setup fee" | — | **Not claimed.** "No payment needed for sandbox" is claimed (row P8) |

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

Verified on 2026-10-29 against the LabLink OpenAPI spec (3.1.0, "LabLink API" 1.0.0) and the agent docs at `lablink.caregap.io/llms.txt` and `/llms/*.md`. A snapshot of the spec is in [`data/lablink-openapi.json`](../data/lablink-openapi.json) (not served on caregap.io). `tests/examples.test.mjs` validates every example on the site against it. `npm run check:live` fails when the live spec drifts from the snapshot, and checks that each example route answers `401` on the sandbox without a key.

| # | Fact | Source | Status |
|---|---|---|---|
| A1 | Separate sandbox (`https://lablink.caregap.io/api/sandbox/v1`) and production (`https://lablink.caregap.io/api/v1`) base URLs and keys; bearer auth | spec `servers`, `securitySchemes`; `overview.md` | **Verified** |
| A2 | `POST /patients` with your own `externalId`: a repeat returns `409 conflict` with `existingId`; `GET /patients?externalId=` | spec | **Verified** |
| A3 | `GET /tests` (`search`, `code`, paging) and `GET /tests/{id}` with ask-at-order-entry `questions` | spec | **Verified** |
| A4 | `POST /orders`: patient, address, 1–25 tests, provider NPI, up to 10 ICD-10-CM codes, billing, answers in one request; LabLink completes questionnaire and provider authorization | spec | **Verified.** The site now says "orders", not "requisitions" (a requisition is the PDF from `GET /orders/{id}/requisition`) |
| A5 | `status` (`created`, `awaiting_collection`, `results_final`, `cancelled`) and `actionRequired` (`answer_questions`, `choose_provider`, `choose_billing`) finished by `/answers`, `/provider`, `/billing` | spec | **Verified** |
| A6 | Signed webhooks `order.awaiting_collection` and `order.results_final`; `LabLink-Signature` HMAC-SHA256; retries every 5 min up to 3 more; at least once; per-environment secrets | `llms/webhooks.md` | **Verified.** Webhooks are not in the OpenAPI document itself |
| A7 | Console playground; test webhook events from the console | `llms/webhooks.md` | **Verified** |
| A8 | One error shape `{ error: { type, message, param, requestId } }`; `LabLink-Request-Id` header | spec `Error`; live 401 from the sandbox | **Verified** |
| A9 | Docs, `llms.txt`, `openapi.json` public | `npm run check:live` | **Verified** |
| A10 | Results: HL7 v2 ORU^R01 parsed to JSON (`hl7v2+json`) plus the PDF report, in the `order.results_final` event; no endpoint to fetch results | `llms/webhooks.md`; spec | **Verified.** The site no longer says results are "pulled" |
| A11 | Sandbox test provider Test Physician, NPI `1336176510`; patients in RI not served; unknown fields rejected | spec | **Verified** |
| A12 | Rate limits, idempotency keys for orders | — | **Not documented.** Not claimed |
| A13 | **Production ordering is not open:** `POST /orders`, `/answers`, `/provider`, `/billing` return `403 not_available` on production "until production billing is in place" | spec | **Verified.** Contradicted the site ("Sandbox today. Live in days", "moving real orders and real results today", "already runs in production"); those claims are removed and the site says production ordering is not open yet. **NEEDS OWNER INPUT:** expected production date, and whether onboarding is charged before production opens |
| A14 | "FHIR layer" | `lablink.html` (removed) | **Not supported by the docs** (results are HL7 v2 as JSON; no FHIR endpoints). Removed from the site. **NEEDS OWNER CONFIRMATION** if a FHIR layer exists elsewhere |
| A15 | Patient data is retained under the organization that created it; CareGap never sells it | Owner, 2026-10-29 | **Owner-confirmed.** Replaces "LabLink keeps no copy", which the LabLink app docs (`lablink.caregap.io/llms/overview.md`, `insurance.md`, `webhooks.md`, the `POST /orders` `patientAddress` description) still say. **Those docs need updating in the LabLink app repository** |
| A16 | Runnable cURL and JavaScript examples for the first sandbox order; Node.js signature check; results parsing example | `lablink.html`, `quest-lab-results-api.html` | **Published**, validated by `tests/examples.test.mjs` |

## Services, proof points and support

| # | Fact | Source | Status |
|---|---|---|---|
| S1 | At-home collection as an add-on through a mobile phlebotomy partner | `08677bc` | Owner-published. Add-on price not published |
| S2 | CareGap build team can build and maintain a branded app or portal | `08677bc` | Owner-published |
| S3 | "Who We Work With" logos on `/lablink` (Lumen, UpShiftHR, InfinitiHR, Muse Bio, Nutrivue, Getlabs, Thorne, Tru Niagen, Tachin.ai, TRD) | pre-existing | **NEEDS OWNER CONFIRMATION** that each is permissioned and accurately presented on a LabLink page (customer, partner or vendor) |
| S4 | Developer support: support@caregap.io, quoting the request id (LabLink docs); sales: sales@caregap.io. No response-time commitment published | `llms/overview.md`, site | **Verified** for the address. No SLA is claimed |

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
