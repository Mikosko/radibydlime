import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  rename,
  unlink,
  link,
} from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import {
  digest,
  mediaId,
  mediaSchema,
  validateCatalog,
} from '../../src/content/media/schema.ts';

export const policy = 'webp-q80-edge2400-srgb-oriented-v1';
export const hash = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
// Canonical key order keeps approval independent of JSON indentation/key ordering.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export const sealSchema = z
  .object({
    policy: z.literal(policy),
    catalog: mediaSchema,
    sourceHash: digest,
    draftHash: digest,
  })
  .strict();
export const approvalSchema = z
  .object({ digest, approvedAt: z.iso.datetime() })
  .strict();
export type Seal = z.infer<typeof sealSchema>;

export async function exists(path: string) {
  try {
    return await lstat(path);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw e;
  }
}
export async function safePath(root: string, ...parts: string[]) {
  const path = resolve(root, ...parts);
  const rel = relative(resolve(root), path);
  if (
    rel === '..' ||
    rel.startsWith(`..${sep}`) ||
    (resolve(root) === path && parts.length > 0)
  )
    throw new Error('Path escapes working root');
  // Reject symlinks, including ancestors of the root. Missing trailing parts are safe to create.
  let cursor = path;
  while (true) {
    if ((await exists(cursor))?.isSymbolicLink())
      throw new Error('Symlink paths are not supported');
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return path;
}
export async function bytes(path: string, max = 100 * 1024 * 1024) {
  const fd = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const s = await fd.stat();
    if (!s.isFile() || s.size > max)
      throw new Error('Expected a regular file within the size limit');
    return await fd.readFile();
  } finally {
    await fd.close();
  }
}
export async function json(path: string): Promise<unknown> {
  return JSON.parse((await bytes(path, 1024 * 1024)).toString());
}
export async function atomicBytes(
  path: string,
  data: Buffer,
  exclusive = false,
) {
  await safePath(dirname(path));
  if ((await exists(path))?.isSymbolicLink())
    throw new Error('Refusing symlink file');
  const tmp = `${path}.${randomUUID()}.tmp`;
  const fd = await open(tmp, 'wx', 0o600);
  try {
    await fd.writeFile(data);
    await fd.sync();
  } finally {
    await fd.close();
  }
  try {
    if (exclusive) await link(tmp, path);
    else await rename(tmp, path);
  } finally {
    if (await exists(tmp)) await unlink(tmp);
  }
}
export async function atomicJson(
  path: string,
  data: unknown,
  exclusive = false,
) {
  await atomicBytes(
    path,
    Buffer.from(`${JSON.stringify(data, null, 2)}\n`),
    exclusive,
  );
}
export async function listItems(root: string, stage: string) {
  const dir = await safePath(root, stage);
  return (await readdir(dir, { withFileTypes: true }))
    .map((e) => {
      if (!e.isDirectory() || !mediaId.safeParse(e.name).success)
        throw new Error(`Unexpected entry in ${stage}; inspect local state`);
      return e.name;
    })
    .sort();
}
export async function withWorkspace<T>(root: string, run: () => Promise<T>) {
  await safePath(root);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const lockPath = join(root, '.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST')
      throw new Error(
        'Media workspace is locked. Stop the other process; remove .lock only after confirming it is stale.',
      );
    throw e;
  }
  try {
    await lock.writeFile(`${process.pid}\n`);
    for (const stage of ['inbox', 'work', 'ready', 'processed'])
      await mkdir(await safePath(root, stage), {
        recursive: true,
        mode: 0o700,
      });
    return await run();
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
export async function readCatalog(directory: string) {
  await safePath(directory);
  const entries = await readdir(directory, { withFileTypes: true });
  const records = [];
  for (const e of entries
    .filter((e) => e.name.endsWith('.json'))
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isFile())
      throw new Error('Catalog records must be regular JSON files');
    records.push({ source: e.name, data: await json(join(directory, e.name)) });
  }
  return validateCatalog(records);
}
export async function readySnapshot(root: string, id: string) {
  const dir = await safePath(root, 'ready', mediaId.parse(id));
  const raw = await json(join(dir, 'seal.json'));
  const seal = sealSchema.parse(raw);
  const approval = approvalSchema.parse(await json(join(dir, 'approval.json')));
  const image = await bytes(join(dir, 'image.webp'));
  if (
    seal.catalog.id !== id ||
    approval.digest !== hash(canonical(raw)) ||
    hash(image) !== seal.catalog.sha256
  )
    throw new Error(
      `Stale approval for ${id}; return to media:process -- --review ${id}`,
    );
  // Draft remains editable; changing it must invalidate even an otherwise valid seal.
  const draft = await json(join(dir, 'draft.json'));
  if (seal.draftHash !== hash(canonical(draft)))
    throw new Error(`Edited draft for ${id}; review again`);
  return { dir, seal, approval, image };
}
