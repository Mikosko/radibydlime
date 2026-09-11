import assert from 'node:assert/strict';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { root, withFixture, build } from '../helpers/astro-build.ts';

const samplePath = 'src/content/projects/entrance-door.mdoc';
const projectRoute = 'projekty/druhy-zivot-starych-dveri/index.html';
// Keep local-image coverage independent of the image selected in authored content.
const sample = (await readFile(join(root, samplePath), 'utf8')).replace(
  /hero:\n[\s\S]*?\n---/,
  `hero:
  src: ../../assets/entrance-door.svg
  alt: Ilustrace zelených dveří.
  caption: Ilustrace k ukázkovému projektu.
---`,
);

test('production site configuration uses the custom domain at the URL root', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, 'src/pages/site.txt.ts'),
      "export function GET({ site }) { return new Response(site?.href ?? ''); }\n",
    );
    await build(directory);

    assert.equal(
      await readFile(join(directory, 'dist/site.txt'), 'utf8'),
      'https://www.radibydlime.cz/',
    );
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    assert.match(home, /href="\/projekty\/druhy-zivot-starych-dveri\/"/);
    assert.match(home, /(?:href|src)="\/_astro\//);
    assert.doesNotMatch(home, /\/radibydlime\//);
  });
});

test('published pages render Czech metadata, Markdoc, navigation, and local images without scripts', async () => {
  await withFixture(async (directory) => {
    await writeFile(join(directory, samplePath), sample);
    await build(directory);
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    const project = await readFile(
      join(directory, 'dist', projectRoute),
      'utf8',
    );
    assert.match(home, /href="\/projekty\/druhy-zivot-starych-dveri\/"/);
    assert.match(home, /Druhý život starých dveří/);
    assert.match(project, /<strong>ukázkový zápis<\/strong>/);
    assert.match(project, /<blockquote>/);
    assert.match(project, /<h2[^>]*>.*Nejdřív poznat, potom opravovat/);
    assert.match(project, /Ilustrace k ukázkovému projektu/);

    for (const html of [home, project]) {
      assert.match(html, /<html lang="cs">/);
      assert.match(html, /<meta name="description" content="[^"]+"/);
      assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
      assert.match(html, /href="#obsah"/);
      assert.match(html, /<main id="obsah"/);
      assert.doesNotMatch(html, /<script[\s>]|<astro-island[\s>]/);
      const images = [...html.matchAll(/<img\b[^>]*>/g)];
      assert.ok(images.length > 0);
      for (const [image] of images) {
        assert.match(image, /alt="[^"]+"/);
        assert.match(image, /width="\d+"/);
        assert.match(image, /height="\d+"/);
        const source = /src="([^"]+)"/.exec(image)?.[1];
        assert.ok(source, 'Expected an image source');
        assert.ok(
          source.startsWith('/_astro/'),
          `Expected a built local image: ${source}`,
        );
        assert.ok((await stat(join(directory, 'dist', source))).isFile());
      }
    }
  });
});

test('renaming the file and localized slug preserves the canonical collection identity', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, samplePath),
      sample.replace('slug: druhy-zivot-starych-dveri', 'slug: obnova-dveri'),
    );
    await rename(
      join(directory, samplePath),
      join(directory, 'src/content/projects/renamed.mdoc'),
    );
    // A fixture-only endpoint observes the real typed collection, not a copy of its parser.
    await writeFile(
      join(directory, 'src/pages/identity.txt.ts'),
      "import { getCollection } from 'astro:content';\nexport async function GET() { return new Response((await getCollection('projects'))[0].data.id); }\n",
    );
    await build(directory);
    assert.equal(
      await readFile(join(directory, 'dist/identity.txt'), 'utf8'),
      'project-0001',
    );
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    assert.match(home, /href="\/projekty\/obnova-dveri\/"/);
    assert.ok(
      (
        await stat(join(directory, 'dist/projekty/obnova-dveri/index.html'))
      ).isFile(),
    );
    await assert.rejects(stat(join(directory, 'dist', projectRoute)), {
      code: 'ENOENT',
    });
  });
});

test('draft and archived Projects have no public listing, narrative, or detail route', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, samplePath),
      sample.replace('status: published', 'status: draft'),
    );
    await writeFile(
      join(directory, 'src/content/projects/archived.mdoc'),
      sample
        .replace('project-0001', 'project-0002')
        .replace('slug: druhy-zivot-starych-dveri', 'slug: archivovany-projekt')
        .replace('status: published', 'status: archived'),
    );
    await build(directory);
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    assert.match(home, /První příběhy právě chystáme/);
    assert.doesNotMatch(
      home,
      /Druhý život starých dveří|Nejdřív poznat|archivovany-projekt/,
    );
    await assert.rejects(stat(join(directory, 'dist', projectRoute)), {
      code: 'ENOENT',
    });
    await assert.rejects(
      stat(join(directory, 'dist/projekty/archivovany-projekt/index.html')),
      { code: 'ENOENT' },
    );
  });
});

const invalidCases = [
  {
    name: 'duplicate canonical IDs even when the second entry is a draft',
    path: 'src/content/projects/duplicate.mdoc',
    content: sample
      .replace('slug: druhy-zivot-starych-dveri', 'slug: jiny-projekt')
      .replace('status: published', 'status: draft'),
    diagnostic: /Duplicate Project ID: project-0001/,
  },
  {
    name: 'duplicate localized slugs',
    path: 'src/content/projects/duplicate.mdoc',
    content: sample.replace('project-0001', 'project-0002'),
    diagnostic: /Duplicate Project slug: druhy-zivot-starych-dveri/,
  },
  {
    name: 'malformed required metadata',
    path: samplePath,
    content: sample.replace('title: Druhý život starých dveří', 'title: ""'),
    diagnostic: /title/,
  },
  {
    name: 'missing local image references',
    path: samplePath,
    content: sample.replace('entrance-door.svg', 'missing-image.svg'),
    diagnostic: /missing-image\.svg/,
  },
  {
    name: 'missing informative image alt text',
    path: samplePath,
    content: sample.replace(/  alt: .+/, '  alt: ""'),
    diagnostic: /alt/,
  },
  {
    name: 'unsupported Markdoc tags',
    path: samplePath,
    content: sample + '\n{% unsupported /%}\n',
    diagnostic: /Undefined tag.*unsupported/,
  },
];

