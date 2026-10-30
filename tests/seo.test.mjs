import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  read, SITE, sitemapLocs, indexablePages, canonical, graphNodes, toText, decodeEntities, exists, resolvePath
} from './helpers.mjs';

test('sitemap lists /lablink and the guides, not the retired pages', () => {
  const locs = sitemapLocs();
  for (const path of ['/lablink', '/quest-lab-ordering-api', '/quest-api-without-account']) {
    assert.ok(locs.includes(SITE + path), `${path} in sitemap`);
  }
  for (const loc of locs) {
    assert.doesNotMatch(loc, /\/(quest|lab-ordering|quest-thanks)(\.html)?$/, `${loc} is retired`);
  }
});

test('every sitemap URL is served with a 200 from an existing file', () => {
  for (const page of indexablePages()) {
    assert.equal(resolvePath(page.path).status, 200, page.loc);
    assert.ok(page.file && exists(page.file), `${page.loc} -> ${page.file}`);
  }
});

test('robots.txt lets crawlers reach the redirects and LabLink pages', () => {
  const robots = read('robots.txt');
  const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
  for (const path of ['/quest', '/lab-ordering', '/lablink', '/quest-lab-ordering-api', '/quest-api-without-account']) {
    assert.ok(!disallowed.some((d) => path.startsWith(d)), `${path} is not disallowed`);
  }
  assert.match(robots, /^Sitemap: https:\/\/caregap\.io\/sitemap\.xml$/m);
});

test('indexable pages have a self-referencing canonical and unique title and description', () => {
  const titles = new Map();
  const descriptions = new Map();
  for (const page of indexablePages()) {
    const html = read(page.file);
    assert.equal(canonical(html), page.loc, `${page.file} canonical`);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/, `${page.file} is indexable`);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    assert.ok(title, `${page.file} has a title`);
    assert.ok(description && description.length >= 50 && description.length <= 300, `${page.file} description length ${description?.length}`);
    assert.ok(!titles.has(title), `${page.file} title duplicates ${titles.get(title)}`);
    assert.ok(!descriptions.has(description), `${page.file} description duplicates ${descriptions.get(description)}`);
    titles.set(title, page.file);
    descriptions.set(description, page.file);
  }
});

test('LabLink pages have Open Graph tags that match their canonical', () => {
  for (const file of ['lablink.html', 'quest-lab-ordering-api.html', 'quest-api-without-account.html']) {
    const html = read(file);
    assert.equal(html.match(/<meta property="og:url" content="([^"]+)">/)?.[1], canonical(html), file);
    assert.match(html, /<meta property="og:title" content="[^"]+">/, file);
    assert.match(html, /<meta property="og:image" content="https:\/\/caregap\.io\/[^"]+">/, file);
  }
});

test('noindex pages stay out of the sitemap', () => {
  const locs = sitemapLocs();
  for (const [file, path] of [['thanks.html', '/thanks'], ['404.html', '/404']]) {
    assert.match(read(file), /<meta name="robots" content="noindex">/, file);
    assert.ok(!locs.includes(SITE + path), `${path} not in sitemap`);
  }
});

test('JSON-LD parses and never carries ratings or reviews', () => {
  for (const page of indexablePages()) {
    const html = read(page.file);
    for (const node of graphNodes(html)) {
      const json = JSON.stringify(node);
      assert.doesNotMatch(json, /aggregateRating|"review"/i, `${page.file} ${node['@type']}`);
    }
  }
});

test('FAQPage markup matches the visible FAQ on each page', () => {
  for (const page of indexablePages()) {
    const html = read(page.file);
    const faq = graphNodes(html).find((n) => n['@type'] === 'FAQPage');
    if (!faq) continue;
    const pageText = toText(html);
    const headings = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => toText(m[1]));
    for (const q of faq.mainEntity) {
      assert.ok(headings.includes(decodeEntities(q.name)), `${page.file}: "${q.name}" is a visible question`);
      const answer = decodeEntities(q.acceptedAnswer.text).replace(/\s+/g, ' ');
      assert.ok(pageText.includes(answer), `${page.file}: answer to "${q.name}" is visible word for word`);
    }
  }
});

test('guides carry a breadcrumb trail that ends at their canonical', () => {
  for (const file of ['quest-lab-ordering-api.html', 'quest-api-without-account.html']) {
    const html = read(file);
    const crumbs = graphNodes(html).find((n) => n['@type'] === 'BreadcrumbList');
    assert.ok(crumbs, `${file} has BreadcrumbList`);
    crumbs.itemListElement.forEach((item, i) => assert.equal(item.position, i + 1));
    assert.equal(crumbs.itemListElement.at(-1).item, canonical(html));
    assert.match(html, /<nav aria-label="Breadcrumb"/, `${file} shows the breadcrumb`);
  }
});
