import { getCollection } from 'astro:content';

export async function getContacts() {
  const entries = await getCollection('contacts');
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const { data } of entries) {
    if (ids.has(data.id) || slugs.has(data.slug)) {
      throw new Error(
        `Duplicate contact ID or slug: ${data.id} / ${data.slug}`,
      );
    }
    ids.add(data.id);
    slugs.add(data.slug);
  }
  return entries;
}

export async function getContact(id: string) {
  const entry = (await getContacts()).find((entry) => entry.data.id === id);
  if (!entry)
    throw new Error(
      `Unknown contact: ${id}. Retain archived records for printed QR links.`,
    );
  return entry;
}
