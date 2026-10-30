import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { ROOT, read, htmlFiles, tags, attr } from './helpers.mjs';

const analytics = createRequire(import.meta.url)(join(ROOT, 'analytics.js'));

const SPEC_EVENTS = [
  'lablink_landing_view',
  'lablink_cta_clicked',
  'lablink_sandbox_signup_started',
  'lablink_sandbox_signup_completed',
  'lablink_first_sandbox_order_succeeded',
  'lablink_production_activation_started',
  'lablink_production_activated',
  'lablink_contact_submitted'
];

const FORBIDDEN_FIELDS = /(e-?mail|name|phone|npi|dob|birth|address|token|secret|password|key|requisition|result|patient|ssn|insurance|icd|note)/i;

test('the event catalogue is exactly the funnel spec', () => {
  assert.deepEqual(Object.keys(analytics.EVENTS).sort(), [...SPEC_EVENTS].sort());
});

test('no event allows a field that could carry PHI or secrets', () => {
  for (const [event, fields] of Object.entries(analytics.EVENTS)) {
    for (const field of fields) assert.doesNotMatch(field, FORBIDDEN_FIELDS, `${event}.${field}`);
  }
});

test('unknown events are dropped', () => {
  assert.equal(analytics.sanitize('lablink_patient_created', { page_path: '/x' }), null);
});

test('sanitize keeps only allow-listed fields', () => {
  const out = analytics.sanitize('lablink_cta_clicked', {
    page_path: '/lablink',
    cta_id: 'create_account',
    cta_location: 'hero',
    cta_destination: 'https://lablink.caregap.io',
    email: 'dev@example.com',
    name: 'Jane Doe',
    npi: '1234567893',
    token: 'sk_live_abc'
  });
  assert.deepEqual(out, {
    event: 'lablink_cta_clicked',
    page_path: '/lablink',
    cta_id: 'create_account',
    cta_location: 'hero',
    cta_destination: 'https://lablink.caregap.io'
  });
});

test('sanitize drops values that look like PHI or secrets, even in allowed fields', () => {
  const out = analytics.sanitize('lablink_landing_view', {
    page_path: '/lablink',
    utm_source: 'someone@example.com',
    utm_medium: '5551234567',
    utm_campaign: 'Bearer abc.def',
    utm_term: 'npi 1234567893',
    utm_content: 'spring'
  });
  assert.deepEqual(out, { event: 'lablink_landing_view', page_path: '/lablink', utm_content: 'spring' });
});

test('URLs lose their query string and fragment', () => {
  const out = analytics.sanitize('lablink_cta_clicked', {
    page_path: '/lablink?email=a',
    cta_id: 'read_docs',
    cta_destination: 'https://lablink.caregap.io/docs?token=abc#auth'
  });
  assert.equal(out.page_path, '/lablink');
  assert.equal(out.cta_destination, 'https://lablink.caregap.io/docs');
});

test('the self-reported source is limited to its fixed choices', () => {
  const ok = analytics.sanitize('lablink_contact_submitted', { lead_source: 'AI assistant' });
  assert.equal(ok.lead_source, 'AI assistant');
  const freeText = analytics.sanitize('lablink_contact_submitted', { lead_source: 'my friend Dr. Smith' });
  assert.equal(freeText.lead_source, undefined);
});

test('values are capped in length', () => {
  const out = analytics.sanitize('lablink_landing_view', { utm_campaign: 'x'.repeat(500) });
  assert.equal(out.utm_campaign.length, 100);
});

test('traffic sources are classified without treating direct traffic as AI', () => {
  const c = analytics.classifySource;
  assert.equal(c('', '', 'caregap.io'), 'direct');
  assert.equal(c('', 'caregap.io', 'caregap.io'), 'internal');
  assert.equal(c('', 'chatgpt.com', 'caregap.io'), 'ai_assistant');
  assert.equal(c('', 'www.perplexity.ai', 'caregap.io'), 'ai_assistant');
  assert.equal(c('', 'claude.ai', 'caregap.io'), 'ai_assistant');
  assert.equal(c('', 'gemini.google.com', 'caregap.io'), 'ai_assistant');
  assert.equal(c('', 'www.google.com', 'caregap.io'), 'organic_search');
  assert.equal(c('', 'www.bing.com', 'caregap.io'), 'organic_search');
  assert.equal(c('', 'news.ycombinator.com', 'caregap.io'), 'referral');
  assert.equal(c('chatgpt.com', '', 'caregap.io'), 'ai_assistant');
  assert.equal(c('newsletter', '', 'caregap.io'), 'campaign');
});

