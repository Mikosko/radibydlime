import { createHash, randomUUID } from 'node:crypto';
import { join, posix } from 'node:path';
import { rename } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { format } from 'prettier';
import {
  digest,
  mediaOrigin,
  type Media,
} from '../../src/content/media/schema.ts';
import {
  atomicBytes,
  atomicJson,
  canonical,
  exists,
  json,
  listItems,
  readCatalog,
  readySnapshot,
  safePath,
  withWorkspace,
} from './state.ts';
import type { Transport } from './transport.ts';

export async function verifyPublic(item: Media, request: typeof fetch = fetch) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(`${mediaOrigin}${item.path}`, {
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        cache: 'no-store',
      });
      if (!response.ok || !response.body) throw new Error();
      const reader = response.body.getReader();
      const sum = createHash('sha256');
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 32 * 1024 * 1024) throw new Error();
          sum.update(value);
        }
      } finally {
        await reader.cancel();
      }
      if (sum.digest('hex') !== item.sha256) throw new Error();
      return;
    } catch {
      if (attempt === 2)
        throw new Error(
          'Public HTTPS verification failed; catalog unchanged, retry media:upload',
        );
      await delay(250 * (attempt + 1));
    }
  }
}
const journalSchema = z
  .object({
    attempt: z.uuid(),
    sealDigest: digest,
    path: z.string(),
    stage: z.enum(['staging', 'verified', 'promoting', 'published']),
    staging: z.string(),
  })
  .strict();
export interface UploadOptions {
  root: string;
  catalog: string;
  connect: () => Promise<Transport>;
  verify?: typeof verifyPublic;
  report?: (message: string) => void;
  checkpoint?: (point: string, id: string) => Promise<void>;
}
export async function uploadMedia(options: UploadOptions) {
  return withWorkspace(options.root, async () => {
    const catalog = await readCatalog(options.catalog);
    const items = [];
    // Complete preflight and immutable byte snapshots before opening any network connection.
    for (const id of await listItems(options.root, 'ready'))
      items.push(await readySnapshot(options.root, id));
    const ids = new Set<string>();
    const paths = new Set<string>();
    for (const { seal } of items) {
      const item = seal.catalog;
      if (ids.has(item.id) || paths.has(item.path))
        throw new Error('Ready ID/path collision');
      ids.add(item.id);
      paths.add(item.path);
      const existing = catalog.get(item.id);
      if (existing && canonical(existing) !== canonical(item))
        throw new Error(
          `Conflicting catalog record ${item.id}; reconcile manually`,
        );
      if (
        [...catalog.values()].some(
          (v) => v.path === item.path && v.id !== item.id,
        )
      )
        throw new Error(`Catalog path collision ${item.id}`);
    }
    const result = {
      published: [] as string[],
      skipped: await listItems(options.root, 'work'),
      failed: [] as string[],
      pending: [] as string[],
    };
    if (!items.length) return result;
    const transport = await options.connect();
    try {
      for (const { dir, seal, approval, image } of items) {
        const item = seal.catalog;
        const stagingPath = (attempt: string) =>
          transport.directoryPromotion
            ? `/images/.${item.id}.${attempt}.part/${posix.basename(item.path)}`
            : `/images/${item.id}/.${attempt}.part`;
        let journal: z.infer<typeof journalSchema> | undefined;
        try {
          const journalPath = await safePath(
            options.root,
            'ready',
            item.id,
            'journal.json',
          );
          if (await exists(journalPath)) {
            journal = journalSchema.parse(await json(journalPath));
            if (
              journal.sealDigest !== approval.digest ||
              journal.path !== item.path ||
              journal.staging !== stagingPath(journal.attempt)
            )
              throw new Error(
                'Upload journal does not match approval; reconcile manually',
              );
          }
          await transport.mkdir(
            transport.directoryPromotion ? '/images' : `/images/${item.id}`,
          );
          const present = await transport.stat(item.path);
          if (present) {
            const owned =
              catalog.has(item.id) ||
              journal?.stage === 'promoting' ||
              journal?.stage === 'published';
            if (
              present !== 'file' ||
              !owned ||
              (await transport.hash(item.path)) !== item.sha256
            )
              throw new Error(
                'Remote collision; existing destination was not overwritten',
              );
          } else {
            if (
              transport.directoryPromotion &&
              (await transport.stat(`/images/${item.id}`))
            )
              throw new Error(
                'Remote directory collision; existing destination was not replaced',
              );
            if (catalog.has(item.id))
              throw new Error(
                'Catalog references a missing remote file; automatic replacement is disabled',
              );
            if (!journal) {
              const attempt = randomUUID();
              journal = {
                attempt,
                sealDigest: approval.digest,
                path: item.path,
                staging: stagingPath(attempt),
                stage: 'staging',
              };
              await atomicJson(journalPath, journal);
            }
            const staged = await transport.stat(journal.staging);
            if (!staged) await transport.putExclusive(journal.staging, image);
            if (
              (staged && staged !== 'file') ||
              (await transport.hash(journal.staging)) !== item.sha256
            )
              throw new Error(
                `Incomplete staging file ${journal.staging}; manual reconciliation required`,
              );
            journal.stage = 'verified';
            await atomicJson(journalPath, journal);
            journal.stage = 'promoting';
            await atomicJson(journalPath, journal);
            await transport.promote(journal.staging, item.path);
            await options.checkpoint?.('promoted', item.id);
          }
          await (options.verify ?? verifyPublic)(item);
          if (journal) {
            journal.stage = 'published';
            await atomicJson(journalPath, journal);
          }
          // Revalidate immediately before the exclusive create: do not overwrite Git edits during upload.
          const current = await readCatalog(options.catalog);
          const existing = current.get(item.id);
          if (existing && canonical(existing) !== canonical(item))
            throw new Error(
              'Catalog changed during upload; reconcile manually',
            );
          if (
            [...current.values()].some(
              (v) => v.id !== item.id && v.path === item.path,
            )
          )
            throw new Error('Catalog path collision during upload');
          if (!existing)
            await atomicBytes(
              join(options.catalog, `${item.id}.json`),
              Buffer.from(
                await format(JSON.stringify(item), { parser: 'json' }),
              ),
              true,
            );
          await options.checkpoint?.('catalogued', item.id);
          await atomicJson(join(dir, 'receipt.json'), {
            id: item.id,
            path: item.path,
            sha256: item.sha256,
            verifiedAt: new Date().toISOString(),
            approval: approval.digest,
          });
          await options.checkpoint?.('receipted', item.id);
          const destination = await safePath(
            options.root,
            'processed',
            item.id,
          );
          if (await exists(destination))
            throw new Error('Processed-state collision; reconcile manually');
          await rename(dir, destination);
          result.published.push(item.id);
          options.report?.(`${item.id}: published ${item.path}`);
        } catch (e) {
          result.failed.push(item.id);
          if (journal?.stage === 'promoting' || journal?.stage === 'published')
            result.pending.push(item.id);
          // Transport errors are intentionally sanitized at the transport boundary.
          const message =
            e instanceof z.ZodError
              ? 'Invalid publication journal'
              : e instanceof Error
                ? e.message
                : 'Upload failed';
          await atomicJson(join(dir, 'error.json'), {
            stage: 'upload',
            message,
          });
          options.report?.(`${item.id}: ${message}`);
        }
      }
    } finally {
      transport.close();
    }
    return result;
  });
}
