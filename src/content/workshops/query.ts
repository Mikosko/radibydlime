import { resolveAuthor } from '../authors/registry';
import { getCollection } from 'astro:content';
import { getMediaCatalog } from '../media/query';
import { resolveMedia, type Media } from '../media/schema';
import { durationLabel } from './format';
export async function getPublishedWorkshops(
  catalog?: ReadonlyMap<string, Media>,
) {
  const media = catalog ?? (await getMediaCatalog());
  const ids = new Set<string>(),
    slugs = new Set<string>();
  const entries = (await getCollection('workshops')).map((entry) => {
    const { data } = entry,
      e = data.event;
    if (ids.has(data.id)) throw new Error(`Duplicate Workshop ID: ${data.id}`);
    if (slugs.has(data.slug))
      throw new Error(`Duplicate Workshop slug: ${data.slug}`);
    ids.add(data.id);
    slugs.add(data.slug);
    if (e.state !== 'preparing') {
      durationLabel(e.startsAt, e.endsAt);
      if (
        e.reserved > e.capacity ||
        (e.state === 'open' && e.reserved === e.capacity) ||
        (e.state === 'full' && e.reserved !== e.capacity)
      )
        throw new Error(`Invalid workshop capacity: ${data.id}`);
    }
    return {
      ...entry,
      hosts: data.hostIds.map((id) => resolveAuthor(id, data.id)),
      hero:
        'mediaId' in data.hero
          ? resolveMedia(data.hero.mediaId, media, data.id)
          : data.hero,
    };
  });
  return entries
    .filter((e) => e.data.status === 'published')
    .sort((a, b) => {
      const x = a.data.event,
        y = b.data.event;
      const rank = (state: string) =>
        state === 'preparing' ? 1 : state === 'ended' ? 2 : 0;
      if (rank(x.state) !== rank(y.state)) return rank(x.state) - rank(y.state);
      if (x.state === 'preparing' || y.state === 'preparing')
        return a.data.id.localeCompare(b.data.id);
      return (
        (x.state === 'ended' && y.state === 'ended' ? -1 : 1) *
          (Date.parse(x.startsAt) - Date.parse(y.startsAt)) ||
        a.data.id.localeCompare(b.data.id)
      );
    });
}
