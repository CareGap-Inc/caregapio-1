// Post-deploy smoke test against a running site and the LabLink docs.
//
//   npm run check:live                         # https://caregap.io
//   npm run check:live -- --base=https://deploy-preview-7--caregap.netlify.app
//
// Checks real HTTP behaviour that the unit tests can only infer from
// netlify.toml: permanent legacy redirects with no chains, a real 404,
// self-referencing canonicals, sitemap URLs, the LabLink docs and OpenAPI
// links, and that any code example on the site names an operation that
// exists in the OpenAPI spec. Read-only: it never places an order.
import { readFileSync, readdirSync } from 'node:fs';

const base = (process.argv.find((a) => a.startsWith('--base='))?.split('=')[1] || 'https://caregap.io').replace(/\/$/, '');
const commercial = JSON.parse(readFileSync('data/lablink-commercial.json', 'utf8'));
const failures = [];
const pass = (msg) => console.log(`ok    ${msg}`);
const fail = (msg) => { failures.push(msg); console.log(`FAIL  ${msg}`); };

async function head(url) {
  return fetch(url, { redirect: 'manual', headers: { 'user-agent': 'caregap-check-live' } });
}

async function checkRedirect(path, expected) {
  const res = await head(base + path);
  const location = res.headers.get('location') || '';
  const target = new URL(location, base + path).toString();
  if (![301, 308].includes(res.status)) return fail(`${path}: expected 301/308, got ${res.status}`);
  if (new URL(target).pathname !== expected) return fail(`${path}: redirects to ${target}, expected ${expected}`);
  const next = await head(target);
  if (next.status !== 200) return fail(`${path}: destination ${target} returned ${next.status} (chain or error)`);
  pass(`${path} -> ${res.status} ${new URL(target).pathname} -> 200`);
}

async function checkPage(path) {
  const res = await head(base + path);
  if (res.status !== 200) return fail(`${path}: expected 200, got ${res.status}`);
  const html = await res.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  const expected = 'https://caregap.io' + (path === '/' ? '/' : path);
  if (canonical !== expected) return fail(`${path}: canonical ${canonical}, expected ${expected}`);
  const robots = res.headers.get('x-robots-tag') || '';
  if (base === 'https://caregap.io' && /noindex/i.test(robots)) return fail(`${path}: production page sends X-Robots-Tag ${robots}`);
  pass(`${path} 200, canonical ok`);
}

async function main() {
  console.log(`Checking ${base}\n`);

  // A wrong host (for example a deploy preview that does not exist) answers
  // 404 everywhere, which would make the 404 checks below pass falsely.
  const home = await head(base + '/');
  const homeHtml = home.status === 200 ? await home.text() : '';
  if (!homeHtml.includes('<link rel="canonical" href="https://caregap.io/">')) {
    console.log(`FAIL  ${base}/ returned ${home.status} and is not the CareGap site. Check the URL.`);
    process.exit(1);
  }

  for (const path of ['/quest', '/quest/', '/quest.html', '/lab-ordering', '/lab-ordering/', '/lab-ordering.html']) {
    await checkRedirect(path, '/lablink');
  }
  await checkRedirect('/quest-thanks', '/thanks');

  const missing = await head(base + '/this-page-does-not-exist-' + Date.now());
  missing.status === 404 ? pass('unknown path returns 404') : fail(`unknown path returned ${missing.status} (soft 404)`);

  for (const path of ['/docs/lablink-site-audit.md', '/data/lablink-commercial.json']) {
    const res = await head(base + path);
    res.status === 404 ? pass(`${path} not served`) : fail(`${path} returned ${res.status}`);
  }

  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  for (const loc of [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])) {
    await checkPage(new URL(loc).pathname);
  }

  console.log('\nLabLink docs');
  for (const [key, url] of Object.entries(commercial.urls).filter(([k]) => ['app', 'docs', 'openapi', 'agentDocs'].includes(k))) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'caregap-check-live' } });
      res.ok ? pass(`${key}: ${url} ${res.status}`) : fail(`${key}: ${url} returned ${res.status}`);
    } catch (e) {
      fail(`${key}: ${url} unreachable (${e.message})`);
    }
  }

  let spec = null;
  try {
    spec = await (await fetch(commercial.urls.openapi)).json();
    pass(`OpenAPI ${spec.openapi || spec.swagger} "${spec.info?.title}" ${spec.info?.version}`);
    for (const server of spec.servers || []) console.log(`      server: ${server.url}${server.description ? ` (${server.description})` : ''}`);
    if (!(spec.servers || []).length) fail('OpenAPI spec lists no servers');
  } catch (e) {
    fail(`OpenAPI spec could not be read (${e.message})`);
  }

  const operations = [];
  for (const file of readdirSync('.').filter((f) => f.endsWith('.html'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/data-openapi-operation="(\w+) ([^"]+)"/g)) {
      operations.push({ file, method: m[1].toLowerCase(), path: m[2] });
    }
  }
  for (const op of operations) {
    if (!spec) break;
    spec.paths?.[op.path]?.[op.method]
      ? pass(`${op.file}: ${op.method.toUpperCase()} ${op.path} exists in the spec`)
      : fail(`${op.file}: ${op.method.toUpperCase()} ${op.path} is not in the spec`);
  }
  if (!operations.length) console.log('      no code examples on the site to validate');

  console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