test('pages with LabLink CTAs load the analytics script', () => {
  for (const file of htmlFiles()) {
    const html = read(file);
    if (!/data-cta="|data-lablink-page="/.test(html)) continue;
    assert.ok(tags(html, 'script').some((t) => attr(t, 'src') === 'analytics.js'), `${file} loads analytics.js`);
  }
});

test('landing view and contact events are wired on the right pages', () => {
  for (const [file, page] of [
    ['lablink.html', 'lablink'],
    ['quest-lab-ordering-api.html', 'guide'],
    ['quest-api-without-account.html', 'guide'],
    ['thanks.html', 'contact_thanks']
  ]) {
    assert.match(read(file), new RegExp(`data-lablink-page="${page}"`), file);
  }
  assert.match(read('lablink.html'), /<form[^>]+data-lablink-contact="lablink_contact"/);
});

test('the contact form only carries allow-listed attribution fields', () => {
  const html = read('lablink.html');
  const form = html.slice(html.indexOf('<form'), html.indexOf('</form>'));
  const hidden = tags(form, 'input').filter((t) => attr(t, 'type') === 'hidden').map((t) => attr(t, 'name'));
  const allowed = ['form-name', ...analytics.UTM_KEYS, 'landing_page', 'referrer_host', 'traffic_source'];
  for (const name of hidden) assert.ok(allowed.includes(name), `hidden field ${name}`);
});

test('the "How did you hear about CareGap?" question is optional and offers AI assistant', () => {
  const html = read('lablink.html');
  const select = html.match(/<select id="source"[\s\S]*?<\/select>/)[0];
  assert.doesNotMatch(select, /\srequired/);
  assert.match(select, /value="AI assistant"/);
  const values = [...select.matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(values, analytics.LEAD_SOURCES);
  assert.doesNotMatch(html.match(/<input[^>]+id="source-detail"[^>]*>/)[0], /\srequired/);
});

test('the funnel doc defines every event', () => {
  const doc = read('docs/lablink-funnel.md');
  for (const event of SPEC_EVENTS) assert.ok(doc.includes('`' + event + '`'), event);
});

test('GA4 is either off or configured with a valid measurement ID, on production hosts only', () => {
  assert.match(analytics.GA4_MEASUREMENT_ID, /^(|G-[A-Z0-9]+)$/);
  assert.deepEqual(analytics.GA4_HOSTS, ['caregap.io', 'www.caregap.io']);
});

test('the page URL sent to GA4 keeps only allow-listed UTMs', () => {
  const clean = analytics.cleanPageLocation;
  assert.equal(clean('https://caregap.io/lablink?utm_source=chatgpt.com&email=a@b.com&token=abc#faq'), 'https://caregap.io/lablink?utm_source=chatgpt.com');
  assert.equal(clean('https://caregap.io/quest-lab-results-api?npi=1234567893'), 'https://caregap.io/quest-lab-results-api');
  assert.equal(clean('https://caregap.io/lablink?utm_campaign=x@y.com'), 'https://caregap.io/lablink');
});

test('GA4 is configured without Google signals or ad personalization', () => {
  const source = read('analytics.js');
  assert.match(source, /allow_google_signals: false/);
  assert.match(source, /allow_ad_personalization_signals: false/);
  assert.match(source, /page_location: cleanPageLocation\(/);
});

test('GA4 debug mode is sent only when analytics_debug is on', () => {
  const source = read('analytics.js');
  assert.match(source, /if \(debug\) config\.debug_mode = true;/);
  assert.doesNotMatch(source, /debug_mode:\s*false/, 'GA4 treats any debug_mode value as on');
});
