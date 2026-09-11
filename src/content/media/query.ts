import { getCollection } from 'astro:content';
import { validateCatalog } from './schema';

/** Load and validate once per assembly operation, then share with consumers. */
export async function getMediaCatalog() {
  return validateCatalog(
    (await getCollection('media')).map((entry) => ({
      source: entry.id,
      data: entry.data,
    })),
  );
}
