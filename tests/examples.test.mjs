import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { read, publicTextFiles, htmlFiles, decodeEntities, attr } from './helpers.mjs';

// Every code example on the site is checked against the LabLink OpenAPI
// spec snapshot in data/lablink-openapi.json. `npm run check:live` fails
// when the live spec drifts from that snapshot, so a drift is caught
// before the examples go stale.
const spec = JSON.parse(read('data/lablink-openapi.json'));
const SANDBOX = spec.servers.find((s) => s.url.includes('/sandbox/')).url;
const NON_API_KINDS = ['webhook-signature', 'webhook-event', 'results-parsing'];

function examples() {
  return htmlFiles().flatMap((file) =>
    [...read(file).matchAll(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/g)].map((m) => ({
      file,
      attrs: ' ' + m[1],
      operation: attr(' ' + m[1], 'data-openapi-operation'),
      kind: attr(' ' + m[1], 'data-example-kind'),
      code: decodeEntities(m[2].replace(/<[^>]+>/g, ''))
    }))
  );
}

const resolve = (schema) => (schema && schema.$ref ? spec.components.schemas[schema.$ref.split('/').pop()] : schema);

// Enough JSON Schema for the request bodies LabLink defines.
function validate(value, schema, path) {
  schema = resolve(schema);
  if (!schema) return;
  if (schema.oneOf) {
    const ok = schema.oneOf.some((option) => {
      try { validate(value, option, path); return true; } catch { return false; }
    });
    assert.ok(ok, `${path} matches none of the allowed forms`);
    return;
  }
  if (schema.enum) assert.ok(schema.enum.includes(value), `${path}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  if (schema.type === 'object') {
    assert.equal(typeof value, 'object', `${path} is an object`);
    for (const key of schema.required ?? []) assert.ok(key in value, `${path}.${key} is required`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.additionalProperties === false) assert.ok(schema.properties?.[key], `${path}.${key} is not a field the API accepts`);
      validate(item, schema.properties?.[key], `${path}.${key}`);
    }
  }
  if (schema.type === 'array') {
    assert.ok(Array.isArray(value), `${path} is an array`);
    value.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`));
  }
  if (schema.type === 'string') assert.equal(typeof value, 'string', `${path} is a string`);
}

function requestOf(code) {
  const curl = code.match(/curl\s+(?:-X\s+(\w+)\s+)?"([^"]+)"/);
  if (curl) {
    const body = code.match(/-d\s+'([\s\S]*?)'/);
    return { method: curl[1] || (body ? 'POST' : 'GET'), url: curl[2], body: body ? JSON.parse(body[1]) : undefined };
  }
  const fetchCall = code.match(/fetch\('([^']+)',\s*\{[\s\S]*?method:\s*'(\w+)'/);
  assert.ok(fetchCall, 'example is a cURL or fetch request');
  const literal = code.match(/JSON\.stringify\((\{[\s\S]*?\})\)\s*\n\s*\}\)/);
  return { method: fetchCall[2], url: fetchCall[1], body: literal ? new Function(`return (${literal[1]})`)() : undefined };
}

test('every published code example is an OpenAPI operation or a known webhook example', () => {
  for (const ex of examples()) {
    assert.ok(ex.operation || NON_API_KINDS.includes(ex.kind), `${ex.file}: <pre${ex.attrs}> needs data-openapi-operation or data-example-kind`);
  }
});

