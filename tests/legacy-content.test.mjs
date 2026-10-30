import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, publicTextFiles, textChunks, htmlFiles } from './helpers.mjs';

// Terms from the retired /quest and /lab-ordering pages. They may appear
// only in a passage that explicitly says the offer is retired.
const RETIRED_TERMS = [
  /no setup fee/i,
  /\$0\b/,
  /no card\b/i,
  /testing price list/i,
  /CareGap account rates?/i,
  /CareGap's (own )?(Quest|laboratory) account/i,
  /\b(on|use) (our|CareGap's) (Quest )?account/i,
  /insurance billing is not (supported|available)/i,
  /cash pay only/i,
  /no quest account (of your own )?(is )?needed/i,
  /Start Setup/
];

function passages(file) {
  const raw = read(file);
  if (file.endsWith('.html')) return textChunks(raw);
  // llms.txt: one passage per section.
  return raw.split(/^#+ /m);
}

test('retired offer terms appear only where they are labelled as retired', () => {
  for (const file of publicTextFiles()) {
    for (const passage of passages(file)) {
      // A passage that says the offer is retired, or a question a visitor
      // might ask about it, is not an offer.
      if (/retired/i.test(passage) || passage.trim().endsWith('?')) continue;
      for (const term of RETIRED_TERMS) {
        assert.doesNotMatch(passage, term, `${file}: "${passage.slice(0, 160)}"`);
      }
    }
  }
});

test('no page links to a retired URL', () => {
  for (const file of [...htmlFiles(), 'llms.txt', 'sitemap.xml']) {
    const raw = read(file);
    assert.doesNotMatch(raw, /href="(https:\/\/caregap\.io)?\/(quest|lab-ordering|quest-thanks)(\.html)?\/?["#?]/, file);
    assert.doesNotMatch(raw, /\(https:\/\/caregap\.io\/(quest|lab-ordering)\)/, file);
    assert.doesNotMatch(raw, /<loc>https:\/\/caregap\.io\/(quest|lab-ordering|quest-thanks)(\.html)?\/?<\/loc>/, file);
  }
});

test('no page points at the retired app host', () => {
  for (const file of publicTextFiles()) {
    assert.doesNotMatch(read(file), /app\.caregap\.io/, file);
  }
});

test('the /lablink page does not present account-model pricing columns', () => {
  const html = read('lablink.html');
  assert.doesNotMatch(html, /Use CareGap's account|Hold your own Quest account|Two charges per order/i);
});

// Whether production ordering is open is an owner decision recorded in
// data/lablink-commercial.json. The pages must agree with it.
test('production ordering status on the site matches the source of truth', () => {
  const status = JSON.parse(read('data/lablink-commercial.json')).productionOrdering.status;
  const NOT_OPEN = /production ordering (through the API )?is not open|not_available until production billing/i;
  for (const file of publicTextFiles()) {
    if (status === 'open') assert.doesNotMatch(read(file), NOT_OPEN, `${file} says production is not open`);
  }
  if (status !== 'open') {
    for (const file of ['lablink.html', 'quest-lab-ordering-api.html', 'quest-api-without-account.html', 'llms.txt']) {
      assert.match(read(file).replace(/\s+/g, ' '), NOT_OPEN, `${file} says production ordering is not open`);
    }
  }
  for (const file of publicTextFiles()) {
    assert.doesNotMatch(read(file), /moving real orders|FHIR layer/i, file);
  }
});
