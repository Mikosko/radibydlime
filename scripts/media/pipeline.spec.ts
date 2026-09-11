import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtemp,
  realpath,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
} from 'node:fs/promises';
import { join, posix } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { processMedia } from './process.ts';
import { uploadMedia, verifyPublic } from './upload.ts';
import {
  atomicJson,
  canonical,
  hash,
  json,
  listItems,
  readySnapshot,
  withWorkspace,
} from './state.ts';
import type { Transport } from './transport.ts';
import { validateCatalog, type Media } from '../../src/content/media/schema.ts';

async function fixture(run: (root: string, catalog: string) => Promise<void>) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'media-pipeline-')));
  const root = join(base, 'local'),
    catalog = join(base, 'catalog');
  try {
    await mkdir(catalog);
    await withWorkspace(root, async () => {});
    await run(root, catalog);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}
async function source(root: string, name = 'photo.png', color = 'red') {
  await writeFile(
    join(root, 'inbox', name),
    await sharp({
      create: { width: 80, height: 40, channels: 3, background: color },
    })
      .png()
      .toBuffer(),
  );
}
async function ready(root: string, catalog: string, approve = true) {
  return processMedia({
    root,
    catalog,
    extract: async () => ({ orientation: 1, dateNeedsReview: false }),
    ollama: { endpoint: 'http://127.0.0.1:11434', model: 'fixture' },
    describe: async () => ({
      filename: 'dvere',
      alt: 'Červené dveře.',
      tags: ['obnova'],
    }),
    review: async () => approve,
  });
}
function memoryTransport(directoryPromotion = false) {
  const files = new Map<string, Buffer>();
  const directories = new Set<string>();
  const writes: string[] = [];
  const transport: Transport = {
    ...(directoryPromotion ? { directoryPromotion: true as const } : {}),
    stat: async (path) =>
      files.has(path)
        ? 'file'
        : directories.has(path) ||
            [...files.keys()].some((p) => p.startsWith(`${path}/`))
          ? 'directory'
          : undefined,
    mkdir: async (path) => {
      directories.add(path);
    },
    putExclusive: async (path, data) => {
      assert.ok(!files.has(path));
      if (directoryPromotion) {
        assert.ok(!directories.has(posix.dirname(path)));
        directories.add(posix.dirname(path));
      }
      files.set(path, Buffer.from(data));
      writes.push(path);
    },
    hash: async (path) => hash(files.get(path)!),
    promote: async (src, dst) => {
      if (files.has(dst)) throw new Error('collision');
      if (directoryPromotion && directories.has(posix.dirname(dst)))
        throw new Error('directory collision');
      files.set(dst, Buffer.from(files.get(src)!));
      if (directoryPromotion) {
        files.delete(src);
        directories.delete(posix.dirname(src));
        directories.add(posix.dirname(dst));
      }
    },
    close() {},
  };
  return { files, directories, writes, transport };
}

test('process, edit, approve and publish; processing leaves Git untouched and reruns keep identity', async () =>
  fixture(async (root, catalog) => {
    await source(root);
    const initial = await ready(root, catalog, false);
    assert.equal(initial.pending.length, 1);
    assert.deepEqual(await readdir(catalog), []);
    const id = initial.pending[0]!;
    const draft = join(root, 'work', id, 'draft.json');
    await atomicJson(draft, {
      ...((await json(draft)) as object),
      alt: 'Upravený popis.',
      caption: 'Popisek.',
    });
    await rename(
      join(root, 'inbox', 'photo.png'),
      join(root, 'inbox', 'renamed.png'),
    );
    let calls = 0;
    const processed = await processMedia({
      root,
      catalog,
      describe: async () => {
        calls++;
        throw Error();
      },
      extract: async () => {
        throw Error();
      },
      review: async () => true,
    });
    assert.deepEqual(processed.ready, [id]);
    assert.equal(calls, 0);
    const snapshot = await readySnapshot(root, id);
    assert.equal(snapshot.seal.catalog.alt, 'Upravený popis.');
    const remote = memoryTransport();
    const result = await uploadMedia({
      root,
      catalog,
      connect: async () => remote.transport,
      verify: async (item) => {
        assert.equal(hash(remote.files.get(item.path)!), item.sha256);
      },
    });
    assert.deepEqual(result.published, [id]);
    assert.equal(
      ((await json(join(catalog, `${id}.json`))) as Media).caption,
      'Popisek.',
    );
    assert.deepEqual(await listItems(root, 'processed'), [id]);
    assert.equal((await ready(root, catalog)).skipped[0], id);
    const before = await readFile(join(catalog, `${id}.json`));
    assert.equal(
      (
        await uploadMedia({
          root,
          catalog,
          connect: async () => {
            throw Error('must not connect');
          },
        })
      ).published.length,
      0,
    );
    assert.deepEqual(await readFile(join(catalog, `${id}.json`)), before);
  }));

