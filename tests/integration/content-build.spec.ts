import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const samplePath = 'src/content/projects/entrance-door.mdoc';
const projectRoute = 'projekty/druhy-zivot-starych-dveri/index.html';
const sample = await readFile(join(root, samplePath), 'utf8');

async function withFixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'radibydlime-build-'));
  try {
    for (const path of [
      'src',
      'astro.config.mjs',
      'tsconfig.json',
      'package.json',
    ]) {
      await cp(join(root, path), join(directory, path), { recursive: true });
    }
    await symlink(
      join(root, 'node_modules'),
      join(directory, 'node_modules'),
      'dir',
    );
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function build(directory: string) {
  return exec(
    process.execPath,
    [join(root, 'node_modules/astro/bin/astro.mjs'), 'build'],
    {
      cwd: directory,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

test('published pages render Czech metadata, Markdoc, navigation, and local images without scripts', async () => {
  const home = await readFile(join(root, 'dist/index.html'), 'utf8');
  const project = await readFile(join(root, 'dist', projectRoute), 'utf8');
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
      assert.ok((await stat(join(root, 'dist', source))).isFile());
    }
  }
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
