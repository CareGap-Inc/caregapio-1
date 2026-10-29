# LabLink documentation update checklist

Run this checklist for any change to LabLink API behaviour, pricing, onboarding, environment availability or legal eligibility. Every item that applies must be done in the same release.

## Pricing or billing change

- [ ] Get owner approval and record the new terms in `docs/lablink-commercial-source-of-truth.md` (source, status, date).
- [ ] Update `data/lablink-commercial.json`.
- [ ] Update `lablink.html`: hero chips, pricing cards, tier table, estimator `tiers`, FAQ (visible and JSON-LD), Offer JSON-LD, `og:description`, footer note.
- [ ] Update `quest-api-without-account.html` ("What it costs", FAQ).
- [ ] Update `llms.txt` (Pricing, Common questions).
- [ ] Check the LabLink app's own pricing, checkout and emails match.
- [ ] `npm test`. The pricing test fails if any page still shows an old amount.

## Onboarding, eligibility or legal change

- [ ] Update the source-of-truth tables (E*, Q*).
- [ ] `lablink.html`: How it works, requirements, sandbox-to-production checklist, FAQ.
- [ ] Both guides: prerequisites, limitations, FAQ.
- [ ] `thanks.html`: next steps.
- [ ] `llms.txt`: Requirements, Timeline, sandbox versus production.
- [ ] If self-service sandbox access or "free"/"no card" status changes, update the hero CTA label and the source-of-truth row P8. `tests/links.test.mjs` blocks "free" in the hero until then.

## API change

- [ ] Update `openapi.json` and the human docs on `lablink.caregap.io` first.
- [ ] Check the developer section, "From signup to your first sandbox order" on `lablink.html`, the lifecycle in `quest-lab-ordering-api.html`, and `llms.txt` "For developers and AI coding agents".
- [ ] Any code example on caregap.io must sit in `<pre data-openapi-operation="METHOD /path">` and use synthetic data only. `npm run check:live` checks the operation exists in the live spec.
- [ ] A change to sandbox or production base URLs or environment availability must agree across the spec `servers`, the docs, the site and `llms.txt`.

## Retiring or renaming a page

- [ ] Add a 301 in `netlify.toml` straight to the final destination, above the catch-all.
- [ ] Remove it from `sitemap.xml`; update every internal link; record it in `docs/lablink-legacy-url-migration.md`.
- [ ] Add its offer language to `RETIRED_TERMS` in `tests/legacy-content.test.mjs` if it described terms that are no longer available.
- [ ] After deploy: `npm run check:live`.

## Always

- [ ] `npm run build && npm test`.
- [ ] Check new pages at phone width (375 px) and with the keyboard only.
- [ ] Update `lastmod` in `sitemap.xml` for changed pages.
