import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { root } from '../helpers/astro-build.ts';

test('business-card workspace is noindexed and has both printable sides and independent guides', async () => {
  for (const version of ['v1', 'v2']) {
    const html = await readFile(
      join(root, `dist/media/vizitky/jitka-rajnoskova/${version}/index.html`),
      'utf8',
    );
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
    assert.match(html, /Jitka Rajnošková/);
    assert.doesNotMatch(
      html,
      /name="design"|id="design-natural"|id="design-rose"/,
    );
    assert.equal((html.match(/class="business-card /g) ?? []).length, 2);
    assert.match(
      html,
      version === 'v1'
        ? /class="[^"]*sides[^"]*natural/
        : /class="[^"]*sides[^"]*rose/,
    );
    assert.match(html, /id="transparent-bg"/);
    assert.equal((html.match(/name="texture"/g) ?? []).length, 5);
    assert.doesNotMatch(html, /id="watercolor-layer"/);
    assert.match(html, /data-fullscreen/);
    assert.match(html, /data-preview-stage/);
    assert.equal((html.match(/name="paper"/g) ?? []).length, 12);
    assert.match(html, /width="256"/);
    assert.match(html, /aria-label="Přední strana"/);
    assert.match(html, /aria-label="Zadní strana"/);
    for (const guide of ['safe', 'trim', 'round'])
      assert.match(html, new RegExp(`id="${guide}-guide" type="checkbox"`));
    assert.match(html, /href="mailto:info@radibydlime.cz"/);
    assert.match(html, /href="tel:\+420733725608"/);
    assert.doesNotMatch(html, /<site-navigation/);
  }
  const original = await readFile(
    join(root, 'dist/media/vizitky/jitka-rajnoskova/index.html'),
    'utf8',
  );
  assert.match(original, /http-equiv="refresh"/i);
  assert.match(original, /url=\/media\/vizitky\/jitka-rajnoskova\/v2\//);
  const home = await readFile(join(root, 'dist/index.html'), 'utf8');
  assert.doesNotMatch(home, /name="robots" content="noindex/);
});
