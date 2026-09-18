import assert from 'node:assert/strict';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { root, withFixture, build } from '../helpers/astro-build.ts';

const samplePath = 'src/content/projects/entrance-door.mdoc';
const projectRoute = 'projekty/jak-zacala-obnova-naseho-domu/index.html';
// Keep local-image coverage independent of the image selected in authored content.
const sample = (await readFile(join(root, samplePath), 'utf8')).replace(
  /hero:\n(?:  .+\n)+(?=galleryId:|---)/,
  `hero:
  src: ../../assets/entrance-door.svg
  alt: Ilustrace zelených dveří.
  caption: Ilustrace k ukázkovému projektu.
`,
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
    assert.match(home, /href="\/projekty\/jak-zacala-obnova-naseho-domu\/"/);
    assert.match(home, /(?:href|src)="\/_astro\//);
    assert.doesNotMatch(home, /\/radibydlime\//);
  });
});

test('published pages render Czech metadata, Markdoc, navigation, and local images', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, samplePath),
      `${sample}

{% article-image mediaId="media-308b7c8b-113d-4fa8-9351-f3bd8d32292c" /%}

{% article-section mediaId="media-308b7c8b-113d-4fa8-9351-f3bd8d32292c" side="left" %}
Text beside a photograph.
{% /article-section %}

{% article-section decoration="construction-hammer" side="right" %}
Text beside an ornament.
{% /article-section %}
`,
    );
    await build(directory);
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    const chapters = await readFile(
      join(directory, 'dist/kapitoly/index.html'),
      'utf8',
    );
    const project = await readFile(
      join(directory, 'dist', projectRoute),
      'utf8',
    );
    assert.match(home, /href="\/kapitoly\/"/);
    assert.match(home, /href="\/projekty\/jak-zacala-obnova-naseho-domu\/"/);
    assert.match(home, /Jak začala obnova našeho domu/);
    assert.match(chapters, /<h1[^>]*>\s*Kapitoly\s*<\/h1>/);
    assert.match(chapters, /href="\/kapitoly\/" aria-current="page"/);
    assert.match(chapters, /Anna Novotná/);
    assert.match(chapters, /Jan Novotný/);
    for (const slug of [
      'jak-zacala-obnova-naseho-domu',
      'oprava-starych-stropnich-tramu',
      'prvni-rok-kuchynske-zahrady',
    ]) {
      assert.match(chapters, new RegExp(`href="/projekty/${slug}/"`));
    }
    assert.ok(
      chapters.indexOf('Jak začala obnova našeho domu') <
        chapters.indexOf('Jak jsme opravili staré stropní trámy'),
    );
    assert.match(project, /href="\/kapitoly\/"/);
    assert.match(project, /<strong>Tento ukázkový zápis<\/strong>/);
    assert.match(project, /<blockquote>/);
    assert.match(project, /<h2[^>]*>.*Nejdřív naslouchat domu/);
    assert.match(project, /aria-label="Obsah článku"/);
    assert.match(project, /href="#nejdřív-naslouchat-domu"/);
    assert.match(project, />Kapitoly<\/span>/);
    assert.match(project, /Obnova domu/);
    assert.match(project, /aria-label="Práce s článkem"/);
    assert.match(project, /data-article-id="project-0001"/);
    assert.match(project, /data-favorite-button/);
    assert.match(project, /aria-pressed="false"/);
    assert.match(project, /data-share-button/);
    assert.match(project, /data-read-later-button/);
    assert.match(project, /aria-labelledby="author-author-sample"/);
    assert.match(project, /id="author-author-sample"/);
    assert.match(project, /O autorce/);
    assert.match(project, /Anna Novotná/);
    assert.match(project, /article-section--visual-right/);
    assert.match(project, /Text beside a photograph/);
    assert.match(project, /Text beside an ornament/);
    assert.match(project, /construction-hammer\.[^" ]+\.webp/);
    assert.match(project, /https:\/\/media\.radibydlime\.cz\/images\//);
    assert.match(project, /author-leaf-sprig\.[^" ]+\.webp/);
    assert.doesNotMatch(project, /construction-house\.[^" ]+\.webp/);
    assert.match(project, /Ilustrace k ukázkovému projektu/);
    assert.match(project, /Obrazový deník/);
    assert.match(project, /data-article-gallery/);
    assert.match(project, /data-gallery-open="0"/);
    assert.match(project, /data-gallery-dialog="0"/);
    assert.match(project, /data-gallery-step="-1"/);
    assert.match(project, /data-gallery-step="1"/);
    assert.match(project, /Zavřít fotografii/);
    assert.match(project, /Detail ruční práce při obnově původního dřeva/);
    assert.match(project, /Dům a zahrada postupně dostávají nový rytmus/);
    assert.match(project, /Krajina je náš domov/);
    assert.match(project, /aria-label="Další projekty"/);
    assert.match(
      project,
      /href="\/projekty\/oprava-starych-stropnich-tramu\/"/,
    );
    const gardenProject = await readFile(
      join(directory, 'dist/projekty/prvni-rok-kuchynske-zahrady/index.html'),
      'utf8',
    );
    assert.match(gardenProject, /Zahrada/);
    const timberProject = await readFile(
      join(
        directory,
        'dist/projekty/oprava-starych-stropnich-tramu/index.html',
      ),
      'utf8',
    );
    assert.match(timberProject, /aria-labelledby="author-author-jan"/);
    assert.match(timberProject, /O autorovi/);
    assert.match(timberProject, />Jan Novotný<\/h3>/);
    assert.match(timberProject, /construction-house\.[^" ]+\.webp/);
    assert.doesNotMatch(timberProject, /author-leaf-sprig\.[^" ]+\.webp/);

    assert.doesNotMatch(home, /<script[\s>]|<astro-island[\s>]/);
    assert.doesNotMatch(chapters, /<script[\s>]|<astro-island[\s>]/);
    assert.match(project, /<script type="module">/);
    assert.match(project, /radibydlime:article-preferences/);
    assert.doesNotMatch(project, /<astro-island[\s>]/);

    for (const html of [home, chapters, project]) {
      assert.match(html, /<html lang="cs">/);
      assert.match(html, /<meta name="description" content="[^"]+"/);
      assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
      assert.match(html, /href="#obsah"/);
      assert.match(html, /<main id="obsah"/);
      assert.match(html, /<nav aria-label="Hlavní navigace"/);
      for (const label of [
        'Úvod',
        'Náš příběh',
        'Kapitoly',
        'Galerie',
        'Dílny',
        'Inzerce',
        'Kontakt',
      ]) {
        assert.match(html, new RegExp(`>${label}<`));
      }
      assert.match(html, /aria-label="Rádi bydlíme — úvod"/);
      assert.match(html, /data-brand-mark="stacked"/);
      assert.match(html, /data-brand-mark="inline"/);
      if (html === home) {
        assert.match(html, /aria-labelledby="budte-u-toho"/);
        assert.doesNotMatch(html, /aria-labelledby="co-u-nas-najdete"/);
      } else {
        assert.match(html, /aria-labelledby="co-u-nas-najdete"/);
        assert.match(html, /Co u nás najdete\?/);
      }
      assert.match(html, /© \d{4} Rádi bydlíme/);
      assert.match(html, /<nav aria-label="Navigace v zápatí"/);
      for (const social of [
        'Instagram',
        'Facebook',
        'TikTok',
        'Pinterest',
        'YouTube',
      ]) {
        assert.match(
          html,
          new RegExp(`aria-label="${social} — odkaz připravujeme"`),
        );
      }
      for (const platform of [
        'instagram',
        'facebook',
        'tiktok',
        'pinterest',
        'youtube',
      ]) {
        assert.match(html, new RegExp(`data-social-icon="${platform}"`));
      }
      const images = [...html.matchAll(/<img\b[^>]*>/g)];
      assert.ok(images.length > 0);
      for (const [image] of images) {
        const alt = /\salt(?:="([^"]*)")?(?=\s|>)/.exec(image);
        assert.ok(alt, 'Expected an explicit alt attribute');
        if (/\saria-hidden="true"/.test(image)) {
          assert.equal(alt[1] ?? '', '');
        } else {
          assert.ok(alt[1], 'Expected informative images to have alt text');
        }
        assert.match(image, /width="\d+"/);
        assert.match(image, /height="\d+"/);
        const source = /src="([^"]+)"/.exec(image)?.[1];
        assert.ok(source, 'Expected an image source');
        if (source.startsWith('https://media.radibydlime.cz/images/')) {
          continue;
        }
        assert.ok(
          source.startsWith('/_astro/'),
          `Expected a built local image: ${source}`,
        );
        assert.ok((await stat(join(directory, 'dist', source))).isFile());
      }
    }
  });
});

test('contact page offers the confirmed mailbox and separate enquiry subjects without a submission service', async () => {
  await withFixture(async (directory) => {
    await build(directory);
    const html = await readFile(
      join(directory, 'dist/kontakt/index.html'),
      'utf8',
    );
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.match(html, /href="\/kontakt\/" aria-current="page"/);
    assert.match(html, /href="mailto:info@radibydlime.cz"/);
    for (const subject of [
      'Zpráva od čtenáře',
      'Poptávka projektu',
      'Dotaz k nabídce',
      'Nabídka spolupráce',
    ]) {
      assert.ok(
        html.includes(
          `mailto:info@radibydlime.cz?subject=${encodeURIComponent(subject)}`,
        ),
      );
    }
    assert.match(html, /id="contact-draft"/);
    assert.match(html, /data-email="info@radibydlime.cz"/);
    assert.match(html, /Připravit e-mail/);
    assert.match(html, /<noscript>/);
    assert.doesNotMatch(html, /<astro-island[\s>]/);
  });
});

test('renaming the file and localized slug preserves the canonical collection identity', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, samplePath),
      sample.replace(
        'slug: jak-zacala-obnova-naseho-domu',
        'slug: obnova-domu',
      ),
    );
    await rename(
      join(directory, samplePath),
      join(directory, 'src/content/projects/renamed.mdoc'),
    );
    // A fixture-only endpoint observes the real typed collection, not a copy of its parser.
    await writeFile(
      join(directory, 'src/pages/identity.txt.ts'),
      "import { getCollection } from 'astro:content';\nexport async function GET() { const projects = await getCollection('projects'); const renamed = projects.find(({ data }) => data.slug === 'obnova-domu'); return new Response(renamed?.data.id ?? 'missing'); }\n",
    );
    await build(directory);
    assert.equal(
      await readFile(join(directory, 'dist/identity.txt'), 'utf8'),
      'project-0001',
    );
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    assert.match(home, /href="\/projekty\/obnova-domu\/"/);
    const chapters = await readFile(
      join(directory, 'dist/kapitoly/index.html'),
      'utf8',
    );
    assert.match(chapters, /href="\/projekty\/obnova-domu\/"/);
    assert.doesNotMatch(
      chapters,
      /href="\/projekty\/jak-zacala-obnova-naseho-domu\/"/,
    );
    assert.ok(
      (
        await stat(join(directory, 'dist/projekty/obnova-domu/index.html'))
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
        .replace('project-0001', 'project-9999')
        .replace(
          'slug: jak-zacala-obnova-naseho-domu',
          'slug: archivovany-projekt',
        )
        .replace('status: published', 'status: archived'),
    );
    await build(directory);
    const home = await readFile(join(directory, 'dist/index.html'), 'utf8');
    const chapters = await readFile(
      join(directory, 'dist/kapitoly/index.html'),
      'utf8',
    );
    assert.doesNotMatch(
      home,
      /Jak začala obnova našeho domu|Nejdřív naslouchat|archivovany-projekt/,
    );
    assert.doesNotMatch(
      chapters,
      /Jak začala obnova našeho domu|Nejdřív naslouchat|archivovany-projekt/,
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
      .replace('slug: jak-zacala-obnova-naseho-domu', 'slug: jiny-projekt')
      .replace('status: published', 'status: draft'),
    diagnostic: /Duplicate Project ID: project-0001/,
  },
  {
    name: 'duplicate localized slugs',
    path: 'src/content/projects/duplicate.mdoc',
    content: sample.replace('project-0001', 'project-9998'),
    diagnostic: /Duplicate Project slug: jak-zacala-obnova-naseho-domu/,
  },
  {
    name: 'malformed required metadata',
    path: samplePath,
    content: sample.replace(
      'title: Jak začala obnova našeho domu',
      'title: ""',
    ),
    diagnostic: /title/,
  },
  {
    name: 'unknown author references',
    path: samplePath,
    content: sample.replace(
      'authorId: author-sample',
      'authorId: author-missing',
    ),
    diagnostic: /Unknown author ID author-missing referenced by project-0001/,
  },
  {
    name: 'unknown album references',
    path: samplePath,
    content: sample.replace(/galleryId: album-0001/, 'galleryId: album-9999'),
    diagnostic: /Unknown Album ID album-9999/,
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
  {
    name: 'unknown article image media IDs',
    path: samplePath,
    content:
      sample +
      '\n{% article-image mediaId="media-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" /%}\n',
    diagnostic: /Unknown media ID media-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/,
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
  /hero:\n(?:  .+\n)+(?=galleryId:|---)/,
  `hero:\n  mediaId: ${mediaId}\n`,
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
          ? /class="aspect-\[3\/2\] w-full object-cover"/
          : /class="aspect-\[16\/8\.5\] w-full bg-line object-cover"/,
      );
      assert.match(html, /height="1200"/);
      assert.match(html, /alt="Obnovené vstupní dveře\."/);
      assert.doesNotMatch(
        html,
        /<astro-island[\s>]|localhost:11434|scripts\/media/,
      );
      if (page === 'index.html') {
        assert.doesNotMatch(html, /<script[\s>]/);
      } else {
        assert.match(html, /radibydlime:article-preferences/);
      }
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

test('gallery index lists albums and only published albums have photo-viewer routes', async () => {
  await withFixture(async (directory) => {
    const path = join(directory, 'src/content/albums/dum-a-zahrada.mdoc');
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace(
        'status: published',
        'status: draft',
      ),
    );
    await build(directory);
    const index = await readFile(
      join(directory, 'dist/galerie/index.html'),
      'utf8',
    );
    assert.match(index, /href="\/galerie\/obnova-domu\/"/);
    assert.doesNotMatch(index, /href="\/galerie\/dum-a-zahrada\/"/);
    assert.doesNotMatch(index, /data-gallery-open/);
    const detail = await readFile(
      join(directory, 'dist/galerie/obnova-domu/index.html'),
      'utf8',
    );
    assert.equal((detail.match(/data-gallery-open=/g) ?? []).length, 8);
    assert.match(detail, /href="\/galerie\/" aria-current="page"/);
    await assert.rejects(
      readFile(join(directory, 'dist/galerie/dum-a-zahrada/index.html')),
    );
  });
});

test('article resolves shared album metadata by stable ID after album slug changes', async () => {
  await withFixture(async (directory) => {
    const path = join(directory, 'src/content/albums/obnova-domu.mdoc');
    let source = await readFile(path, 'utf8');
    source = source
      .replace('slug: obnova-domu', 'slug: novy-nazev-alba')
      .replace(
        'caption: Dvůr, kde na sebe práce a zahrada přirozeně navazují.',
        'caption: Sdílený popisek alba.',
      );
    await writeFile(path, source);
    await build(directory);
    for (const page of [projectRoute, 'galerie/novy-nazev-alba/index.html']) {
      const html = await readFile(join(directory, 'dist', page), 'utf8');
      assert.match(html, /Sdílený popisek alba/);
      assert.equal((html.match(/data-gallery-open=/g) ?? []).length, 8);
    }
  });
});

test('published article cannot expose a draft album', async () => {
  await withFixture(async (directory) => {
    const path = join(directory, 'src/content/albums/obnova-domu.mdoc');
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace(
        'status: published',
        'status: draft',
      ),
    );
    await assert.rejects(build(directory), (error: unknown) => {
      assert.match(String(error), /references unpublished Album album-0001/);
      return true;
    });
  });
});
