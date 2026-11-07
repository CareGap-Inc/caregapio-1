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
| P1 | Onboarding $1,500, one time; covers NPI and license verification, Quest subaccount setup or enrollment on CareGap's Quest account, production API keys and BAA | `08677bc`; owner | **Owner-confirmed current** 2026-10-30; extended to CareGap's Quest account 2026-11-07 (row Q6). Sandbox is not part of what onboarding pays for (row P8) |
| P2 | Same onboarding fee for new and existing Quest customers | `08677bc`; owner | **Owner-confirmed current** 2026-10-30 |
| P3 | Order platform fee: $5.00 (orders 1–100), $3.00 (101–500), $2.00 (501+), graduated; earlier orders are not repriced; resets on the first of each calendar month | `08677bc`; owner | **Owner-confirmed current** 2026-10-30 |
| P4 | Patient record $1.00 per patient per year, billed annually | `08677bc`; owner | **Owner-confirmed current** 2026-10-30 |
| P5 | Platform fees apply to every order regardless of bill type | `08677bc` | Owner-published |
| P6 | Fees exclude taxes; charged to the payment method on file; card data handled by Stripe | `08677bc` | Owner-published |
| P7 | Pricing is indicative; final terms set in the CareGap Platform Agreement | `08677bc` | Owner-published |
| P8 | Sandbox opens when an account is created, before any payment | Owner, 2026-10-29 | **Owner-confirmed.** Primary CTA is "Create Sandbox Account", with "no payment needed for sandbox". "Free" and "no credit card" are still not claimed |
| P9 | "Free", "no credit card" or "no setup fee" | — | **Not claimed.** "No payment needed for sandbox" is claimed (row P8) |

## Quest relationship and bill types

