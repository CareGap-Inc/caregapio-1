import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, htmlFiles, anchors, ids, resolvePath, commercial, tags, attr, SITE } from './helpers.mjs';

const urls = commercial().urls;

// Where each kind of LabLink CTA is allowed to go.
const CTA_DESTINATIONS = {
  create_account: [urls.app],
  open_app: [urls.app],
  read_docs: [urls.docs],
  openapi: [urls.openapi],
  agent_docs: [urls.agentDocs],
  talk_to_us: ['#contact', '/lablink#contact'],
  email_sales: [urls.sales],
  email_support: [urls.support],
  book_call: ['https://calendly.com/caregap/caregap-demo'],
  explore_lablink: ['/lablink']
};

const isInternal = (href) => href && !/^(https?:|mailto:|tel:|#|javascript:)/.test(href);

test('internal links resolve to a served page', () => {
  for (const file of htmlFiles()) {
    const html = read(file);
    const refs = [
      ...anchors(html).map((a) => a.href),
      ...tags(html, 'img').map((t) => attr(t, 'src')),
      ...tags(html, 'script').map((t) => attr(t, 'src')),
      ...tags(html, 'link').filter((t) => /stylesheet/.test(t)).map((t) => attr(t, 'href'))
    ].filter(isInternal);
    for (const href of refs) {
      const path = href.startsWith('/') ? href : '/' + href;
      if (path.startsWith('/dist/')) continue; // built by `npm run build`
      const resolved = resolvePath(path);
      assert.equal(resolved.status, 200, `${file}: ${href} returns ${resolved.status}`);
    }
  }
});

test('in-page and cross-page anchors point at an existing id', () => {
  for (const file of htmlFiles()) {
    const html = read(file);
    for (const { href } of anchors(html)) {
      if (!href || !href.includes('#') || /^(https?:|mailto:)/.test(href)) continue;
      const [path, hash] = href.split('#');
      if (!hash) continue;
      const target = path ? resolvePath(path).file : file;
      assert.ok(ids(read(target)).has(hash), `${file}: ${href} -> #${hash} missing in ${target}`);
    }
  }
});

test('every LabLink CTA goes to the current signup, docs or sales flow', () => {
  for (const file of htmlFiles()) {
    for (const a of anchors(read(file)).filter((a) => a.cta)) {
      const allowed = CTA_DESTINATIONS[a.cta];
      assert.ok(allowed, `${file}: unknown data-cta "${a.cta}"`);
      assert.ok(allowed.includes(a.href), `${file}: ${a.cta} points at ${a.href}, expected ${allowed.join(' or ')}`);
      assert.ok(a.text.length > 0, `${file}: ${a.cta} has link text`);
    }
  }
});

test('/lablink leads with Create Account, then API docs, then Talk to Us', () => {
  const html = read('lablink.html');
  const hero = html.slice(html.indexOf('<!-- Hero -->'), html.indexOf('<!-- Any Quest relationship'));
  const order = anchors(hero).filter((a) => a.cta).map((a) => a.cta);
  assert.deepEqual(order, ['create_account', 'read_docs', 'talk_to_us']);
  assert.doesNotMatch(hero, /\bfree\b|no credit card/i, 'hero does not promise a free sandbox');
});

test('every LabLink signup link in the site is https on lablink.caregap.io', () => {
  for (const file of htmlFiles()) {
    for (const { href } of anchors(read(file))) {
      if (href && href.includes('lablink.caregap.io')) assert.match(href, /^https:\/\/lablink\.caregap\.io(\/|$)/, `${file}: ${href}`);
    }
  }
});

test('caregap.io links in llms.txt resolve', () => {
  const llms = read('llms.txt');
  for (const m of llms.matchAll(/https:\/\/caregap\.io(\/[^\s)]*)?/g)) {
    const path = (m[1] || '/').replace(/[.,]$/, '');
    assert.equal(resolvePath(path).status, 200, `${SITE}${path}`);
  }
});

test('the contact form keeps its Netlify form name and posts to /thanks', () => {
  const form = tags(read('lablink.html'), 'form')[0];
  assert.equal(attr(form, 'name'), 'quest-signup', 'renaming would split Netlify submissions');
  assert.equal(attr(form, 'action'), '/thanks');
  assert.equal(resolvePath('/thanks').status, 200);
});
