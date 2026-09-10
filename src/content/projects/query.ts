import { getCollection } from 'astro:content';

export async function getPublishedProjects() {
  const projects = await getCollection('projects');
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const { data } of projects) {
    if (ids.has(data.id)) {
      throw new Error(`Duplicate Project ID: ${data.id}`);
    }
    if (slugs.has(data.slug)) {
      throw new Error(`Duplicate Project slug: ${data.slug}`);
    }
    ids.add(data.id);
    slugs.add(data.slug);
  }

  return projects
    .filter(({ data }) => data.status === 'published')
    .sort(
      (a, b) =>
        b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
        a.data.id.localeCompare(b.data.id),
    );
}