test('edited bytes, drafts and seals fail upload before connecting', async () => {
  for (const target of ['image.webp', 'draft.json', 'seal.json'])
    await fixture(async (root, catalog) => {
      await source(root);
      const id = (await ready(root, catalog)).ready[0]!;
      const path = join(root, 'ready', id, target);
      if (target === 'image.webp') await writeFile(path, 'changed');
      else {
        const data = (await json(path)) as Record<string, unknown>;
        data[target === 'draft.json' ? 'alt' : 'policy'] = 'changed';
        await atomicJson(path, data);
      }
      let connected = false;
      await assert.rejects(
        uploadMedia({
          root,
          catalog,
          connect: async () => {
            connected = true;
            throw Error();
          },
        }),
      );
      assert.equal(connected, false);
      assert.deepEqual(await readdir(catalog), []);
    });
});

test('the actual CLI never approves a noninteractive review and needs no AI setup to resume', async () =>
  fixture(async (root, catalog) => {
    await source(root);
    const id = (await ready(root, catalog, false)).pending[0]!;
    const configPath = join(root, 'machine.json');
    await atomicJson(configPath, { workRoot: root });
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        '--experimental-strip-types',
        fileURLToPath(new URL('./cli.ts', import.meta.url)),
        'process',
        '--review',
        id,
      ],
      {
        env: { ...process.env, RADIBYDLIME_MEDIA_CONFIG: configPath },
        timeout: 10000,
      },
    );
    assert.match(stdout, /Noninteractive: left unapproved/);
    assert.deepEqual(await listItems(root, 'ready'), []);
    assert.deepEqual(await listItems(root, 'work'), [id]);
  }));

test('malformed machine JSON does not leak credential-like contents in CLI errors', async () =>
  fixture(async (root) => {
    const config = join(root, 'bad-config.json');
    await writeFile(config, 'TOP_SECRET_PASSWORD invalid json');
    await assert.rejects(
      promisify(execFile)(
        process.execPath,
        [
          '--experimental-strip-types',
          fileURLToPath(new URL('./cli.ts', import.meta.url)),
          'upload',
        ],
        { env: { ...process.env, RADIBYDLIME_MEDIA_CONFIG: config } },
      ),
      (error: unknown) => {
        const output = error as { stdout?: string; stderr?: string };
        assert.match(
          output.stderr ?? '',
          /Cannot read machine media configuration/,
        );
        assert.doesNotMatch(
          `${output.stdout}${output.stderr}`,
          /TOP_SECRET_PASSWORD/,
        );
        return true;
      },
    );
  }));

test('an edit during review is not approved; an explicit ready review invalidates old approval', async () =>
  fixture(async (root, catalog) => {
    await source(root);
    const id = (await ready(root, catalog, false)).pending[0]!;
    const draft = join(root, 'work', id, 'draft.json');
    const result = await processMedia({
      root,
      catalog,
      reviewId: id,
      review: async () => {
        await atomicJson(draft, { filename: 'new', alt: 'Jiný popis.' });
        return true;
      },
    });
    assert.deepEqual(result.failed, [id]);
    assert.deepEqual(await listItems(root, 'ready'), []);
    assert.deepEqual(
      (
        await processMedia({
          root,
          catalog,
          reviewId: id,
          review: async () => true,
        })
      ).ready,
      [id],
    );
    await atomicJson(join(root, 'ready', id, 'draft.json'), {
      filename: 'new',
      alt: 'Další popis.',
    });
    assert.deepEqual(
      (
        await processMedia({
          root,
          catalog,
          reviewId: id,
          review: async () => true,
        })
      ).ready,
      [id],
    );
    assert.equal(
      (await readySnapshot(root, id)).seal.catalog.alt,
      'Další popis.',
    );
  }));

for (const directoryMode of [false, true])
  test(`partial success and public verification failure retain recovery state (directory promotion: ${directoryMode})`, async () =>
    fixture(async (root, catalog) => {
      await source(root);
      await source(root, 'other.png', 'blue');
      const ids = (await ready(root, catalog)).ready.sort();
      const remote = memoryTransport(directoryMode);
      const failure = ids[0]!;
      const first = await uploadMedia({
        root,
        catalog,
        connect: async () => remote.transport,
        verify: async (item) => {
          if (item.id === failure) throw Error('verification unavailable');
        },
      });
      assert.deepEqual(first.failed, [failure]);
      assert.equal(first.published.length, 1);
      assert.deepEqual(await readdir(catalog), [`${ids[1]}.json`]);
      const count = remote.writes.length;
      const retry = await uploadMedia({
        root,
        catalog,
        connect: async () => remote.transport,
        verify: async () => {},
      });
      assert.deepEqual(retry.published, [failure]);
      assert.equal(remote.writes.length, count);
    }));

