import { getCollection } from 'astro:content';
import { resolveMedia, validateCatalog } from '../media/schema';

export async function getPublishedProjects() {
  const projects = await getCollection('projects');
  const media = validateCatalog(
    (await getCollection('media')).map((entry) => ({
      source: entry.id,
      data: entry.data,
    })),
  );
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
    if ('mediaId' in data.hero) resolveMedia(data.hero.mediaId, media, data.id);
  }

  return projects
    .filter(({ data }) => data.status === 'published')
    .sort(
      (a, b) =>
        b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
        a.data.id.localeCompare(b.data.id),
    )
    .map((project) => ({
      ...project,
      hero:
        'mediaId' in project.data.hero
          ? resolveMedia(project.data.hero.mediaId, media, project.data.id)
          : project.data.hero,
    }));
}
