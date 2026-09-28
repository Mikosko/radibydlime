import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { root } from '../helpers/astro-build.ts';

test('preserved illustrated 404 preview has a fallback and four matching random scenes', async () => {
  const html = await readFile(join(root, 'dist/nahled/404/index.html'), 'utf8');
  assert.match(html, /Stránka nenalezena/);
  assert.match(html, /Tahle vrátka nikam nevedou/);
  assert.match(html, /href="\/"/);
  assert.match(html, /href="\/kapitoly\/"/);
  const encoded = html.match(/data-scenes="([^"]+)"/)![1];
  const scenes = JSON.parse(
    encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'),
  );
  assert.equal(scenes.length, 4);
  assert.equal(
    new Set(scenes.map((scene: { src: string }) => scene.src)).size,
    4,
  );
  const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((script) => script.includes('Math.random()'))!;
  assert.ok(script);
  for (let index = 0; index < 4; index++) {
    const image: Record<string, unknown> = {};
    const title: Record<string, unknown> = {};
    const note: Record<string, unknown> = {};
    const section = {
      dataset: { scenes: JSON.stringify(scenes) },
      querySelector: (selector: string) =>
        selector === '[data-scene-image]'
          ? image
          : selector === '[data-scene-title]'
            ? title
            : note,
    };
    runInNewContext(script, {
      document: { querySelector: () => section },
      Math: { random: () => (index + 0.5) / 4, floor: Math.floor },
    });
    assert.equal(image.src, scenes[index].src);
    assert.equal(title.textContent, scenes[index].title);
    assert.equal(note.textContent, scenes[index].note);
    assert.ok(Number(image.width) > 0 && Number(image.height) > 0);
    assert.ok(scenes[index].src.startsWith('/_astro/'));
    await access(join(root, 'dist', scenes[index].src));
  }
});
