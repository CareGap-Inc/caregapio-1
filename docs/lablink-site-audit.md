# LabLink site audit — 2026-10-29

An audit of caregap.io for the LabLink sunset of `/quest` and `/lab-ordering`, plus the developer-first and AI-search work. It lists what was found, what changed and what is still open.

## Architecture (as found)

- Static HTML on Netlify (`publish = "."`), Tailwind built to `dist/styles.css`, no framework, no templating. Routing in `netlify.toml`.
- Pages: `index.html` (home), `lablink.html` (`/lablink`), `easydonor.html`, `thanks.html` (form confirmation, noindex), terms and privacy.
- LabLink product app, docs and OpenAPI are on `lablink.caregap.io`, in a separate repository. **Not reachable from this work session:** adding the repository was refused, and the network proxy blocked the host. Every API claim is therefore unverified against the spec (see `docs/lablink-commercial-source-of-truth.md`, section A).
- Forms: Netlify Forms (`quest-signup` on `/lablink`).
- Analytics: **none installed.** No GA, GTM, PostHog, Plausible or Segment.
- Search Console and web analytics: **not connected to this work.** No query, impression or backlink data was available, so the default plan (301 both legacy URLs to `/lablink`) was followed.

## Findings

### Legacy routes

| Finding | Severity | Resolution |
|---|---|---|
| `/quest`, `/lab-ordering` and their `.html` and trailing-slash variants already 301 to `/lablink` in production, in one hop | — | Kept. Added tests and a live check |
| Legacy page files already deleted (`08677bc`) | — | Tests now guard against their return |
| Sitewide soft 404: the `/* → /index.html 200` catch-all returned the home page for every unknown path, including `/QUEST` and mistyped legacy URLs | High (SEO) | Catch-all now serves `404.html` with status 404 |
| Repository folders would be publicly served from the `publish = "."` root (`/docs/*.md` audit notes, `/tests`, `/scripts`, `/data`, `/node_modules`) | Medium | Forced 404 for those paths |
| Deploy previews and branch deploys had no noindex | Medium | `X-Robots-Tag: noindex, nofollow` on non-production contexts |
| Sitemap already excluded retired URLs; robots.txt does not block them | — | Kept. Guides added to sitemap |

### Commercial content

