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
| Published copy put payment before sandbox keys | Medium (CTA wording) | Owner: sandbox opens before payment. CTA is now "Create Sandbox Account"; how-it-works, pricing, `/thanks` and the guides say sandbox opens before any payment (row P8) |
| Retired claims (CareGap's own Quest account, no setup fee, no card, Testing Price List, cash only) could still surface from AI assistants or caches | Medium | Added an FAQ entry on `/lablink`, a section in the guide, and a "Retired offers" section in `llms.txt` stating plainly that they are not available |
| "Who We Work With" logos sit on the LabLink page with no context | Medium (endorsement risk) | **NEEDS OWNER CONFIRMATION** (row S3). Not changed |
| `www.caregap.io` behaviour could not be checked | Low | Confirm it 301s to the apex |

### Developer path

| Finding | Severity | Resolution |
|---|---|---|
| No step-by-step path to a first sandbox order | High (conversion) | Added "From signup to your first sandbox order", a sandbox-to-production checklist and a "Stuck in sandbox?" path to `/lablink` |
| No runnable examples | High | Added cURL and JavaScript for each first-order step, a Node.js signature check and a results parser. Each is validated against the spec snapshot (operation, sandbox base URL, body fields, required fields, enums, query parameters); the signature and parser examples are executed in tests; `check:live` confirms each route exists on the sandbox |
| **The site said production ordering was live** ("Sandbox today. Live in days", "moving real orders and real results today", "already runs in production"). The spec says `POST /orders` returns `not_available` on production until production billing is in place | **High** (accuracy) | Claims removed; `/lablink`, the guides and `llms.txt` say production ordering is not open yet. A test blocks those claims while the spec says "Sandbox only for now" |
| "Requisitions" resource and "pull structured results" did not match the API (orders; results arrive by webhook) | Medium | Corrected |
| "FHIR layer" not supported by the docs | Medium | Removed. Row A14 |
| LabLink docs say it keeps no copy of patient data | Medium | Owner: data is retained under the creating organization and never sold. Site says that instead; the LabLink app docs still need the same fix. Row A15 |
| Old `/lab-ordering` linked `app.caregap.io/openapi.json`; the current site uses `lablink.caregap.io` | Low | Test blocks `app.caregap.io` anywhere on the site |
| Rate limits and order idempotency are undocumented | Low | Not claimed |

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
- **`/quest-lab-results-api`**: built once the spec and LabLink's webhook docs were reachable. Covers the `order.results_final` event, reading Quest's HL7 v2 message as JSON, the PDF report, corrected results, delivery rules and PHI handling. Its example event and parsing code are executed by `tests/examples.test.mjs`.

## Files changed

| File | Change |
|---|---|
| `lablink.html` | CTA hierarchy; first-sandbox-order section; sandbox-to-production checklist; troubleshooting; 3 FAQ entries (visible and JSON-LD); guide links; contact form (3 required fields, attribution hidden fields, optional source detail); `data-cta` tracking; `og:image`; analytics |
| `index.html` | Home LabLink card links to pricing instead of repeating it; CTA tracking; aria-labels; analytics |
| `easydonor.html`, `thanks.html` | Analytics (UTM persistence, contact event on `/thanks`) |
| `quest-lab-ordering-api.html`, `quest-api-without-account.html`, `quest-lab-results-api.html` | New guide pages |
| `copy-code.js` | Copy buttons for code examples, announced to screen readers |
| `data/lablink-openapi.json` | Snapshot of the LabLink OpenAPI spec the examples are tested against (not served) |
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

1. **Confirm the published prices are current** (rows P1–P4): $1,500 onboarding; $5.00 / $3.00 / $2.00 per order, graduated by monthly volume and reset each calendar month; $1.00 per patient per year. They come from one commit that cites a fee schedule not in this repository.
2. **Production ordering date** (row A13): in progress, no date yet. The site says production ordering is not open yet.
3. **Partner logos on `/lablink`** (row S3): whether each company agreed to be shown, and whether each is a LabLink customer or other CareGap work.
4. **GA4 measurement ID** for `analytics.js` (`docs/lablink-funnel.md`).
5. **Whose name the Quest subaccount is in** for new-to-Quest customers (row Q2).
6. **LabLink app**: update its docs' "keeps no copy" wording (row A15), and add the app-side funnel events.

## Backlog (prioritized)

1. After deploy: `npm run check:live`; confirm `www` redirects to the apex.
2. When production ordering opens: refresh the spec snapshot and update the "not open yet" lines (see the docs update checklist).
3. Confirm Netlify is building this repository with deploy previews (none appeared on PR #7).
4. App-side events (`signup_started`, `signup_completed`, `first_sandbox_order_succeeded`, `production_activation_started`, `production_activated`) in the LabLink app.
5. Search Console: review legacy URL queries and backlinks; resubmit sitemap; update external backlinks (see the migration doc).
6. One permissioned customer or integration proof point for `/lablink` (none available today; no testimonial was invented).
7. Further intent pages to validate before building: HL7/FHIR lab integration, telehealth lab testing integration, at-home lab ordering, ordering-provider requirements.
8. Self-host the hero and logo images (they currently load from imgur and raw.githubusercontent.com) and add a dedicated 1200×630 share image.
