import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rename } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { z } from 'zod';
import {
  captureDate,
  digest,
  labels,
  mediaId,
  mediaSchema,
  shortText,
  stem,
} from '../../src/content/media/schema.ts';
import type { ModelConfig } from './config.ts';
import { factsSchema, prepareImage, readExif, suggest } from './prepare.ts';
import {
  atomicBytes,
  atomicJson,
  bytes,
  canonical,
  exists,
  hash,
  json,
  listItems,
  policy,
  readCatalog,
  safePath,
  sealSchema,
  withWorkspace,
} from './state.ts';

const sourceSchema = z.object({ id: mediaId, sourceHash: digest }).strict();
const preparedSchema = z
  .object({
    policy: z.literal(policy),
    sourceHash: digest,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sha256: digest,
  })
  .strict();
export const draftSchema = z
  .object({
    filename: stem,
    alt: shortText,
    caption: shortText.optional(),
    credit: shortText.optional(),
    capturedOn: captureDate.optional(),
    captureSource: shortText.optional(),
    tags: labels.optional(),
    groups: labels.optional(),
  })
  .strict();
export type Review = (context: {
  id: string;
  directory: string;
  facts: unknown;
  catalog: unknown;
}) => Promise<boolean>;
export interface ProcessOptions {
  root: string;
  catalog: string;
  exiftool?: string;
  ollama?: ModelConfig;
  manual?: boolean;
  reviewId?: string;
  review?: Review;
  report?: (message: string) => void;
  extract?: typeof readExif;
  prepare?: typeof prepareImage;
  describe?: typeof suggest;
}
export async function processMedia(options: ProcessOptions) {
  const { root, catalog: catalogDirectory } = options;
  const report = options.report ?? (() => {});
  return withWorkspace(root, async () => {
    const catalog = await readCatalog(catalogDirectory);
    const result = {
      ready: [] as string[],
      pending: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
    };
    const known = new Map<string, { id: string; stage: string }>();
    for (const stage of ['work', 'ready', 'processed'])
      for (const id of await listItems(root, stage)) {
        const dir = await safePath(root, stage, id);
        const source = sourceSchema.parse(await json(join(dir, 'source.json')));
        if (source.id !== id || known.has(source.sourceHash))
          throw new Error('Conflicting source identity in local state');
        known.set(source.sourceHash, { id, stage });
      }
    if (options.reviewId) {
      const id = mediaId.parse(options.reviewId);
      const ready = await safePath(root, 'ready', id);
      if (await exists(ready)) {
        if (await exists(join(ready, 'journal.json')))
          throw new Error(
            'This item has an upload attempt. Reconcile it before editing; see docs/media.md',
          );
        const work = await safePath(root, 'work', id);
        if (await exists(work)) throw new Error('Work/ready ID collision');
        await rename(ready, work);
      }
    } else {
      const inbox = await safePath(root, 'inbox');
      for (const entry of (await readdir(inbox, { withFileTypes: true })).sort(
        (a, b) => a.name.localeCompare(b.name),
      )) {
        try {
          if (
            !entry.isFile() ||
            !['.jpg', '.jpeg', '.png', '.webp'].includes(
              extname(entry.name).toLowerCase(),
            )
          )
            throw new Error(
              'Unsupported inbox entry; use a regular still JPEG, PNG or WebP',
            );
          const data = await bytes(await safePath(root, 'inbox', entry.name));
          const sourceHash = hash(data);
          const previous = known.get(sourceHash);
          if (previous) {
            if (previous.stage === 'work') {
              const sourcePath = await safePath(
                root,
                'work',
                previous.id,
                'source.bin',
              );
              if (!(await exists(sourcePath)))
                await atomicBytes(sourcePath, data);
            }
            result.skipped.push(previous.id);
            continue;
          }
          const id = `media-${randomUUID()}`;
          if (catalog.has(id))
            throw new Error('Allocated ID collision; rerun discovery');
          const dir = await safePath(root, 'work', id);
          await mkdir(dir, { mode: 0o700 });
          await atomicJson(join(dir, 'source.json'), { id, sourceHash });
          await atomicBytes(join(dir, 'source.bin'), data);
          known.set(sourceHash, { id, stage: 'work' });
        } catch (e) {
          result.failed.push('inbox entry');
          report(
            `Inbox ${JSON.stringify(entry.name)}: ${e instanceof Error ? e.message : 'failed'}`,
          );
        }
      }
    }
    const ids = options.reviewId
      ? [options.reviewId]
      : await listItems(root, 'work');
    for (const id of ids) {
      const dir = await safePath(root, 'work', id);
      try {
        const source = sourceSchema.parse(await json(join(dir, 'source.json')));
        const sourcePath = join(dir, 'source.bin');
        if (
          source.id !== id ||
          hash(await bytes(sourcePath)) !== source.sourceHash
        )
          throw new Error(
            'Source copy changed or incomplete; restore the original source copy',
          );
        if (!(await exists(join(dir, 'facts.json')))) {
          if (options.reviewId)
            throw new Error('Preparation is incomplete; rerun media:process');
          await atomicJson(
            join(dir, 'facts.json'),
            await (options.extract ?? readExif)(sourcePath, options.exiftool),
          );
        }
        const facts = factsSchema.parse(await json(join(dir, 'facts.json')));
        if (!(await exists(join(dir, 'prepared.json')))) {
          if (options.reviewId)
            throw new Error('Preparation is incomplete; rerun media:process');
          const image = await (options.prepare ?? prepareImage)(
            sourcePath,
            facts.orientation,
          );
          await atomicBytes(join(dir, 'image.webp'), image.data);
          await atomicJson(join(dir, 'prepared.json'), {
            policy,
            sourceHash: source.sourceHash,
            width: image.width,
            height: image.height,
            sha256: hash(image.data),
          });
        }
        const prepared = preparedSchema.parse(
          await json(join(dir, 'prepared.json')),
        );
        const image = await bytes(join(dir, 'image.webp'));
        if (
          hash(image) !== prepared.sha256 ||
          prepared.sourceHash !== source.sourceHash
        )
          throw new Error(
            'Prepared bytes changed; restore or restart unapproved preparation',
          );
        const draftPath = join(dir, 'draft.json');
        if (!(await exists(draftPath))) {
          if (options.reviewId)
            throw new Error('No draft; rerun media:process');
          if (!options.manual && !options.ollama)
            throw new Error(
              'Configure a local Ollama model or use --manual to write metadata yourself',
            );
          const suggestions = options.manual
            ? { filename: 'image', alt: '' }
            : await (options.describe ?? suggest)(image, options.ollama!);
          await atomicJson(draftPath, {
            ...suggestions,
            ...(facts.capturedOn ? { capturedOn: facts.capturedOn } : {}),
          });
        }
        report(
          `${id}: inspect ${join(dir, 'image.webp')} and edit ${draftPath}`,
        );
        const rawDraft = await json(draftPath);
        const parsed = draftSchema.safeParse(rawDraft);
        if (!parsed.success) {
          result.pending.push(id);
          report(
            `${id}: draft needs editing (${parsed.error.issues.map((i) => i.path.join('.')).join(', ')})`,
          );
          continue;
        }
        const draft = parsed.data;
        if (
          draft.capturedOn &&
          (facts.dateNeedsReview || draft.capturedOn !== facts.capturedOn) &&
          !draft.captureSource
        )
          throw new Error(
            'Capture date requires a trusted captureSource in the local draft',
          );
        const { filename, captureSource: _provenance, ...publicFields } = draft;
        const item = mediaSchema.parse({
          ...publicFields,
          id,
          path: `/images/${id}/${filename}.webp`,
          mimeType: 'image/webp',
          width: prepared.width,
          height: prepared.height,
          sha256: prepared.sha256,
        });
        if (
          catalog.has(id) ||
          [...catalog.values()].some((v) => v.path === item.path)
        )
          throw new Error(
            'Published ID/path collision; use Git for metadata-only corrections',
          );
        for (const otherId of await listItems(root, 'ready')) {
          const other = sealSchema.parse(
            await json(await safePath(root, 'ready', otherId, 'seal.json')),
          );
          if (other.catalog.id === id || other.catalog.path === item.path)
            throw new Error('Ready ID/path collision');
        }
        if (
          !(await options.review?.({
            id,
            directory: dir,
            facts,
            catalog: item,
          }))
        ) {
          result.pending.push(id);
          continue;
        }
        if (
          canonical(await json(draftPath)) !== canonical(rawDraft) ||
          hash(await bytes(join(dir, 'image.webp'))) !== prepared.sha256
        )
          throw new Error('Files changed during review; review again');
        const seal = sealSchema.parse({
          policy,
          sourceHash: source.sourceHash,
          draftHash: hash(canonical(rawDraft)),
          catalog: item,
        });
        await atomicJson(join(dir, 'seal.json'), seal);
        await atomicJson(join(dir, 'approval.json'), {
          digest: hash(canonical(seal)),
          approvedAt: new Date().toISOString(),
        });
        const destination = await safePath(root, 'ready', id);
        if (await exists(destination))
          throw new Error('Ready directory collision');
        await rename(dir, destination);
        result.ready.push(id);
      } catch (e) {
        result.failed.push(id);
        const message =
          e instanceof z.ZodError
            ? `Invalid working metadata: ${e.issues.map((i) => i.path.join('.')).join(', ')}`
            : e instanceof Error
              ? e.message
              : 'Processing failed';
        report(`${id}: ${message}`);
        if (await exists(dir))
          await atomicJson(join(dir, 'error.json'), {
            stage: 'process',
            message,
          });
      }
    }
    return result;
  });
}
