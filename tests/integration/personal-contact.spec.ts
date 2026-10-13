import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import QRCode from 'qrcode';
import { root, build, withFixture } from '../helpers/astro-build.ts';

test('personal contact page, vCard and printed QR share confirmed contact data', async () => {
  const html = await readFile(
    join(root, 'dist/kontakt/jitka-rajnoskova/index.html'),
    'utf8',
  );
  assert.match(html, /Jitka Rajnošková/);
  assert.match(html, /href="tel:\+420733725608"/);
  assert.match(html, /href="mailto:info@radibydlime.cz"/);
  assert.match(html, /href="\/kontakt\/jitka-rajnoskova.vcf" download/);
  assert.match(html, /href="\/kontakt\/"/);
  const vcf = await readFile(
    join(root, 'dist/kontakt/jitka-rajnoskova.vcf'),
    'utf8',
  );
  assert.match(vcf, /BEGIN:VCARD\r\nVERSION:3.0\r\n/);
  assert.match(vcf, /N:Rajnošková;Jitka;;;/);
  assert.match(vcf, /TEL;TYPE=CELL:\+420733725608/);
  const url = 'https://www.radibydlime.cz/kontakt/jitka-rajnoskova/';
  assert.ok(vcf.includes(`URL:${url}`));
  const card = await readFile(
    join(root, 'dist/media/vizitky/jitka-rajnoskova/v2/index.html'),
    'utf8',
  );
  const encoded = card.match(/src="data:image\/svg\+xml,([^"]+)"/);
  assert.ok(encoded);
  const svg = decodeURIComponent(encoded[1]);
  assert.equal(
    svg,
    await QRCode.toString(url, {
      type: 'svg',
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#45533e', light: '#f8f1e7' },
    }),
  );
});

test('retiring a contact retains the QR route as a static redirect and removes personal data', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, 'src/content/contacts/jitka.json'),
      JSON.stringify({
        id: 'contact-jitka',
        slug: 'jitka-rajnoskova',
        status: 'archived',
      }),
    );
    await build(directory);
    const html = await readFile(
      join(directory, 'dist/kontakt/jitka-rajnoskova/index.html'),
      'utf8',
    );
    assert.match(html, /http-equiv="refresh"/i);
    assert.match(html, /url=\/kontakt\//);
    assert.match(html, /href="\/kontakt\/"/);
    assert.doesNotMatch(html, /733725608|Rajnošková|BEGIN:VCARD/);
    await assert.rejects(
      readFile(join(directory, 'dist/kontakt/jitka-rajnoskova.vcf')),
      { code: 'ENOENT' },
    );
  });
});

test('contacts reject duplicate stable identity', async () => {
  await withFixture(async (directory) => {
    await writeFile(
      join(directory, 'src/content/contacts/duplicate.json'),
      JSON.stringify({
        id: 'contact-jitka',
        slug: 'another-contact',
        status: 'archived',
      }),
    );
    await assert.rejects(build(directory), /Duplicate contact ID or slug/);
  });
});
