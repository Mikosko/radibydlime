import { z } from 'zod';

export const mediaOrigin = 'https://media.radibydlime.cz';
export const mediaId = z
  .string()
  .regex(
    /^media-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
export const digest = z.string().regex(/^[0-9a-f]{64}$/);
export const stem = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
export const shortText = z.string().trim().min(1).max(500);
export const labels = z
  .array(z.string().trim().min(1).max(80))
  .max(20)
  .refine((v) => new Set(v).size === v.length, 'Labels must be unique');
export const captureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Invalid capture date');
export const mediaSchema = z
  .object({
    id: mediaId,
    path: z.string(),
    mimeType: z.literal('image/webp'),
    width: z.number().int().positive().max(2400),
    height: z.number().int().positive().max(2400),
    alt: shortText,
    caption: shortText.optional(),
    credit: shortText.optional(),
    capturedOn: captureDate.optional(),
    tags: labels.optional(),
    groups: labels.optional(),
    sha256: digest,
  })
  .strict()
  .superRefine((v, ctx) => {
    const prefix = `/images/${v.id}/`;
    const filename = v.path.startsWith(prefix)
      ? v.path.slice(prefix.length)
      : '';
    if (
      !filename.endsWith('.webp') ||
      !stem.safeParse(filename.slice(0, -5)).success
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['path'],
        message: 'Expected /images/<id>/<safe-stem>.webp',
      });
    }
  });
export type Media = z.infer<typeof mediaSchema>;

export function validateCatalog(records: { source: string; data: unknown }[]) {
  const ids = new Map<string, Media>();
  const paths = new Set<string>();
  for (const { source, data } of records) {
    const result = mediaSchema.safeParse(data);
    if (!result.success)
      throw new Error(`Invalid media ${source}: ${result.error.message}`);
    const item = result.data;
    if (ids.has(item.id))
      throw new Error(`Duplicate media ID ${item.id}: ${source}`);
    if (paths.has(item.path))
      throw new Error(`Duplicate media path ${item.path}: ${source}`);
    if (source !== `${item.id}.json`)
      throw new Error(`Media filename must match ID ${item.id}: ${source}`);
    ids.set(item.id, item);
    paths.add(item.path);
  }
  return ids;
}

export function resolveMedia(
  id: string,
  catalog: ReadonlyMap<string, Media>,
  source: string,
) {
  const item = catalog.get(id);
  if (!item) throw new Error(`Unknown media ID ${id} in ${source}`);
  return { ...item, src: `${mediaOrigin}${item.path}` };
}