for (const invalid of invalidCases) {
  test(`build rejects ${invalid.name}`, async () => {
    await withFixture(async (directory) => {
      const path = join(directory, invalid.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, invalid.content);
      await assert.rejects(build(directory), (error: unknown) => {
        assert.ok(error instanceof Error);
        const result = error as Error & { stdout?: string; stderr?: string };
        assert.match(`${result.stdout}\n${result.stderr}`, invalid.diagnostic);
        return true;
      });
    });
  });
}

const mediaId = 'media-0f87f1a9-7c74-4fa9-a33f-5085ef224ce0';
const mediaRecord = {
  id: mediaId,
  path: `/images/${mediaId}/dvere.webp`,
  mimeType: 'image/webp',
  width: 1600,
  height: 1200,
  alt: 'Obnovené vstupní dveře.',
  caption: 'Katalogový popisek.',
  credit: 'Rodinný archiv',
  sha256: 'a'.repeat(64),
};
const withMediaHero = sample.replace(
  /hero:\n[\s\S]*?\n---/,
  `hero:\n  mediaId: ${mediaId}\n---`,
);

test('removing the last media record invalidates references even with an existing content cache', async () => {
  await withFixture(async (directory) => {
    const path = join(directory, `src/content/media/${mediaId}.json`);
    await writeFile(path, JSON.stringify(mediaRecord));
    await writeFile(join(directory, samplePath), withMediaHero);
    await build(directory);
    await rm(path);
    await assert.rejects(build(directory), (error: unknown) => {
      const output = error as { stdout?: string; stderr?: string };
      assert.match(`${output.stdout}\n${output.stderr}`, /Unknown media ID/);
      return true;
    });
  });
});

test('media IDs resolve to static public images and catalog metadata without fetching image bytes', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, `src/content/media/${mediaId}.json`),
      JSON.stringify(mediaRecord),
    );
    await writeFile(join(directory, samplePath), withMediaHero);
    // This fixture path intentionally has no uploaded bytes. Building must remain offline.
    await build(directory);
    for (const page of ['index.html', projectRoute]) {
      const html = await readFile(join(directory, 'dist', page), 'utf8');
      assert.ok(
        html.includes(`src="https://media.radibydlime.cz${mediaRecord.path}"`),
      );
      assert.match(html, /width="1600"/);
      assert.match(html, /decoding="async"/);
      assert.match(
        html,
        page === 'index.html' ? /loading="lazy"/ : /loading="eager"/,
      );
      assert.match(
        html,
        page === 'index.html'
          ? /class="aspect-4\/3 w-full rounded-sm object-cover"/
          : /class="max-h-144 w-full rounded-sm object-cover"/,
      );
      assert.match(html, /height="1200"/);
      assert.match(html, /alt="Obnovené vstupní dveře\."/);
      assert.doesNotMatch(
        html,
        /<script[\s>]|<astro-island[\s>]|localhost:11434|scripts\/media/,
      );
    }
    const detail = await readFile(
      join(directory, 'dist', projectRoute),
      'utf8',
    );
    assert.match(detail, /Katalogový popisek/);
    assert.match(detail, /Rodinný archiv/);
  });
});

for (const status of ['published', 'draft', 'archived'])
  test(`unknown media ID fails even for ${status} Project`, async () => {
    await withFixture(async (directory) => {
      await writeFile(
        join(directory, samplePath),
        withMediaHero.replace('status: published', `status: ${status}`),
      );
      await assert.rejects(build(directory), (error: unknown) => {
        const output = error as { stdout?: string; stderr?: string };
        assert.match(
          `${output.stdout}\n${output.stderr}`,
          new RegExp(`Unknown media ID ${mediaId}.*project-0001`),
        );
        return true;
      });
    });
  });

for (const scenario of [
  'unused-invalid',
  'duplicate',
  'filename',
  'mixed-hero',
])
  test(`media build rejects ${scenario}`, async () => {
    await withFixture(async (directory) => {
      if (scenario === 'unused-invalid')
        await writeFile(
          join(directory, `src/content/media/${mediaId}.json`),
          JSON.stringify({ ...mediaRecord, width: 0, GPSLatitude: 50 }),
        );
      if (scenario === 'duplicate') {
        await writeFile(
          join(directory, `src/content/media/${mediaId}.json`),
          JSON.stringify(mediaRecord),
        );
        await writeFile(
          join(directory, 'src/content/media/z-duplicate.json'),
          JSON.stringify(mediaRecord),
        );
      }
      if (scenario === 'filename')
        await writeFile(
          join(directory, 'src/content/media/wrong.json'),
          JSON.stringify(mediaRecord),
        );
      if (scenario === 'mixed-hero')
        await writeFile(
          join(directory, samplePath),
          sample.replace('hero:\n', `hero:\n  mediaId: ${mediaId}\n`),
        );
      await assert.rejects(build(directory), (error: unknown) => {
        const output = error as { stdout?: string; stderr?: string };
        assert.match(`${output.stdout}\n${output.stderr}`, /media|Media|hero/);
        return true;
      });
    });
  });
