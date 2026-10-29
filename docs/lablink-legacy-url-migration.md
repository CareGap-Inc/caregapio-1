# LabLink legacy URL migration

`/quest` and `/lab-ordering` were the landing pages for CareGap's lab ordering offers before LabLink. LabLink replaces both. Their pages, pricing and calls to action are retired.

## Redirects

Configured in `netlify.toml`, Netlify's routing layer: real HTTP responses, not client-side navigation.

| Old URL | Status | Destination | Rationale |
|---|---|---|---|
| `/quest`, `/quest/`, `/quest.html` | 301 | `/lablink` | Same intent (order Quest labs from your app, with your own Quest account). `/lablink` covers existing Quest customers |
| `/lab-ordering`, `/lab-ordering/`, `/lab-ordering.html` | 301 | `/lablink` | Same product. The distinct intent ("order Quest labs without a Quest account of my own") is answered on `/lablink` (FAQ "Do I need my own Quest account?") and in the guide [`/quest-api-without-account`](https://caregap.io/quest-api-without-account) |
| `/quest-thanks`, `/quest-thanks.html` | 301 | `/thanks` | Form confirmation page (noindex) |

Notes:

- **One hop.** Each rule points straight at the final URL, and `/lablink` is served with a 200 rewrite to `lablink.html`. No chains or loops.
- **Trailing slash.** Netlify normalizes `/quest/` to the same rule (confirmed live).
- **Query strings** pass through the redirect (Netlify default), so `?utm_source=…` on old links survives. The destination is first party, and `analytics.js` only reads allow-listed UTM keys, so no other parameter is forwarded to any third party.
- **Case.** Netlify rules are case sensitive. `/QUEST` matches no redirect: it used to return the home page with a 200 (soft 404) and now returns the 404 page. No uppercase links are known.
- **`/lablink.html`** returns 200 with a canonical to `/lablink`. A 301 was not added because `/lablink` is a 200 rewrite to that file, and a forced rule on the file risks a redirect loop. The canonical is enough.

## Indexing

- Retired URLs are **not** in `sitemap.xml`, **not** blocked in `robots.txt`, and **not** noindexed, so crawlers can see and follow the 301s.
- `/lablink` has a self-referencing canonical (`https://caregap.io/lablink`), as do the two guides.
- The legacy page files (`quest.html`, `lab-ordering.html`, `quest-thanks.html`) are deleted, so no cached copy can be served from this repository.
- Before this change, every unknown path returned the home page with a 200 (a sitewide soft 404). Unknown paths now return `404.html` with a real 404 that links to LabLink, the API guide and EasyDonor.
- Deploy previews and branch deploys now send `X-Robots-Tag: noindex, nofollow` (`scripts/noindex-nonprod.mjs`).

## Verified live (2026-10-29, before this change deployed)

```
/quest                -> 301 https://caregap.io/lablink -> 200
/quest/               -> 301 https://caregap.io/lablink -> 200
/quest.html           -> 301 https://caregap.io/lablink -> 200
/lab-ordering         -> 301 https://caregap.io/lablink -> 200
/lab-ordering/        -> 301 https://caregap.io/lablink -> 200
/lab-ordering.html    -> 301 https://caregap.io/lablink -> 200
/quest-thanks         -> 301 https://caregap.io/thanks  -> 200
http://caregap.io/quest -> 301 https://caregap.io/quest -> 301 /lablink   (Netlify's https upgrade, then the rule)
/nonexistent-page     -> 200 (home page)   ← fixed by this change
```

`www.caregap.io` could not be checked from the work environment. Confirm it 301s to the apex.

## Regression checks

- `npm test`: `tests/redirects.test.mjs` checks every legacy rule's status and destination, no chains or loops, a 404 catch-all, hidden repository folders, and noindexed previews. `tests/legacy-content.test.mjs` fails on any link to a retired URL or any retired offer text.
- `npm run check:live`, after each deploy (or `-- --base=<deploy preview URL>`): checks the real HTTP status and destination of every legacy URL, that unknown paths 404, that every sitemap URL is 200 with a matching canonical, and the LabLink docs links.

## Outside this repository

Needs someone with access:

1. **Google Search Console** (not connected to this work): inspect `/quest` and `/lab-ordering` for impressions, queries and backlinks; resubmit `sitemap.xml`; use URL Inspection on `/lablink` and the two guides. Do not use the Removals tool on the old URLs, because the 301s pass their signals to `/lablink`.
2. **Bing Webmaster Tools:** resubmit the sitemap.
3. **Backlinks and listings** pointing at `/quest` or `/lab-ordering` (directories, partner sites, social profiles, email signatures, decks, Calendly event descriptions): update to `https://caregap.io/lablink`.
4. **LabLink app** (`lablink.caregap.io`): check its own `llms.txt`, docs and emails for links to the retired pages or to `app.caregap.io`.
5. **Netlify Forms:** the LabLink contact form keeps the name `quest-signup`, so submission history stays in one place. Rename it only together with any notification rules.
