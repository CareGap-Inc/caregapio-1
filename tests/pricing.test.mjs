import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, commercial, publicTextFiles, toText, graphNodes, decodeEntities } from './helpers.mjs';

const pricing = commercial();
const tiers = pricing.orderPlatformFee.tiers;

// Graduated: each order is charged at the rate for its position in the month.
function orderFees(orders) {
  return tiers.reduce((sum, tier) => {
    const upper = tier.to ?? Infinity;
    const count = Math.max(0, Math.min(orders, upper) - (tier.from - 1));
    return sum + count * tier.rate;
  }, 0);
}

const allowedAmounts = new Set([
  pricing.onboarding.amount,
  pricing.patientRecord.amount,
  ...tiers.map((t) => t.rate),
  ...pricing.orderPlatformFee.workedExamples.map((e) => e.total)
]);

test('the worked examples follow from the tiers', () => {
  for (const example of pricing.orderPlatformFee.workedExamples) {
    assert.equal(orderFees(example.orders), example.total, `${example.orders} orders`);
  }
  assert.equal(orderFees(0), 0);
  assert.equal(orderFees(100), 500);
  assert.equal(orderFees(101), 503);
});

test('every dollar amount on the public site comes from the commercial source of truth', () => {
  for (const file of publicTextFiles()) {
    const raw = read(file);
    const text = file.endsWith('.html') ? toText(raw) + ' ' + decodeEntities(raw.match(/<head>[\s\S]*<\/head>/)?.[0] ?? '') : raw;
    for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) {
      const amount = Number(m[1].replace(/,/g, ''));
      assert.ok(allowedAmounts.has(amount), `${file}: $${m[1]} is not a current LabLink price (${[...allowedAmounts].join(', ')})`);
    }
  }
});

test('the fee estimator uses the published tiers', () => {
  const html = read('lablink.html');
  const script = html.match(/const tiers = \[([\s\S]*?)\];/)[1];
  const found = [...script.matchAll(/upTo:\s*(\d+|Infinity),\s*rate:\s*(\d+)/g)].map((m) => ({
    to: m[1] === 'Infinity' ? null : Number(m[1]),
    rate: Number(m[2])
  }));
  assert.deepEqual(found, tiers.map((t) => ({ to: t.to, rate: t.rate })));
  assert.match(html, /id="order-estimate" [^>]*value="300"/);
  assert.match(html, /id="order-estimate-total"[^>]*>\$1,100\.00</);
});

test('the tier table matches the published tiers', () => {
  const text = toText(read('lablink.html'));
  for (const tier of tiers) {
    const range = tier.to ? `${tier.from} to ${tier.to}` : `${tier.from} and above`;
    assert.ok(text.includes(`Tier ${tier.tier} ${range} $${tier.rate.toFixed(2)}`), `Tier ${tier.tier}: ${range} at $${tier.rate}`);
  }
});

test('LabLink Offer markup matches the published prices', () => {
  const service = graphNodes(read('lablink.html')).find((n) => n['@type'] === 'Service');
  const prices = service.offers.map((o) => Number(o.price)).sort((a, b) => a - b);
  const expected = [pricing.onboarding.amount, pricing.patientRecord.amount, ...tiers.map((t) => t.rate)].sort((a, b) => a - b);
  assert.deepEqual(prices, expected);
  for (const offer of service.offers) assert.equal(offer.priceCurrency, pricing.currency);
});

test('only /lablink carries priced Offer markup', () => {
  for (const file of publicTextFiles().filter((f) => f.endsWith('.html') && f !== 'lablink.html')) {
    const offers = graphNodes(read(file)).flatMap((n) => [].concat(n.offers ?? []));
    const priced = offers.filter((o) => o.price !== undefined);
    assert.equal(priced.length, 0, `${file} has its own prices`);
  }
});

test('llms.txt states the same tiers and fees', () => {
  const llms = read('llms.txt');
  assert.ok(llms.includes(`Subaccount onboarding: ${pricing.onboarding.display} one time`));
  assert.ok(llms.includes(`Patient record: ${pricing.patientRecord.display} per patient, billed annually`));
  for (const tier of tiers) {
    const range = tier.to ? `Orders ${tier.from} to ${tier.to}` : `Orders ${tier.from} and above`;
    assert.ok(llms.includes(`${range}: $${tier.rate.toFixed(2)} each`), range);
  }
});

test('the CTA URLs in the source of truth are the ones the pages use', () => {
  const html = read('lablink.html');
  for (const key of ['app', 'docs', 'openapi', 'agentDocs']) {
    assert.ok(html.includes(`href="${pricing.urls[key]}"`), `${key}: ${pricing.urls[key]}`);
  }
});
