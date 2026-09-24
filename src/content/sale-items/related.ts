interface RelatedItem {
  data: { id: string; category: string; status: string; availability: string };
}
/** Same-category available items first, then other available items; never self. */
export function relatedSaleItems<T extends RelatedItem>(
  items: readonly T[],
  currentId: string,
): T[] {
  const current = items.find((item) => item.data.id === currentId);
  if (!current) return [];
  return items
    .filter(
      (item) =>
        item.data.id !== currentId &&
        item.data.status === 'published' &&
        item.data.availability === 'available',
    )
    .sort(
      (a, b) =>
        Number(b.data.category === current.data.category) -
          Number(a.data.category === current.data.category) ||
        a.data.id.localeCompare(b.data.id),
    )
    .slice(0, 3);
}
