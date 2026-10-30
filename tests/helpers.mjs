// Shared helpers for the static-site checks. No dependencies: the site is
// plain HTML, so these use small, explicit parsers.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://caregap.io';

export const read = (file) => readFileSync(join(ROOT, file), 'utf8');
export const exists = (file) => existsSync(join(ROOT, file));

export const htmlFiles = () => readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

export const commercial = () => JSON.parse(read('data/lablink-commercial.json'));

// Minimal parser for the [[redirects]] tables in netlify.toml.
export function redirects() {
  const toml = read('netlify.toml');
  return toml
    .split(/^\[\[redirects\]\]\s*$/m)
    .slice(1)
    .map((block) => {
      const rule = {};
      for (const line of block.split('\n')) {
        if (/^\s*\[/.test(line)) break;
        const m = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        const raw = m[2];
        rule[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw === 'true' ? true : raw === 'false' ? false : Number(raw);
      }
      return rule;
    });
}

// Resolves a site path the way Netlify would: an existing file wins,
// otherwise the first matching rule. Returns { status, file, to }.
export function resolvePath(path) {
  const clean = path.split(/[?#]/)[0] || '/';
  const rules = redirects();
  const forced = rules.find((r) => r.force && matches(r.from, clean));
  if (forced) return { status: forced.status, file: forced.to.replace(/^\//, ''), to: forced.to };
  if (clean === '/') return { status: 200, file: 'index.html' };
  const direct = clean.replace(/^\//, '');
  if (direct && exists(direct) && !direct.endsWith('/')) return { status: 200, file: direct };
  const rule = rules.find((r) => matches(r.from, clean));
  if (!rule) return { status: 404, file: null };
  if (rule.status === 200 || rule.status === 404) return { status: rule.status, file: rule.to.replace(/^\//, ''), to: rule.to };
  return { status: rule.status, to: rule.to, file: null };
}

function matches(from, path) {
  if (from.endsWith('/*')) return path.startsWith(from.slice(0, -1)) || path === from.slice(0, -2);
  return from === path || from + '/' === path;
}

export function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&times;/g, 'x')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&middot;/g, '·')
    .replace(/&#10003;/g, '✓')
    .replace(/&copy;/g, '©')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-');
}

export const stripScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

export const toText = (html) => decodeEntities(stripScripts(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Block-level chunks of visible text plus each string in JSON-LD, so a
// check can look at one paragraph or answer at a time.
export function textChunks(html) {
  const visible = stripScripts(html)
    .split(/<\/(?:p|li|h[1-6]|td|th|div|legend|label|option|title)>/i)
    .map((chunk) => toText(chunk))
    .filter(Boolean);
  const head = [...html.matchAll(/<meta[^>]+content="([^"]*)"/gi)].map((m) => decodeEntities(m[1]));
  const ld = jsonLd(html).flatMap((doc) => collectStrings(doc));
  return [...visible, ...head, ...ld];
}

function collectStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
  return [];
}

export function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => JSON.parse(m[1]));
}

export function graphNodes(html) {
  return jsonLd(html).flatMap((doc) => doc['@graph'] || [doc]);
}

export function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

export function tags(html, name) {
  // Script tags are matched in the raw page; everything else ignores
  // script bodies and comments.
  const source = name === 'script' ? html.replace(/<!--[\s\S]*?-->/g, ' ') : stripScripts(html);
  return [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
}

export function anchors(html) {
  return [...stripScripts(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    tag: m[0],
    href: attr(' ' + m[1], 'href'),
    cta: attr(' ' + m[1], 'data-cta'),
    text: toText(m[2])
  }));
}

export function ids(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

export function sitemapLocs() {
  return [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export function canonical(html) {
  const m = html.match(/<link rel="canonical" href="([^"]+)">/);
  return m ? m[1] : null;
}

// Pages that are published and indexable: everything in the sitemap.
export function indexablePages() {
  return sitemapLocs().map((loc) => {
    const path = loc.replace(SITE, '') || '/';
    return { loc, path, file: resolvePath(path).file };
  });
}

// Public text a visitor or crawler can read.
export function publicTextFiles() {
  return [...htmlFiles(), 'llms.txt'];
}