for (const directoryMode of [false, true])
  for (const point of ['promoted', 'catalogued', 'receipted'])
    test(`recovery after ${point} does not re-upload (directory promotion: ${directoryMode})`, async () =>
      fixture(async (root, catalog) => {
        await source(root);
        const id = (await ready(root, catalog)).ready[0]!;
        const remote = memoryTransport(directoryMode);
        const first = await uploadMedia({
          root,
          catalog,
          connect: async () => remote.transport,
          verify: async () => {},
          checkpoint: async (at) => {
            if (at === point) throw Error('simulated interruption');
          },
        });
        assert.deepEqual(first.failed, [id]);
        assert.deepEqual(await listItems(root, 'ready'), [id]);
        const count = remote.writes.length;
        const retry = await uploadMedia({
          root,
          catalog,
          connect: async () => remote.transport,
          verify: async () => {},
        });
        assert.deepEqual(retry.published, [id]);
        assert.equal(remote.writes.length, count);
        assert.equal((await readdir(catalog)).length, 1);
      }));

test('unowned existing destination, partial staging and conflicting catalog are never overwritten', async () => {
  for (const directoryMode of [false, true])
    for (const scenario of ['destination', 'staging', 'catalog'])
      await fixture(async (root, catalog) => {
        await source(root);
        const id = (await ready(root, catalog)).ready[0]!;
        const snapshot = await readySnapshot(root, id);
        const remote = memoryTransport(directoryMode);
        if (scenario === 'destination')
          remote.files.set(snapshot.seal.catalog.path, Buffer.from('existing'));
        if (scenario === 'catalog')
          await atomicJson(join(catalog, `${id}.json`), {
            ...snapshot.seal.catalog,
            alt: 'Previously edited in Git',
          });
        if (scenario === 'staging')
          remote.transport.putExclusive = async (path) => {
            remote.files.set(path, Buffer.from('partial'));
            throw Error('disconnected');
          };
        const run = () =>
          uploadMedia({
            root,
            catalog,
            connect: async () => remote.transport,
            verify: async () => {},
          });
        if (scenario === 'catalog')
          await assert.rejects(run(), /Conflicting catalog/);
        else {
          assert.deepEqual((await run()).failed, [id]);
          assert.deepEqual((await run()).failed, [id]);
          assert.deepEqual(await readdir(catalog), []);
        }
        if (scenario === 'destination')
          assert.equal(
            remote.files.get(snapshot.seal.catalog.path)?.toString(),
            'existing',
          );
        assert.deepEqual(await listItems(root, 'ready'), [id]);
      });
});

test('locks, symlinks, corrupt/unsupported inbox entries and missing model preserve recoverable local state', async () =>
  fixture(async (root, catalog) => {
    await withWorkspace(root, async () => {
      await assert.rejects(
        withWorkspace(root, async () => {}),
        /locked/,
      );
    });
    await writeFile(join(root, 'inbox', 'bad.jpg'), 'broken');
    await writeFile(join(root, 'inbox', 'raw.heic'), 'not supported');
    await symlink(
      join(root, 'inbox', 'bad.jpg'),
      join(root, 'inbox', 'link.jpg'),
    );
    const result = await ready(root, catalog);
    assert.equal(result.ready.length, 0);
    assert.equal(result.failed.length, 3);
    assert.ok((await readdir(join(root, 'inbox'))).includes('bad.jpg'));
    await source(root);
    const unavailable = await processMedia({
      root,
      catalog,
      extract: async () => ({ orientation: 1, dateNeedsReview: false }),
    });
    assert.ok(unavailable.failed.length > 0);
    assert.deepEqual(await readdir(catalog), []);
  }));

test('catalog validates filenames, unknown fields, date validity and reference invariants', () => {
  const id = `media-${randomUUID()}`;
  const data: Media = {
    id,
    path: `/images/${id}/image.webp`,
    mimeType: 'image/webp',
    width: 1,
    height: 1,
    alt: 'Popis',
    sha256: 'a'.repeat(64),
  };
  assert.equal(validateCatalog([{ source: `${id}.json`, data }]).size, 1);
  for (const bad of [
    { ...data, GPSLatitude: 1 },
    { ...data, capturedOn: '2025-02-30' },
    { ...data, path: '/images/../secret' },
    { ...data, width: 0 },
  ])
    assert.throws(
      () => validateCatalog([{ source: `${id}.json`, data: bad }]),
      /Invalid media/,
    );
  assert.throws(
    () => validateCatalog([{ source: 'wrong.json', data }]),
    /filename/,
  );
  assert.throws(
    () =>
      validateCatalog([
        { source: `${id}.json`, data },
        { source: 'other.json', data },
      ]),
    /Duplicate media ID/,
  );
  assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }));
});

test('HTTPS verifier requires exact image bytes; success pages and bad responses are insufficient', async () => {
  const data = Buffer.from('image');
  const item = {
    path: '/images/example/image.webp',
    sha256: hash(data),
  } as Media;
  await verifyPublic(item, async () => new Response(data));
  await assert.rejects(
    verifyPublic(item, async () => new Response('<html>error</html>')),
    /HTTPS verification failed/,
  );
});
