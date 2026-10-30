import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redirects, resolvePath, exists, read } from './helpers.mjs';

const LEGACY = ['/quest', '/quest.html', '/lab-ordering', '/lab-ordering.html'];

test('legacy LabLink routes are permanent redirects to /lablink', () => {
  for (const path of LEGACY) {
    const rule = redirects().find((r) => r.from === path);
    assert.ok(rule, `${path} has a redirect rule`);
    assert.ok([301, 308].includes(rule.status), `${path} is permanent, got ${rule.status}`);
    assert.equal(rule.to, '/lablink', `${path} goes straight to /lablink`);
    assert.notEqual(rule.force, true, `${path} does not need force; the legacy file is gone`);
  }
});

test('legacy redirects also cover a trailing slash', () => {
  for (const path of ['/quest/', '/lab-ordering/']) {
    const resolved = resolvePath(path);
    assert.equal(resolved.status, 301, path);
    assert.equal(resolved.to, '/lablink', path);
  }
});

test('the legacy thank-you page redirects to /thanks', () => {
  for (const path of ['/quest-thanks', '/quest-thanks.html']) {
    const resolved = resolvePath(path);
    assert.equal(resolved.status, 301, path);
    assert.equal(resolved.to, '/thanks', path);
  }
});

test('redirects have no chains or loops and land on a real page', () => {
  for (const rule of redirects().filter((r) => r.status === 301 || r.status === 308)) {
    assert.notEqual(rule.from, rule.to, `${rule.from} redirects to itself`);
    const target = resolvePath(rule.to);
    assert.equal(target.status, 200, `${rule.from} -> ${rule.to} lands on a 200, not a ${target.status}`);
    assert.ok(target.file && exists(target.file), `${rule.to} is served from an existing file`);
  }
});

test('/lablink is served directly with a 200', () => {
  const resolved = resolvePath('/lablink');
  assert.equal(resolved.status, 200);
  assert.equal(resolved.file, 'lablink.html');
});

test('the retired page files are gone', () => {
  for (const file of ['quest.html', 'lab-ordering.html', 'quest-thanks.html']) {
    assert.ok(!exists(file), `${file} must not be published`);
  }
});

test('specific rules come before the catch-all, which is a real 404', () => {
  const rules = redirects();
  const catchAllIndex = rules.findIndex((r) => r.from === '/*');
  assert.equal(catchAllIndex, rules.length - 1, 'catch-all is the last rule');
  const catchAll = rules[catchAllIndex];
  assert.equal(catchAll.status, 404, 'unknown paths return 404, not a soft 404');
  assert.equal(catchAll.to, '/404.html');
  assert.ok(exists('404.html'));
  assert.equal(resolvePath('/no-such-page').status, 404);
});

test('repository folders are not served', () => {
  for (const path of ['/docs/lablink-site-audit.md', '/tests/helpers.mjs', '/scripts/check-live.mjs', '/data/lablink-commercial.json', '/node_modules/x']) {
    assert.equal(resolvePath(path).status, 404, path);
  }
});

test('deploy previews and branch deploys are noindexed, production is not', () => {
  const toml = read('netlify.toml');
  const production = toml.match(/\[build\][\s\S]*?command = "([^"]+)"/)[1];
  assert.ok(!production.includes('noindex-nonprod'), 'production build does not add noindex');
  for (const context of ['deploy-preview', 'branch-deploy']) {
    const m = toml.match(new RegExp(`\\[context\\.${context}\\]\\s*\\n\\s*command = "([^"]+)"`));
    assert.ok(m, `${context} has its own build command`);
    assert.ok(m[1].includes('node scripts/noindex-nonprod.mjs'), `${context} runs the noindex script`);
  }
  assert.match(read('scripts/noindex-nonprod.mjs'), /X-Robots-Tag: noindex/);
});