| Finding | Severity | Resolution |
|---|---|---|
| Current `/lablink` pricing ($1,500 onboarding; $5/$3/$2 graduated; $1/patient/yr) is sourced only to owner commit `08677bc`, which cites a fee schedule that is not in the repo | Blocker for "verified" status | Recorded as owner-published, **NEEDS OWNER CONFIRMATION** against billing config. Not changed |
| Prices were repeated independently on the home page (`$1,500 onboarding, from $2.00 per order`) | Low | Home page now links to `/lablink#pricing`. All remaining figures are tied to `data/lablink-commercial.json` by tests |
| No "two account models" comparison on `/lablink` (already removed in `08677bc`) | — | Test guards against its return |
| Sandbox access is not free: published copy puts payment (step 3) before keys (step 5), and `/thanks` says the same | Medium (CTA wording) | Primary CTA is "Create Your LabLink Account", not "Create Free Sandbox". Hero says "Sandbox access is included in onboarding". **NEEDS OWNER CONFIRMATION** (row P8) |
| Retired claims (CareGap's own Quest account, no setup fee, no card, Testing Price List, cash only) could still surface from AI assistants or caches | Medium | Added an FAQ entry on `/lablink`, a section in the guide, and a "Retired offers" section in `llms.txt` stating plainly that they are not available |
| "Who We Work With" logos sit on the LabLink page with no context | Medium (endorsement risk) | **NEEDS OWNER CONFIRMATION** (row S3). Not changed |
| `www.caregap.io` behaviour could not be checked | Low | Confirm it 301s to the apex |

### Developer path

| Finding | Severity | Resolution |
|---|---|---|
| No step-by-step path to a first sandbox order | High (conversion) | Added "From signup to your first sandbox order", a sandbox-to-production checklist and a "Stuck in sandbox?" path to `/lablink` |
| No runnable examples, and none can be written truthfully without the OpenAPI spec | Blocker | None published. Examples must carry `data-openapi-operation`; `npm run check:live` validates them against the live spec; a test blocks unvalidated cURL |
| Old `/lab-ordering` linked `app.caregap.io/openapi.json`; the current site uses `lablink.caregap.io` | Low | Test blocks `app.caregap.io` anywhere on the site |
| Rate limits, result formats and sandbox result behaviour are unpublished | Medium | Not claimed. Backlog |

### SEO and AI discoverability

| Finding | Severity | Resolution |
|---|---|---|
| `llms.txt` existed at caregap.io with pricing and API links | — | Extended: retired offers, sandbox versus production, first-order path, guide links |
| Terms and privacy pages had no canonical or meta description | Low | Added |
| No `og:image` on LabLink pages | Low | Added (the existing hero image) |
| FAQPage JSON-LD on `/lablink` matched the visible FAQ | — | Kept in sync for 3 new questions; a test enforces word-for-word match |
| Two intent pages added: `/quest-lab-ordering-api`, `/quest-api-without-account` | — | See "Guide pages" below |

### Conversion and analytics

| Finding | Severity | Resolution |
|---|---|---|
| CTAs were "Get Started With LabLink" and "See Pricing", with no docs CTA in the hero | Medium | Hero: Create Your LabLink Account → Read API Docs → Talk to us |
| Contact form required Quest relationship and NPI status up front | Medium (friction) | Only company, name and email are required. The rest are optional. Framed as "Talk to an integration specialist". Legally required verification stays in LabLink onboarding (unchanged) |
| "How did you find us?" already offered "AI assistant" | — | Renamed to "How did you hear about CareGap?" and added optional free text (sent only to Netlify Forms, never analytics) |
| No analytics, no attribution | High (measurement) | `analytics.js`: vendor-neutral `dataLayer` events, PHI-safe sanitizer, UTM persistence into the app and the contact form. See `docs/lablink-funnel.md` |
| Unlabelled icon buttons on the home page (menu, modal close) | Low (a11y) | `aria-label` added |

## Guide pages

Three candidate intent pages were proposed. Two were built.

- **`/quest-api-without-account`**: built. It answers the retired `/lab-ordering` page's search intent ("order Quest labs without a Quest account") truthfully under current LabLink terms, and states plainly that the old offer is retired. Every claim maps to an owner-published fact.
- **`/quest-lab-ordering-api`**: built. Prerequisites, order lifecycle, sandbox versus production, bill types, implementation notes and limitations, all from owner-published capabilities. Exact routes and payloads are deferred to the OpenAPI spec instead of being guessed.
- **`/quest-lab-results-api`**: **not built.** A useful results page needs field-level formats, PDF and LOINC availability, polling versus webhook mechanics and sandbox result behaviour. None of that could be verified without the spec, so the page would have been thin or speculative. Backlog item 3.

## Files changed

| File | Change |
|---|---|
| `lablink.html` | CTA hierarchy; first-sandbox-order section; sandbox-to-production checklist; troubleshooting; 3 FAQ entries (visible and JSON-LD); guide links; contact form (3 required fields, attribution hidden fields, optional source detail); `data-cta` tracking; `og:image`; analytics |
| `index.html` | Home LabLink card links to pricing instead of repeating it; CTA tracking; aria-labels; analytics |
| `easydonor.html`, `thanks.html` | Analytics (UTM persistence, contact event on `/thanks`) |
| `quest-lab-ordering-api.html`, `quest-api-without-account.html` | New guide pages |
| `404.html` | New real 404 page |
| `terms-of-use.html`, `privacy-policy.html` | Canonical and meta description |
| `netlify.toml` | Guide routes, real 404, hidden repository folders, noindex previews |
| `sitemap.xml` | Guides added, `lastmod` updated |
| `llms.txt` | Retired offers, developer path, sandbox versus production, guides |
| `analytics.js` | New |
| `data/lablink-commercial.json` | New: single source of truth for prices and URLs |
| `scripts/noindex-nonprod.mjs`, `scripts/check-live.mjs` | New |
| `tests/*.test.mjs`, `tests/helpers.mjs` | New: 61 checks |
| `.github/workflows/site-checks.yml` | New: build and test on PRs and pushes to main; weekly and manual live check |
| `package.json` | `test` and `check:live` scripts |
| `.gitignore` | Generated `_headers` |
| `docs/*.md` | This audit, source of truth, legacy URL migration, funnel, docs update checklist |

## Blockers needing owner signoff

1. **Confirm current pricing** (rows P1–P4) against the signed October 2026 fee schedule and the LabLink billing code: graduated tiers, calendar-month reset, how the patient-record year and patient count work.
2. **Is sandbox open before payment?** (row P8). If yes, the primary CTA can become "Create Sandbox Account", and possibly "no card" if that is true.
3. **LabLink app repository access**, to verify the API claims (section A) against `openapi.json`, add real examples, and build the app-side funnel events.
4. **Partner logos on `/lablink`** (row S3): permission, and whether each is a LabLink customer.
5. **Analytics destination and consent** (`docs/lablink-funnel.md`).
6. **Whose name the Quest subaccount is in** for new-to-Quest customers (row Q2).
7. **Developer support channel and any response-time commitment** (row S4).

## Backlog (prioritized)

1. After deploy: `npm run check:live`; confirm `www` and the `lablink.caregap.io` docs URLs return 200 without auth.
2. With spec access: add validated cURL and JavaScript examples for the six first-order steps, with `data-openapi-operation`, copy buttons and expected responses; add rate-limit and idempotency notes if supported.
3. Build `/quest-lab-results-api` once result formats and sandbox behaviour are confirmed.
4. App-side events (`signup_started`, `signup_completed`, `first_sandbox_order_succeeded`, `production_activation_started`, `production_activated`) in the LabLink app.
5. Search Console: review legacy URL queries and backlinks; resubmit sitemap; update external backlinks (see the migration doc).
6. One permissioned customer or integration proof point for `/lablink` (none available today; no testimonial was invented).
7. Further intent pages to validate before building: HL7/FHIR lab integration, telehealth lab testing integration, at-home lab ordering, ordering-provider requirements.
8. Self-host the hero and logo images (they currently load from imgur and raw.githubusercontent.com) and add a dedicated 1200×630 share image.