test('API examples match an operation in the spec, on the sandbox base URL', () => {
  const apiExamples = examples().filter((ex) => ex.operation);
  assert.ok(apiExamples.length >= 5, 'the first sandbox order walkthrough is present');
  for (const ex of apiExamples) {
    const [declaredMethod, declaredPath] = ex.operation.split(' ');
    const operation = spec.paths[declaredPath]?.[declaredMethod.toLowerCase()];
    assert.ok(operation, `${ex.file}: ${ex.operation} is not in the spec`);

    const req = requestOf(ex.code);
    assert.equal(req.method, declaredMethod, `${ex.file}: ${ex.operation} sends ${req.method}`);
    assert.ok(req.url.startsWith(SANDBOX + '/'), `${ex.file}: ${ex.operation} uses the sandbox base URL ${SANDBOX}`);

    const url = new URL(req.url);
    const path = url.pathname.slice(new URL(SANDBOX).pathname.length);
    const pattern = new RegExp('^' + declaredPath.replace(/\{[^}]+\}/g, '[^/]+') + '$');
    assert.match(path, pattern, `${ex.file}: ${path} matches ${declaredPath}`);

    const params = (operation.parameters ?? []).filter((p) => p.in === 'query').map((p) => p.name);
    for (const key of url.searchParams.keys()) assert.ok(params.includes(key), `${ex.file}: ${ex.operation} has no query parameter "${key}"`);

    const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
    if (bodySchema) {
      assert.ok(req.body, `${ex.file}: ${ex.operation} sends a body`);
      validate(req.body, bodySchema, `${ex.operation} body`);
    } else {
      assert.equal(req.body, undefined, `${ex.file}: ${ex.operation} takes no body`);
    }

    assert.match(ex.code, /Authorization:\s*`?Bearer \$\{?(process\.env\.)?LABLINK_API_KEY\}?/, `${ex.file}: ${ex.operation} reads the key from LABLINK_API_KEY`);
  }
});

test('API examples use only synthetic sample data from the spec', () => {
  for (const ex of examples().filter((e) => e.operation)) {
    assert.doesNotMatch(ex.code, /\b\d{3}-\d{2}-\d{4}\b|ssnLast4/, `${ex.file}: no SSNs`);
    const npis = ex.code.match(/"providerNpi":\s*"(\d+)"|providerNpi:\s*'(\d+)'/);
    if (npis) assert.equal(npis[1] || npis[2], '1336176510', `${ex.file}: only the sandbox test provider's NPI`);
  }
});

test('the webhook event example is a well-formed results event', () => {
  const ex = examples().find((e) => e.kind === 'webhook-event');
  assert.ok(ex, 'results guide shows an example event');
  const event = JSON.parse(ex.code);
  assert.equal(event.object, 'event');
  assert.equal(event.type, 'order.results_final');
  assert.equal(event.environment, 'sandbox');
  assert.equal(event.test, true, 'the example is a test event, not a patient');
  assert.equal(event.data.results.format, 'hl7v2+json');
  assert.ok(event.data.results.messages[0].segments.some((s) => s.segment === 'OBX'));
});

test('the results parsing example works on the example event', () => {
  const event = JSON.parse(examples().find((e) => e.kind === 'webhook-event').code);
  const source = examples().find((e) => e.kind === 'results-parsing').code;
  const observations = new Function(`${source}\nreturn observations;`)();
  const rows = observations(event);
  assert.equal(rows.length, 1, 'the embedded PDF (OBX type ED) is skipped');
  assert.equal(rows[0].value, 'NONREACTIVE');
  assert.equal(rows[0].status, 'F');
  assert.deepEqual(rows[0].orderedTest, ['91986', 'DONOR, CHAGAS SCREEN', '99QDI']);
  assert.equal(rows[0].comments.length, 1);
});

test('the webhook signature example accepts a valid signature and rejects bad ones', () => {
  const source = examples().find((e) => e.kind === 'webhook-signature').code
    .replace(/^import crypto from 'node:crypto'\s*$/m, '')
    .replace('export function', 'function');
  const verify = new Function('crypto', 'Buffer', `${source}\nreturn verifyLabLinkSignature;`)(crypto, Buffer);
  const secret = 'whsec_test_secret';
  const body = '{"id":"evt_1","object":"event"}';
  const sign = (t, raw) => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verify(body, sign(now, body), secret), true);
  assert.equal(verify(body + ' ', sign(now, body), secret), false, 'tampered body');
  assert.equal(verify(body, sign(now - 600, body), secret), false, 'older than five minutes');
  assert.equal(verify(body, sign(now, body), 'other_secret'), false, 'wrong secret');
});

test('no page shows a request outside a validated example', () => {
  for (const file of publicTextFiles()) {
    const text = read(file).replace(/<pre\b[^>]*data-(openapi-operation|example-kind)[\s\S]*?<\/pre>/g, '');
    assert.doesNotMatch(text, /\bcurl\s+(-X|--request|https?:|")/, `${file} has an unvalidated curl example`);
    assert.doesNotMatch(text, /Authorization:\s*Bearer\s+\w/, `${file} shows a bearer token`);
  }
});
