import { getCollection } from 'astro:content';
import { getMediaCatalog } from '../media/query';
import { resolveMedia, type Media } from '../media/schema';

export const availabilityLabels = {
  available: 'K dispozici',
  reserved: 'Zamluveno',
  sold: 'Prodáno',
};
export { formatPrice } from './pricing';

export async function getPublishedSaleItems(
  catalog?: ReadonlyMap<string, Media>,
) {
  const media = catalog ?? (await getMediaCatalog());
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const items = (await getCollection('saleItems')).map((entry) => {
    const { data } = entry;
    if (ids.has(data.id)) throw new Error(`Duplicate SaleItem ID: ${data.id}`);
    if (slugs.has(data.slug))
      throw new Error(`Duplicate SaleItem slug: ${data.slug}`);
    ids.add(data.id);
    slugs.add(data.slug);
    const keys = new Set<string>();
    const images = data.images.map((image) => {
      const key = 'mediaId' in image ? image.mediaId : image.src.src;
      if (keys.has(key))
        throw new Error(`Duplicate SaleItem image: ${data.id}: ${key}`);
      keys.add(key);
      return 'mediaId' in image
        ? resolveMedia(image.mediaId, media, data.id)
        : image;
    });
    return { ...entry, images, cover: images[0]! };
  });
  return items
    .filter((item) => item.data.status === 'published')
    .sort((a, b) => a.data.id.localeCompare(b.data.id));
}