| # | Fact | Source | Status |
|---|---|---|---|
| Q1 | LabLink works with existing Quest customers and with organizations new to Quest | `08677bc` | Owner-published |
| Q2 | For new customers, CareGap files a Quest subaccount and tracks it to a client number | `lablink.html` | Owner-published. **NEEDS OWNER CONFIRMATION** of whose name the subaccount is in, since the guide says "for your organization" |
| Q3 | Bill types: Client Bill (Quest bills the subaccount at Quest program rates), Patient Cash (Quest's standard patient pricing), Patient Insurance (billed to the plan; insurance details and ICD-10 required) | `08677bc` | Owner-published |
| Q4 | CareGap does not sell, bill or collect for laboratory testing | `08677bc` | **Superseded by Q7 and Q9** on 2026-11-07: true only on the customer's own Quest account |
| Q5 | All bill types are available to new and existing Quest customers on their own Quest account | `lablink.html` ("Any Quest relationship. Any bill type.") | Owner-published |
| Q6 | Ordering on CareGap's Quest account is offered again: no Quest account of the customer's own and no interface request; Quest adds the verified ordering provider's NPI to CareGap's account; each provider signs an acknowledgment with CareGap. Same platform fees as every other customer, including onboarding | Owner, 2026-11-07 | **Owner-confirmed.** Reverses the retirement of the /lab-ordering offer for the path itself; its no-setup-fee pricing stays retired. **NEEDS OWNER CONFIRMATION** of how long Quest takes to add an NPI; the site states no time |
| Q7 | On CareGap's Quest account, orders are Client Bill. CareGap pays Quest and charges the payment method on file, when the order is placed, Quest's price for the order's testing, including any specimen collection fee, with no markup | Owner, 2026-11-07 | **Owner-confirmed.** Quest's prices are confidential under CareGap's Quest agreement; the owner chose to show them to customers. The CareGap Platform Agreement's §10.2 says testing prices are not set below Quest's price, not that they equal it: align it with "no markup" in the next version |
| Q8 | On CareGap's Quest account, patients in New Jersey and New York are billed as Patient Cash or Patient Insurance, because Client Bill is not available for them | Owner, 2026-11-07 | **Owner-confirmed** |
| Q9 | CareGap never bills patients or health plans; on the customer's own Quest account it does not bill or collect for testing | Replaces Q4 | Owner-published 2026-11-07 |

## Eligibility and onboarding

| # | Fact | Source | Status |
|---|---|---|---|
| E1 | Every order requires a licensed ordering provider with an active NPI; CareGap does not originate orders | `08677bc` | Owner-published |
| E2 | Platform Agreement and BAA signed before go-live | `08677bc` | Owner-published |
| E3 | Steps: account (NPI and license verified) → agreement → payment method → Quest subaccount → keys and sandbox → certify and go live | `lablink.html` | Owner-published |
| E4 | Steps 1, 2, 3, 5 and 6 are automated; Quest subaccount setup is manual and typically several business days to a client number | `lablink.html` | Owner-published |
| E4a | Each new Quest subaccount needs an interface request before it can take orders through LabLink; Quest says interface requests take 4–6 weeks. In the interim the subaccount can order through Quest Quanum or paper requisitions (outside LabLink) | Quest, relayed by owner 2026-11-05 | **Quest-stated.** **NEEDS OWNER CONFIRMATION** whether connecting an existing Quest account also needs an interface request; the site currently states the 4–6 weeks for new subaccounts only |
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
| A13 | Production ordering is open once an account is live | Owner, 2026-10-30; `productionOrdering` in `data/lablink-commercial.json` | **Owner-confirmed.** The LabLink spec and docs still say `POST /orders` is "Sandbox only for now" and returns `not_available` on production; the owner is updating them. When the live spec changes, `check:live` reports drift: refresh the snapshot |
| A14 | "FHIR layer" | `lablink.html` (removed) | **Not supported by the docs** (results are HL7 v2 as JSON; no FHIR endpoints). Removed from the site. **NEEDS OWNER CONFIRMATION** if a FHIR layer exists elsewhere |
| A15 | Patient data is retained under the organization that created it; CareGap never sells it | Owner, 2026-10-29 | **Owner-confirmed.** Replaces "LabLink keeps no copy", which the LabLink app docs (`lablink.caregap.io/llms/overview.md`, `insurance.md`, `webhooks.md`, the `POST /orders` `patientAddress` description) still say. **Those docs need updating in the LabLink app repository** |
| A16 | Runnable cURL and JavaScript examples for the first sandbox order; Node.js signature check; results parsing example | `lablink.html`, `quest-lab-results-api.html` | **Published**, validated by `tests/examples.test.mjs` |

## Services, proof points and support

| # | Fact | Source | Status |
|---|---|---|---|
| S1 | At-home collection as an add-on through a mobile phlebotomy partner | `08677bc` | Owner-published. Add-on price not published |
| S2 | CareGap build team can build and maintain a branded app or portal | `08677bc` | Owner-published |
| S3 | "Who We Work With" logos (Lumen, UpShiftHR, InfinitiHR, Muse Bio, Nutrivue, Getlabs, Thorne, Tru Niagen, Tachin.ai, TRD) | Owner, 2026-10-30 | **Owner-confirmed:** each agreed to be shown and is a CareGap client. Quest Diagnostics logo requested; waiting on the official file |
| S4 | Developer support: support@caregap.io, quoting the request id (LabLink docs); sales: sales@caregap.io. No response-time commitment published | `llms/overview.md`, site | **Verified** for the address. No SLA is claimed |

## Retired offers (must not be presented as available)

From `quest.html` (removed in `08677bc`) and `lab-ordering.html` (removed in `08677bc`):

| Retired claim | Was on | Replacement on the site |
|---|---|---|
| Order on CareGap's own Quest account with no setup fee | `/lab-ordering` | Q6: ordering on CareGap's account is offered again at standard pricing (P1, P3, P4); only the no-setup-fee version stays retired |
| $0 setup / no setup fee / sandbox with no card | `/lab-ordering` | P1, P8 |
| Testing charged by CareGap at the CareGap Testing Price List; "CareGap account rates" | `/lab-ordering`, `/quest` | Q3 on the customer's own account; Q7 on CareGap's account, at Quest's price with no markup |
| $1,500 setup then a flat $2.00 per order | `/quest` | P1, P3 (graduated tiers) |
| Cash pay only; insurance not supported; no federal program beneficiaries | `/quest`, `/lab-ordering` | Q3: Patient Insurance supported |
| "Two Quest account models" comparison | `/lab-ordering` | Single LabLink offer |
| Every sandbox account has a test ordering provider; critical-value relay to provider's 24/7 contact | `/lab-ordering` | Not carried over. **NEEDS OWNER CONFIRMATION** before reuse |
| Host `app.caregap.io` for docs and OpenAPI | `/lab-ordering` | A9: `lablink.caregap.io` |

`tests/legacy-content.test.mjs` fails the build if any retired claim appears outside a passage that says it is retired.
