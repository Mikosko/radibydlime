import { getCollection } from 'astro:content';
import { getMediaCatalog } from '../media/query';
import { resolveMedia, type Media } from '../media/schema';

export async function getAlbums(catalog?: ReadonlyMap<string, Media>) {
  const media = catalog ?? (await getMediaCatalog());
  const albums = await getCollection('albums');
  const projects = await getCollection('projects');
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const resolved = albums.map((album) => {
    const { data } = album;
    if (ids.has(data.id)) throw new Error(`Duplicate Album ID: ${data.id}`);
    if (slugs.has(data.slug))
      throw new Error(`Duplicate Album slug: ${data.slug}`);
    ids.add(data.id);
    slugs.add(data.slug);
    const project = data.projectId
      ? projects.find(({ data: p }) => p.id === data.projectId)
      : undefined;
    if (data.projectId && !project)
      throw new Error(`Unknown Project ID ${data.projectId} in ${data.id}`);
    const imageKeys = new Set<string>();
    const images = data.images.map((image) => {
      const key = 'mediaId' in image ? image.mediaId : image.src.src;
      if (imageKeys.has(key))
        throw new Error(`Duplicate image ${key} in ${data.id}`);
      imageKeys.add(key);
      return 'mediaId' in image
        ? resolveMedia(image.mediaId, media, data.id)
        : image;
    });
    return {
      ...album,
      images,
      cover: images[0]!,
      project: project?.data.status === 'published' ? project : undefined,
    };
  });
  return resolved.sort(
    (a, b) =>
      b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
      a.data.id.localeCompare(b.data.id),
  );
}

export async function getPublishedAlbums(catalog?: ReadonlyMap<string, Media>) {
  return (await getAlbums(catalog)).filter(
    ({ data }) => data.status === 'published',
  );
}
