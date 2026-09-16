import { getCollection } from 'astro:content';
import { resolveAuthor } from '../authors/registry';
import { resolveMedia, type Media } from '../media/schema';
import { getMediaCatalog } from '../media/query';

export async function getPublishedProjects(
  catalog?: ReadonlyMap<string, Media>,
) {
  const projects = await getCollection('projects');
  const media = catalog ?? (await getMediaCatalog());
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
    resolveAuthor(data.authorId, data.id);
    if ('mediaId' in data.hero) resolveMedia(data.hero.mediaId, media, data.id);
    for (const item of data.gallery ?? []) {
      if ('mediaId' in item) resolveMedia(item.mediaId, media, data.id);
    }
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
      author: resolveAuthor(project.data.authorId, project.data.id),
      hero:
        'mediaId' in project.data.hero
          ? resolveMedia(project.data.hero.mediaId, media, project.data.id)
          : project.data.hero,
      gallery: (project.data.gallery ?? []).map((item) =>
        'mediaId' in item
          ? resolveMedia(item.mediaId, media, project.data.id)
          : item,
      ),
    }));
}
