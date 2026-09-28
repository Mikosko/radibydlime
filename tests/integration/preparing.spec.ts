import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { root } from '../helpers/astro-build.ts';

test('public homepage is a static preparation page with contact and preserved preview', async () => {
  const html = await readFile(join(root, 'dist/index.html'), 'utf8');
  const notFound = await readFile(join(root, 'dist/404.html'), 'utf8');
  assert.equal(notFound, html);
  assert.match(html, /I náš web potřebuje/);
  assert.match(html, /href="mailto:info@radibydlime.cz"/);
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
  assert.match(html, /data-brand-mark/);
  assert.doesNotMatch(html, /<site-navigation|<form|<astro-island/);
  const preview = await readFile(join(root, 'dist/nahled/index.html'), 'utf8');
  assert.match(preview, /Jak začala obnova našeho domu/);
});
