import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { root, build, withFixture } from '../../tests/helpers/astro-build.ts';

// Exact assets whose Czech cmap and rendered glyphs were reviewed; see font README.
const inspectedAssets: Record<string, string> = {
  'display-400.woff2':
    'd9eb185ec4ecd584bd963d3585fa07e741645b84e6e455984fd4dd210b9c7802',
  'body-400-600.woff2':
    'bbe8e6d1dd96d1bb56c8accc112b75469390a829cbdeb50081efb1b0a92ba954',
  'body-italic-400.woff2':
    '6f0c5439b167265d56a4619fc2490d97ee6be57545489b72de530b5d65fe7017',
  'annotation-400.woff2':
    '57e322b7dba1542a66ac2c483fef420dc2d4f69a4290addc23900f95b33b294d',
  'editorial-note-400.woff2':
    'e02afb71b3accb3a56b00926d929b71d6fc9d4b4fb61bfb5fd2ceaad472d2f6d',
};

test('committed fonts match the licensed, glyph-inspected WOFF2 inventory', async () => {
  const directory = join(root, 'src/assets/fonts');
  assert.deepEqual(
    (await readdir(directory)).filter((name) => name.endsWith('.woff2')).sort(),
    Object.keys(inspectedAssets).sort(),
  );
  for (const [name, hash] of Object.entries(inspectedAssets)) {
    const data = await readFile(join(directory, name));
    assert.equal(data.toString('ascii', 0, 4), 'wOF2');
    assert.equal(
      createHash('sha256').update(data).digest('hex'),
      hash,
      `${name}: changed asset needs glyph/license review`,
    );
  }
  for (const name of [
    'cormorantgaramond-OFL.txt',
    'sourceserif4-OFL.txt',
    'allura-OFL.txt',
    'specialelite-LICENSE.txt',
  ]) {
    assert.ok((await readFile(join(directory, name), 'utf8')).length > 1000);
  }
});

test('offline Astro output serves semantic typography and matching critical preloads from local assets', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, 'src/pages/typography.astro'),
      `---
import SiteLayout from '../layouts/site/SiteLayout.astro';
---
<SiteLayout title="Typografie" description="Ověření české typografie">
  <h1 class="font-display">Příliš žluťoučký kůň</h1>
  <p class="font-body">Čtení <strong class="font-semibold">důležité</strong> <em>poznámky</em>.</p>
  <p class="font-annotation">Rádi bydlíme</p>
  <p class="font-editorial-note">Září 2026</p>
  <p class="font-body" data-note-fallback>Ǎ — poznámka mimo znakovou sadu akcentu</p>
</SiteLayout>`,
    );
    await build(directory);
    const html = await readFile(
      join(directory, 'dist/typography/index.html'),
      'utf8',
    );
    assert.doesNotMatch(
      html,
      /<script|astro-island|fonts.googleapis|fonts.gstatic/,
    );
    const styles = [
      ...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g),
    ].map((match) => match[1]);
    assert.ok(styles.length > 0);
    const css = (
      await Promise.all(
        styles.map((path) => readFile(join(directory, 'dist', path), 'utf8')),
      )
    ).join('\n');
    const faces = (css.match(/@font-face\s*\{[^}]+\}/g) ?? []).filter((face) =>
      /url\(/.test(face),
    );
    assert.equal(faces.length, 5);
    const urls = faces.flatMap((face) => {
      assert.match(face, /font-display:\s*swap/);
      assert.doesNotMatch(face, /https?:|data:/);
      return [...face.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)].map(
        (match) => match[1],
      );
    });
    assert.equal(new Set(urls).size, 5);
    for (const url of urls)
      assert.equal(
        (await readFile(join(directory, 'dist', url))).toString('ascii', 0, 4),
        'wOF2',
      );
    assert.ok(
      faces.some(
        (face) =>
          /font-weight:\s*400 600/.test(face) && /Radi Reading/.test(face),
      ),
    );
    assert.ok(
      faces.some(
        (face) =>
          /font-style:\s*italic/.test(face) && /Radi Reading/.test(face),
      ),
    );
    for (const role of [
      'font-body',
      'font-display',
      'font-annotation',
      'font-editorial-note',
    ])
      assert.ok(css.includes('.' + role));
    assert.match(css, /font-synthesis:\s*none/);
    assert.match(html, /class="font-body" data-note-fallback/);
    for (const page of [
      'index.html',
      'projekty/druhy-zivot-starych-dveri/index.html',
      'typography/index.html',
    ]) {
      const output = await readFile(join(directory, 'dist', page), 'utf8');
      const preloads = (output.match(/<link\b[^>]*>/g) ?? []).filter((tag) =>
        tag.includes('rel="preload"'),
      );
      assert.equal(preloads.length, 2);
      for (const tag of preloads) {
        assert.match(tag, /as="font"/);
        assert.match(tag, /type="font\/woff2"/);
        assert.match(tag, /crossorigin/);
        const url = /href="([^"]+)"/.exec(tag)?.[1];
        assert.ok(url && urls.includes(url));
        assert.match(url, /(?:body-400-600|display-400)/);
      }
    }
  });
});
