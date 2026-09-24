import assert from 'node:assert/strict';
import { test } from 'node:test';
import { relatedSaleItems } from '../../content/sale-items/related.ts';
const item = (
  id: string,
  category: string,
  availability = 'available',
  status = 'published',
) => ({ data: { id, category, availability, status } });
test('related products prioritize category and omit current, hidden and unavailable products', () => {
  const items = [
    item('01', 'garden'),
    item('02', 'home'),
    item('03', 'garden', 'sold'),
    item('04', 'garden', 'reserved'),
    item('05', 'garden', 'available', 'draft'),
    item('06', 'garden'),
    item('07', 'garden'),
    item('08', 'home'),
  ];
  assert.deepEqual(
    relatedSaleItems(items, '01').map((i) => i.data.id),
    ['06', '07', '02'],
  );
  assert.equal(items[0].data.id, '01');
});
test('related products handle small and empty candidate pools', () => {
  assert.deepEqual(relatedSaleItems([item('01', 'garden')], '01'), []);
  assert.deepEqual(relatedSaleItems([item('01', 'garden')], 'missing'), []);
  assert.equal(
    relatedSaleItems([item('01', 'garden'), item('02', 'home')], '01').length,
    1,
  );
});
