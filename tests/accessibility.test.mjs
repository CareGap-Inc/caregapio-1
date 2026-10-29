import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, htmlFiles, tags, attr, toText, stripScripts } from './helpers.mjs';

test('every page declares its language and has exactly one h1', () => {
  for (const file of htmlFiles()) {
    const html = read(file);
    assert.match(html, /<html lang="en">/, file);
    assert.equal(tags(html, 'h1').length, 1, `${file} h1 count`);
  }
});

test('every image has alt text', () => {
  for (const file of htmlFiles()) {
    for (const img of tags(read(file), 'img')) {
      assert.ok(attr(img, 'alt'), `${file}: ${img.slice(0, 120)}`);
    }
  }
});

test('every button has an accessible name', () => {
  for (const file of htmlFiles()) {
    const html = stripScripts(read(file));
    for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      assert.ok(attr(' ' + m[1], 'aria-label') || toText(m[2]), `${file}: ${m[0].slice(0, 120)}`);
    }
  }
});

test('every form control has a label', () => {
  for (const file of htmlFiles()) {
    const html = read(file);
    const labelled = new Set([...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
    const controls = [...tags(html, 'input'), ...tags(html, 'select'), ...tags(html, 'textarea')];
    for (const control of controls) {
      if (attr(control, 'type') === 'hidden' || attr(control, 'name') === 'bot-field') continue;
      const id = attr(control, 'id');
      const wrapped = id === null && /<label[^>]*>[^<]*<input/.test(html);
      assert.ok((id && labelled.has(id)) || attr(control, 'aria-label') || wrapped, `${file}: ${control.slice(0, 120)}`);
    }
  }
});

test('required fields are marked in their label', () => {
  for (const file of htmlFiles()) {
    const html = read(file);
    for (const control of [...tags(html, 'input'), ...tags(html, 'select')]) {
      if (!/\srequired(\s|>|=)/.test(control)) continue;
      const id = attr(control, 'id');
      const label = html.match(new RegExp(`<label for="${id}"[^>]*>([\\s\\S]*?)</label>`))?.[1] ?? '';
      assert.match(label, /\*/, `${file}: #${id} is required but its label does not say so`);
    }
  }
});

test('the contact form asks for no more than company, name and email', () => {
  const html = read('lablink.html');
  const form = html.slice(html.indexOf('<form'), html.indexOf('</form>'));
  const required = [...form.matchAll(/<(?:input|select|textarea)[^>]*\sid="([^"]+)"[^>]*\srequired/g)].map((m) => m[1]);
  assert.deepEqual(required.sort(), ['company', 'email', 'name']);
});

test('data tables have header cells', () => {
  for (const file of htmlFiles()) {
    for (const table of read(file).match(/<table[\s\S]*?<\/table>/g) ?? []) {
      assert.match(table, /<th\b/, file);
    }
  }
});

test('links have text or an accessible name', () => {
  for (const file of htmlFiles()) {
    const html = stripScripts(read(file));
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const hasImgAlt = /<img[^>]+alt="[^"]+"/.test(m[2]);
      assert.ok(toText(m[2]) || hasImgAlt || attr(' ' + m[1], 'aria-label'), `${file}: ${m[0].slice(0, 120)}`);
    }
  }
});
