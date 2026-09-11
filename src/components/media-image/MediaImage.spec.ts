import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { build, withFixture } from '../../../tests/helpers/astro-build.ts';
import { resolveMedia, validateCatalog } from '../../content/media/schema.ts';

const id = 'media-0f87f1a9-7c74-4fa9-a33f-5085ef224ce0';
const record = {
  id,
  path: `/images/${id}/dvere.webp`,
  mimeType: 'image/webp',
  width: 1600,
  height: 1200,
  alt: 'Dveře & rám "před" <opravou>.',
  sha256: 'a'.repeat(64),
};

function page(body: string, setup = '') {
  return `---
import MediaImage from '../components/media-image/MediaImage.astro';
import { getMediaCatalog } from '../content/media/query';
const catalog = await getMediaCatalog();
const mediaId = '${id}';
${setup}
---
${body}`;
}

async function fixturePage(directory: string, body: string, setup = '') {
  await writeFile(
    join(directory, `src/content/media/${id}.json`),
    JSON.stringify(record),
  );
  await writeFile(
    join(directory, 'src/pages/media-fixture.astro'),
    page(body, setup),
  );
}

function attributes(image: string) {
  return Object.fromEntries(
    [
      ...image
        .replace(/^.*?<img\b/s, '')
        .slice(0, -1)
        .matchAll(/([\w:.-]+)(?:="([^"]*)")?/g),
    ].map(([, name, value]) => [name, value ?? '']),
  );
}

test('renders only a native image with canonical escaped metadata and native defaults, offline', async () => {
  await withFixture(async (directory) => {
    await fixturePage(directory, '<MediaImage {mediaId} {catalog} />');
    await build(directory);
    const html = (
      await readFile(join(directory, 'dist/media-fixture/index.html'), 'utf8')
    ).trim();
    assert.match(html, /^<!DOCTYPE html><img\b(?:[^">]|"[^"]*")*>$/);
    const attrs = attributes(html);
    const catalog = validateCatalog([{ source: `${id}.json`, data: record }]);
    assert.deepEqual(attrs, {
      src: resolveMedia(id, catalog, 'test').src,
      width: '1600',
      height: '1200',
      alt: 'Dveře &amp; rám &quot;před&quot; <opravou>.',
      loading: 'lazy',
      decoding: 'async',
    });
    const assets = await readdir(join(directory, 'dist/_astro'));
    assert.ok(
      assets.every((name) => !name.endsWith('.webp') && !name.endsWith('.js')),
    );
  });
});

test('honors native controls, decoration and caller styling without permitting metadata overrides', async () => {
  await withFixture(async (directory) => {
    await fixturePage(
      directory,
      `
<MediaImage {mediaId} {catalog} {...attemptedOverrides}
  id="styled" class="caller" class:list={['extra', { selected: true, absent: false }]}
  style={{ 'object-fit': 'contain', width: '100%' }}
  data-note={'"<&'} aria-describedby="caption"
  sizes="(max-width: 640px) 100vw, 50vw" loading="eager" decoding="sync" fetchpriority="high" />
<MediaImage {mediaId} {catalog} id="decorative" decorative loading="lazy" decoding="auto" fetchpriority="low" />
<MediaImage {mediaId} {catalog} id="informative" fetchpriority="auto" />
<output>{JSON.stringify([...catalog.values()]) === before ? 'catalog unchanged' : 'catalog mutated'}</output>
<style>.caller { object-position: 25% 50%; }</style>`,
      `
const before = JSON.stringify([...catalog.values()]);
const attemptedOverrides = {
  src: 'https://wrong.invalid/image.jpg', srcset: 'wrong.webp 1600w',
  width: 1, height: 2, alt: 'Wrong alt', 'aria-label': 'Wrong name', onerror: 'alert(1)',
};`,
    );
    await build(directory);
    const html = await readFile(
      join(directory, 'dist/media-fixture/index.html'),
      'utf8',
    );
    const images = [...html.matchAll(/<img\b(?:[^">]|"[^"]*")*>/g)].map(
      ([image]) => attributes(image),
    );
    assert.equal(images.length, 3);
    const [styled, decorative, informative] = images;
    assert.equal(styled.id, 'styled');
    for (const name of ['caller', 'extra', 'selected'])
      assert.ok(styled.class.split(' ').includes(name));
    assert.ok(!styled.class.split(' ').includes('absent'));
    assert.match(styled.style, /object-fit:contain/);
    assert.match(styled.style, /width:100%/);
    assert.equal(styled['data-note'], '&quot;<&amp;');
    assert.equal(styled['aria-describedby'], 'caption');
    assert.equal(styled.sizes, '(max-width: 640px) 100vw, 50vw');
    assert.equal(styled.loading, 'eager');
    assert.equal(styled.decoding, 'sync');
    assert.equal(styled.fetchpriority, 'high');
    const scope = /data-astro-cid-[\w]+/.exec(html)?.[0];
    assert.ok(scope, 'Caller scoped styles must reach the underlying image');
    assert.ok(html.match(/<img\b(?:[^">]|"[^"]*")*>/)?.[0].includes(scope));
    assert.equal(decorative.alt, '');
    assert.equal(decorative.loading, 'lazy');
    assert.equal(decorative.decoding, 'auto');
    assert.equal(decorative.fetchpriority, 'low');
    assert.equal(informative.fetchpriority, 'auto');
    assert.equal(styled.alt, informative.alt);
    assert.match(html, /catalog unchanged/);
    assert.doesNotMatch(
      html,
      /wrong\.invalid|wrong.webp|Wrong alt|Wrong name|onerror=|<script|astro-island/,
    );
    for (const image of images) {
      assert.equal(image.width, '1600');
      assert.equal(image.height, '1200');
      assert.ok(image.src.endsWith(record.path));
      assert.ok(!('srcset' in image));
    }
  });
});

for (const reference of [
  'not-a-media-id',
  'media-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
]) {
  for (const decorative of [false, true]) {
    test(`rejects ${reference} outside Project rendering, decorative=${decorative}`, async () => {
      await withFixture(async (directory) => {
        await fixturePage(
          directory,
          `<MediaImage mediaId="${reference}" {catalog} decorative={${decorative}} />`,
        );
        await assert.rejects(build(directory), (error: unknown) => {
          const output = error as { stdout?: string; stderr?: string };
          assert.match(
            `${output.stdout}\n${output.stderr}`,
            new RegExp(
              `(?:Invalid|Unknown) media ID ${reference} in MediaImage on /media-fixture`,
            ),
          );
          return true;
        });
      });
    });
  }
}
