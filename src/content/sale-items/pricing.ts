export interface Price {
  priceCzk?: number;
  salePriceCzk?: number;
}
export interface Variant extends Price {
  id: string;
  label: string;
  priceCzk: number;
}
export const formatPrice = (price?: number) =>
  price === undefined
    ? 'Cena dohodou'
    : new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
      }).format(price);
export function summarizePrice(product: Price & { variants?: Variant[] }) {
  const variants = product.variants;
  if (!variants?.length)
    return {
      text: formatPrice(product.salePriceCzk ?? product.priceCzk),
      original:
        product.salePriceCzk === undefined
          ? undefined
          : formatPrice(product.priceCzk),
      discount: product.salePriceCzk === undefined ? undefined : 'Sleva',
    };
  const minimum = Math.min(
    ...variants.map((v) => v.salePriceCzk ?? v.priceCzk),
  );
  const discounted = variants.filter(
    (v) => v.salePriceCzk !== undefined,
  ).length;
  return {
    text: `od ${formatPrice(minimum)}`,
    original: undefined,
    discount:
      discounted === 0
        ? undefined
        : discounted === variants.length
          ? 'Sleva'
          : 'Vybrané varianty ve slevě',
  };
}
export function variantEnquiry(
  title: string,
  productId: string,
  variant: Variant,
) {
  return `mailto:info@radibydlime.cz?subject=${encodeURIComponent(`Dotaz k inzerci: ${title} (${productId}) — ${variant.label} (${variant.id})`)}&body=${encodeURIComponent(`Mám zájem o ${title}, varianta ${variant.label}, za ${formatPrice(variant.salePriceCzk ?? variant.priceCzk)}.`)}`;
}
