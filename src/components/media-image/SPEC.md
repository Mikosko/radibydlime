# Media image

`MediaImage.astro` renders a published catalog image as exactly one native `<img>`, without client JavaScript or remote build-time requests. It validates `mediaId` and resolves it through the [catalog resolver](../../content/media/SPEC.md) using a supplied validated, read-only `catalog`. Malformed or unknown references fail with the ID, component and route in the diagnostic, including decorative use.

## Inputs and semantics

- Required: `mediaId: Media['id']` and `catalog: ReadonlyMap<string, Media>`. Routes/assembly load the catalog with `getMediaCatalog()` and share it with consumers. The component performs pure lookup, never collection loading.
- Source, intrinsic width/height and informative alt text come from the catalog. `decorative` defaults to false; true renders empty alt for that context without mutating canonical metadata. There is no independent alt override.
- Native defaults are lazy loading and async decoding; priority is omitted for browser auto behavior. Callers may select native `loading`, `decoding` and `fetchpriority` values according to placement.
- `class`, `class:list`, `style`, `id`, `data-*` and `aria-describedby` reach the image, including Astro's caller scope markers. Source, source-set, dimensions, alternative text, accessible-name overrides and executable event attributes cannot be supplied through a spread.
- Optional `sizes` preserves a caller's display-width hint. The current single derivative emits no `srcset`; `sizes` only affects selection after a future catalog/resolver change provides responsive sources. Variant URLs and source-set construction will stay inside this boundary, with the same ID/catalog inputs.

## Presentation boundary

The primitive supplies no wrapper, slot or default visual styles. Consumers own hero/card dimensions, responsive layout, aspect ratio, cropping, radius, shadows, links and figure markup. Captions and credits remain canonical metadata rendered by the consumer when useful. Future heroes, cards, galleries or before/after blocks should compose this primitive without constructing public URLs. Existing local authored images continue using Astro's `Image`.

Example in route assembly:

```astro
---
import MediaImage from '../../components/media-image/MediaImage.astro';
import { getMediaCatalog } from '../../content/media/query';

const catalog = await getMediaCatalog();
const { mediaId } = Astro.props;
---

<MediaImage {mediaId} {catalog} class="w-full" loading="eager" />
```

## Validation

`MediaImage.spec.ts` renders the actual component in isolated Astro builds. It covers canonical/escaped metadata, native defaults and overrides, contextual decoration, unchanged catalog data, attribute protection, caller styling/scopes, and invalid references outside Projects. Shared fixture builds reject network requests, including swallowed failures. Integration tests preserve both route consumers' loading, layout classes, captions/credits, hidden-reference validation and local-image support. These tests run through `npm test` / `npm run validate`; presentation changes also require narrow/wide browser review under the [UI contract](../../styles/UI.md).
