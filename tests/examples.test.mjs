import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, publicTextFiles } from './helpers.mjs';

// Code examples must be tied to an operation in the LabLink OpenAPI spec so
// `npm run check:live` can validate them. Until the spec is wired in, the
// site publishes no runnable examples, and this test keeps it that way.
test('every published code example names the OpenAPI operation it uses', () => {
  for (const file of publicTextFiles().filter((f) => f.endsWith('.html'))) {
    for (const block of read(file).match(/<pre\b[^>]*>/g) ?? []) {
      assert.match(block, /data-openapi-operation="(GET|POST|PUT|PATCH|DELETE) \/[^"]*"/, `${file}: ${block}`);
    }
  }
});

test('no page shows a request without a matching OpenAPI operation', () => {
  for (const file of publicTextFiles()) {
    const text = read(file).replace(/<pre\b[^>]*data-openapi-operation[\s\S]*?<\/pre>/g, '');
    assert.doesNotMatch(text, /\bcurl\s+(-X|--request|https?:)/, `${file} has an unvalidated curl example`);
    assert.doesNotMatch(text, /Authorization:\s*Bearer\s+\w/, `${file} shows a bearer token`);
  }
});
