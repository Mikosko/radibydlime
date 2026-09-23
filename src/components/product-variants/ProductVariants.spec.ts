import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  summarizePrice,
  variantEnquiry,
  formatPrice,
} from '../../content/sale-items/pricing.ts';

test('variant summary uses effective minimum without mixing original prices between variants', () => {
  const variants = [
    { id: 'small', label: 'Malá', priceCzk: 290 },
    { id: 'large', label: 'Velká', priceCzk: 690, salePriceCzk: 250 },
  ];
  assert.deepEqual(summarizePrice({ variants }), {
    text: `od ${formatPrice(250)}`,
    original: undefined,
    discount: 'Vybrané varianty ve slevě',
  });
  assert.equal(
    summarizePrice({
      variants: variants.map((v) => ({ ...v, salePriceCzk: 0 })),
    }).discount,
    'Sleva',
  );
  assert.equal(
    summarizePrice({
      variants: [{ id: 'only', label: 'Jedna', priceCzk: 500 }],
    }).discount,
    undefined,
  );
});
test('single-price products retain agreement and discount behavior', () => {
  assert.equal(summarizePrice({}).text, 'Cena dohodou');
  assert.deepEqual(summarizePrice({ priceCzk: 690, salePriceCzk: 550 }), {
    text: formatPrice(550),
    original: formatPrice(690),
    discount: 'Sleva',
  });
});
test('enquiry encodes product and variant identity, Czech label and effective price', () => {
  const url = new URL(
    variantEnquiry('Kytice & radost', 'sale-0004', {
      id: 'medium',
      label: 'Střední',
      priceCzk: 490,
      salePriceCzk: 390,
    }),
  );
  assert.equal(
    url.searchParams.get('subject'),
    'Dotaz k inzerci: Kytice & radost (sale-0004) — Střední (medium)',
  );
  assert.match(url.searchParams.get('body')!, /390/);
  assert.doesNotMatch(url.searchParams.get('body')!, /490/);
});
