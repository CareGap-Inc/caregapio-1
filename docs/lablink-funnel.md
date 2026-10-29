# LabLink acquisition and conversion funnel

How LabLink traffic and conversions are measured, from first visit to production customer.

## Where events go

`analytics.js` pushes events to `window.dataLayer`. **No analytics vendor is installed on caregap.io today**, so for now events stay in the browser. To send them somewhere, install a tag manager or analytics tool that reads `dataLayer` (for example Google Tag Manager → GA4). That is an owner decision; see "Open decisions" below.

Events are built from an allow-list of fields per event and passed through `sanitize()`:

- Fields that are not on the event's allow-list are dropped.
- Values containing `@`, seven or more consecutive digits (phone numbers, NPIs, IDs), `Bearer `, `sk_` or `pk_` are dropped.
- URLs lose their query string and fragment.
- Values are capped at 100 characters.
- The self-reported lead source must be one of the fixed choices. Free text from the form is never sent.

`tests/analytics.test.mjs` enforces all of this.

## Events

| Event | Emitted by | When | Fields |
|---|---|---|---|
| `lablink_landing_view` | caregap.io | A page with `data-lablink-page` loads (`/lablink` = `lablink`, guides = `guide`) | `page_path`, `page_type`, `traffic_source`, `referrer_host`, `utm_*` |
| `lablink_cta_clicked` | caregap.io | Click on any element with `data-cta` | `page_path`, `cta_id`, `cta_location`, `cta_destination` |
| `lablink_contact_submitted` | caregap.io | `/thanks` loads after the LabLink contact form was submitted in the same session | `page_path`, `form_location`, `lead_source`, `traffic_source`, `utm_*` |
| `lablink_sandbox_signup_started` | LabLink app (to build) | Signup form first shown or first field completed | `traffic_source`, `utm_*` |
| `lablink_sandbox_signup_completed` | LabLink app (to build) | Account created | `traffic_source`, `utm_*` |
| `lablink_first_sandbox_order_succeeded` | LabLink app, server side (to build) | First sandbox requisition for an account accepted | none beyond an anonymous account key |
| `lablink_production_activation_started` | LabLink app (to build) | Account starts the go-live steps (agreement, payment, provider) | none beyond an anonymous account key |
| `lablink_production_activated` | LabLink app, server side (to build) | Account passes certification and moves to production | none beyond an anonymous account key |

### CTA identifiers

`cta_id` is one of: `create_account`, `open_app`, `read_docs`, `openapi`, `agent_docs`, `talk_to_us`, `email_sales`, `book_call`, `explore_lablink`. `tests/links.test.mjs` checks each one points at its allowed destination. `cta_location` is set on the link (`hero`, `nav`, `developers`, `first_sandbox_order`, `sandbox_help`, `faq`, `contact`, `guide_intro`, `guide_next_step`, `home_products`, `thanks`, …).

On caregap.io, a `create_account` click is the handoff to signup. `lablink_sandbox_signup_started` belongs in the app, where the signup form actually is.

### Traffic source

`traffic_source` is one of:

- `ai_assistant`: the referrer is a known assistant (ChatGPT, Perplexity, Claude, Gemini, Copilot and others in `AI_HOSTS`), or `utm_source` names one. ChatGPT adds `utm_source=chatgpt.com` to links it cites.
- `organic_search`: the referrer is a search engine.
- `campaign`: there is a `utm_source` that is not an assistant.
- `referral`: any other site.
- `direct`: no referrer. **Direct is not treated as AI.** Assistants often strip referrers, so some AI traffic lands here. The self-reported question on the contact form ("How did you hear about CareGap?" with an "AI assistant" choice and optional detail) is the way to measure that share.

## Attribution and UTMs

- On arrival, allow-listed UTM keys (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`), the referring host and the landing path are stored in `sessionStorage`. They are replaced only on a new external touch (new UTMs or another site's referrer).
- Links to `https://lablink.caregap.io` get the stored UTM keys appended, so the app can attribute signups. No other parameter is forwarded.
- The LabLink contact form carries the same values in hidden fields (`utm_*`, `landing_page`, `referrer_host`, `traffic_source`), so each Netlify form submission records its source.
- Legacy redirects (`/quest`, `/lab-ordering`) keep the query string (Netlify's default), so UTMs on old links survive into `/lablink`. Only allow-listed keys are ever read from it.

## Definitions

- **Lead:** a `lablink_contact_submitted`, or a LabLink account created (`lablink_sandbox_signup_completed`).
- **Qualified lead:** a lead from an organization with a licensed ordering provider (in house or through a partner), or a clear plan to get one, and a use case LabLink supports today. Judged by sales from the form's optional fields or the onboarding record. This is a CRM stage, not an analytics event.
- **Activated developer:** an account with `lablink_first_sandbox_order_succeeded`.
- **Production customer:** an account with `lablink_production_activated`.

## Reports

Once a destination is chosen, build one funnel report:

1. `lablink_landing_view` → `lablink_cta_clicked` (`cta_id = create_account`) → `lablink_sandbox_signup_completed` → `lablink_first_sandbox_order_succeeded` → `lablink_production_activated`.
2. A second path: `lablink_landing_view` → `lablink_cta_clicked` (`talk_to_us`) → `lablink_contact_submitted`.

Break both down by:

- landing page (`page_path` of the first `lablink_landing_view`): `/lablink`, `/quest-lab-ordering-api`, `/quest-api-without-account`
- `traffic_source` and `utm_source`
- use case, from the contact form's optional fields (bill types, build help, at-home collection) in the Netlify form export
- funnel stage

Until a destination exists, the Netlify Forms export of `quest-signup` gives the contact path with source fields.

## Verifying events

1. Open any LabLink page with `?analytics_debug=1`. Debug mode lasts for the browser session.
2. Open the browser console. Each event logs as `[lablink analytics] {…}`. `window.dataLayer` holds them too.
3. Check each transition:
   - Load `/lablink` → `lablink_landing_view` with `page_type: "lablink"`.
   - Load `/lablink?utm_source=chatgpt.com` in a new tab → `traffic_source: "ai_assistant"`, and LabLink app links now end in `?utm_source=chatgpt.com`.
   - Click "Create Your LabLink Account" → `lablink_cta_clicked` with `cta_id: "create_account"`, `cta_location: "hero"`.
   - Submit the contact form on a deploy preview → `/thanks` logs `lablink_contact_submitted` once. Reloading `/thanks` logs nothing.
4. Confirm no payload contains form values other than the fixed `lead_source` choices.

`npm test` runs the automated checks.

## Building the app-side events

These belong in the LabLink app repository, not this site:

- Use the same event names and field allow-lists as `EVENTS` in `analytics.js`.
- Emit `lablink_first_sandbox_order_succeeded` and `lablink_production_activated` server side, keyed by an anonymous account identifier (a random ID or a salted hash), never an email, NPI, organization name or requisition ID.
- Never include request or response bodies, patient data, results or keys.
- Read the `utm_*` query parameters the marketing site appends and store them on the account at signup.

## Open decisions

- **Analytics destination (NEEDS OWNER DECISION):** which tool receives `dataLayer` events (GA4 through GTM, PostHog, Plausible, or server-side only), and whether a consent banner is needed. The privacy policy already lists "Advertising and Analytics Services".
- **App-side events:** need a change in the LabLink app repository, which this session could not access.
