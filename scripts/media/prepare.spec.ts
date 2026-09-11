import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import {
  extractFacts,
  localEndpoint,
  normalizeStem,
  prepareImage,
  readExif,
  suggest,
} from './prepare.ts';

test('EXIF allowlist excludes private metadata and never invents a capture date', async () => {
  const facts = extractFacts({
    Orientation: 6,
    DateTimeOriginal: '2024:02:29 12:30:00',
    GPSLatitude: 50,
    SerialNumber: 'secret',
    OffsetTimeOriginal: '+01:00',
  });
  assert.deepEqual(facts, {
    orientation: 6,
    capturedOn: '2024-02-29',
    originalDate: '2024:02:29 12:30:00',
    offset: '+01:00',
    dateNeedsReview: false,
  });
  assert.equal(
    extractFacts({ FileModifyDate: '2024:02:29' }).capturedOn,
    undefined,
  );
  assert.equal(
    extractFacts({ DateTimeOriginal: '2024:02:30 12:30:00' }).dateNeedsReview,
    true,
  );
  assert.throws(() => extractFacts({ Orientation: 9 }));
  await assert.rejects(
    readExif('/unused', '/nonexistent-exiftool'),
    /ExifTool failed/,
  );
});

test('all EXIF orientations, bounds, transparency and metadata stripping use the real encoder', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'media-images-'));
  try {
    for (let orientation = 1; orientation <= 8; orientation++) {
      // Four unequal coloured quadrants expose mirrored as well as rotated orientation.
      const raw = Buffer.alloc(80 * 40 * 3);
      for (let y = 0; y < 40; y++)
        for (let x = 0; x < 80; x++) {
          const i = (y * 80 + x) * 3;
          raw[i] = x < 40 ? 240 : 20;
          raw[i + 1] = y < 20 ? 220 : 30;
          raw[i + 2] = 80;
        }
      const source = await sharp(raw, {
        raw: { width: 80, height: 40, channels: 3 },
      })
        .withMetadata({ orientation })
        .jpeg()
        .toBuffer();
      const file = join(dir, `${orientation}.jpg`);
      await writeFile(file, source);
      const output = await prepareImage(file, orientation);
      const metadata = await sharp(output.data).metadata();
      assert.equal(output.width, orientation >= 5 ? 40 : 80);
      assert.equal(output.height, orientation >= 5 ? 80 : 40);
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.xmp, undefined);
      assert.equal(metadata.orientation, undefined);
      const expectedCorners = [
        [0, 1, 2, 3],
        [1, 0, 3, 2],
        [3, 2, 1, 0],
        [2, 3, 0, 1],
        [0, 2, 1, 3],
        [2, 0, 3, 1],
        [3, 1, 2, 0],
        [1, 3, 0, 2],
      ][orientation - 1]!;
      const colors = [
        [240, 220, 80],
        [20, 220, 80],
        [240, 30, 80],
        [20, 30, 80],
      ];
      const actual = await sharp(output.data).removeAlpha().raw().toBuffer();
      const corners = [
        [5, 5],
        [output.width - 6, 5],
        [5, output.height - 6],
        [output.width - 6, output.height - 6],
      ];
      for (let corner = 0; corner < 4; corner++) {
        const [x, y] = corners[corner]!;
        const expected = colors[expectedCorners[corner]!]!;
        for (let channel = 0; channel < 3; channel++)
          assert.ok(
            Math.abs(
              actual[(y! * output.width + x!) * 3 + channel]! -
                expected[channel]!,
            ) < 20,
            `orientation ${orientation}, corner ${corner}`,
          );
      }
    }
    const big = join(dir, 'large.png');
    await writeFile(
      big,
      await sharp({
        create: {
          width: 3000,
          height: 1500,
          channels: 4,
          background: { r: 20, g: 80, b: 40, alpha: 0.3 },
        },
      })
        .png()
        .toBuffer(),
    );
    const out = await prepareImage(big, 1);
    assert.equal(out.width, 2400);
    assert.equal(out.height, 1200);
    assert.equal((await sharp(out.data).metadata()).hasAlpha, true);
    await assert.rejects(
      prepareImage(join(dir, '6.jpg'), 1),
      /Conflicting EXIF/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('local-only model preflight, structured Czech suggestions, normalization and invalid output', async () => {
  assert.equal(normalizeStem('Dřevěné dveře / 1'), 'drevene-dvere-1');
  for (const endpoint of [
    'https://example.com',
    'http://localhost:11434',
    'http://127.0.0.1:11434/redirect',
    'http://user:secret@127.0.0.1',
  ])
    assert.throws(() => localEndpoint(endpoint));
  const config = { endpoint: 'http://127.0.0.1:11434', model: 'local-model' };
  let imageCalls = 0;
  const mock =
    (mode: string): typeof fetch =>
    async (input, init) => {
      assert.equal(init?.redirect, 'error');
      if (String(input).endsWith('/status'))
        return Response.json({ cloud: { disabled: mode !== 'cloud' } });
      if (String(input).endsWith('/show'))
        return Response.json({
          capabilities: ['vision'],
          model_info: { architecture: 'fixture' },
          ...(mode === 'remote' ? { remote_host: 'https://ollama.com' } : {}),
        });
      imageCalls++;
      const request = JSON.parse(String(init?.body));
      assert.ok(request.format);
      assert.match(request.messages[0].content, /Nikdy neodhaduj/);
      assert.equal(
        request.messages[1].images[0],
        Buffer.from('pixels').toString('base64'),
      );
      if (mode === 'timeout') throw new Error('timeout');
      return Response.json({
        done: true,
        message: {
          content:
            mode === 'invalid'
              ? 'not JSON'
              : JSON.stringify({
                  filename: 'Dveře',
                  alt: 'Dveře.',
                  ...(mode === 'facts' ? { capturedOn: '1920-01-01' } : {}),
                }),
        },
      });
    };
  for (const mode of ['cloud', 'remote'])
    await assert.rejects(suggest(Buffer.from('pixels'), config, mock(mode)));
  assert.equal(imageCalls, 0);
  assert.equal(
    (await suggest(Buffer.from('pixels'), config, mock('ok'))).filename,
    'dvere',
  );
  for (const mode of ['invalid', 'facts', 'timeout'])
    await assert.rejects(suggest(Buffer.from('pixels'), config, mock(mode)));
});
