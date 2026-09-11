# Reusable media-catalog image primitive

## Goal

Introduce one small Astro component for rendering a stable media ID as a native image. Centralize catalog lookup and baseline image semantics while keeping contextual layout and visual treatment with consumers. This request authorizes the temporary specification only; implementation and commits follow separate human approval under [CHANGES.md](CHANGES.md).

## Reconnaissance and current state

- Read `AGENTS.md`, `architecture/ARCHITECTURE.md`, `changes/CHANGES.md`, `src/components/COMPONENTS.md`, `src/styles/UI.md`, `src/content/CONTENT.md`, the media and Project `SPEC.md` files, and the site layout `SPEC.md`. Inspected both routes, Project queries, collection schemas, global styles, package scripts and existing tests. The working tree was clean before this specification.
- `src/components/` currently contains only its contract. Its documented convention is a kebab-case unit directory containing a PascalCase Astro component, a colocated test and `SPEC.md`. There is no existing image component or component test harness to extend.
- The component contract requires typed data from routes/assembly code and prohibits content queries inside presentational components. Pure lookup in a supplied catalog can satisfy the requested ID-resolution responsibility without changing this rule.
- `src/content/media/schema.ts` owns `Media`, the `mediaId` validator, `validateCatalog()`, the public origin and `resolveMedia(id, catalog, source)`. Records require one WebP path, intrinsic dimensions and informative alt text; caption/credit are optional. There is one published record, with no responsive variants.
- `src/content/projects/query.ts` loads and validates the media collection, checks references for all Projects before filtering visibility, and returns a resolved `hero` alongside source data. The homepage and Project detail already duplicate native remote `<img>` rendering. The sole authored Project still uses its local SVG, so the catalog image does not currently appear on those pages.
- The homepage remote branch specifies lazy loading and card-specific Tailwind classes. The detail branch specifies eager loading and hero-specific classes inside a figure; it renders canonical caption/credit outside the image. Local branches use `astro:assets`.
- `tests/integration/content-build.spec.ts` builds isolated project copies and covers remote URLs, dimensions, alt/caption/credit, unknown references including hidden Projects, catalog validation, local images and static output. Component-specific loading, decoration and attribute-forwarding tests do not yet exist.
- The project uses Astro 7, strict TypeScript, Tailwind 4 and Node's test runner. Installed Astro types expose native image attributes including `loading`, `decoding`, `fetchpriority` and `sizes`; no new image dependency is needed. Repository-local implementation/types were sufficient for reconnaissance. No architecture convention is being replaced, so additional ADR research was unnecessary.

## Proposed component and data flow

Create `src/components/media-image/MediaImage.astro`, with `MediaImage.spec.ts` and a durable `SPEC.md` beside it. The name distinguishes catalog media from Astro's existing local-asset `Image` component.

Required typed inputs are `mediaId`, using the existing media ID model, and `catalog`, a validated media lookup supplied by route/assembly code. The component validates the reference and calls the existing `resolveMedia` function against that lookup. It must not accept a raw URL or an independently assembled image object as an alternative input.

Keep collection loading in the content/assembly layer. A small `src/content/media/query.ts` helper may extract the existing collection-to-validated-map loading from the Project query so routes can supply the same catalog to image instances. Preserve the Project query's validation and returned content semantics; reuse loaded data within an assembly operation rather than loading the entire collection for each image. Do not introduce a global mutable cache, provider/context framework, registry or runtime API. A read-only catalog input/type adjustment is acceptable without changing record schemas.

Invalid or unknown IDs must fail the build with a useful diagnostic identifying the reference and rendering/owning context. Do not silently omit the image, emit a broken URL, use a placeholder or fetch remote data to recover. Existing validation of the complete catalog and references in hidden Projects remains in place.

## Native rendering contract

- Render exactly one semantic `<img>` with the resolver-provided public source, catalog `width` and `height`, and catalog `alt` for normal informative use. Keep dimension attributes even when CSS controls displayed size. Do not infer remote dimensions.
- Default to `loading="lazy"` and `decoding="async"`. Accept the corresponding native overrides: lazy/eager loading and async/auto/sync decoding. Omit `fetchpriority` by default, retaining browser `auto`; permit explicit auto/high/low. Above-the-fold placement is a caller decision: callers select eager loading and, when justified, high priority. Do not infer importance from component position or impose preload links.
- Support `decorative?: boolean`, default false. The content contract already allows explicitly decorative images to have empty alternatives, although catalog records retain informative descriptions. `decorative=true` emits `alt=""` for that contextual use without changing catalog metadata. It does not add visual treatment. Do not offer a free-form alt override or infer decoration from missing metadata. Decorative use still requires a valid catalog record.
- Provide a small typed presentation/annotation surface: `class`, Astro `class:list`, native `style`, `id`, `data-*` and `aria-describedby`. Apply supported attributes directly to the `<img>`; preserve Astro's normal class composition and scoped-style behavior. No additional wrapper, slot, default sizing/crop classes, radius, shadow, background or aspect-ratio style belongs in the primitive.
- Catalog-owned `src`, `srcset`, intrinsic `width`/`height` and alternative-text semantics cannot be overridden through attribute spreading. Do not expose arbitrary accessible-name overrides or executable event attributes. Normal Astro escaping applies to metadata and attributes.
- Caption, credit, figure markup, surrounding links and their accessible names remain with consuming components/routes, using canonical metadata where relevant. The primitive neither duplicates those fields nor automatically displays them.

## Responsibility boundary

| Layer                              | Owns                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media catalog and resolver         | Canonical identity, public metadata, origin/path mapping, validation, and any future derivative descriptions. Collection loading remains in content/assembly code.                                                                    |
| `MediaImage`                       | Resolving the supplied ID, selecting the public source through the resolver, intrinsic HTML metadata, informative/decorative alt behavior, native loading controls, and future translation of catalog variants into image attributes. |
| Routes and higher-level components | Supplying validated data, selecting IDs, contextual accessibility intent, image priority, responsive display widths, sizing, cropping, layout, captions/credits, figures, links and visual styling.                                   |

Future project heroes, cards, galleries and before/after blocks should compose this primitive and own their respective layouts or interactions. This change creates none of those higher-level abstractions.

## Initial integration and future variants

Replace only the two existing remote-image branches in `src/pages/index.astro` and `src/pages/projekty/[slug].astro` with the primitive, passing stable IDs and assembly-supplied catalog data. This is the concrete reuse justifying extraction. Preserve their existing classes, lazy/eager choices, caption/credit behavior and local `astro:assets` branches. Do not replace the sample SVG, change authored content or redesign either page to demonstrate the component; isolated fixtures exercise remote rendering.

Keep consumers independent of the number and naming of derivatives. The current output has one `src` and no fabricated `srcset`, `<picture>` alternatives, query-based transformations or variant schema fields. Accept an optional native `sizes` hint from callers describing contextual display width; it has no source-selection effect while no width-based `srcset` exists. Document that boundary rather than guessing card/hero widths inside the primitive.

When a later approved change adds variants to the catalog/resolver, this component can produce catalog-derived `srcset` while keeping the existing ID/catalog call boundary. Callers must never construct variant URLs. New layout-specific `sizes` hints may refine selection; no consumer migration to another image component or raw URLs should be necessary. Derivative generation and actual responsive source selection are outside this iteration.

## Affected areas and architectural impact

Implementation should be limited to the new component unit, minimal shared media lookup/query adjustments, both existing remote-image branches, relevant tests/test-script wiring, and durable contract updates. Document the primitive and its usage in `src/components/COMPONENTS.md` and `src/content/media/SPEC.md`; update the Project `SPEC.md` if its assembly/query description changes. Keep current contracts consistent without duplicating HTML implementation details across documents.

There is no production architecture change: the site remains fully static; Git owns media metadata and hosting stays replaceable through the existing resolver. Pure resolution of supplied data preserves the existing component contract, so no content-query exception or new ADR is required. Preserve the catalog shape, media CLI, hosting/credential configuration, deployment workflow, UI principles and Tailwind tokens.

No SSR, database, runtime media API, client-side JavaScript, client hydration, image SaaS, third-party image component, remote build-time download/probe/transformation, Figma work, gallery system or speculative variant pipeline is in scope.

## Validation and observable acceptance criteria

Use the existing Node/TypeScript and isolated Astro build approach. Add meaningful component tests beside `MediaImage.astro` and wire them into the normal test/validation command. Render the actual Astro component; do not test only source-code strings or a duplicated props implementation. Share a small build-fixture helper with integration tests only if needed, without introducing a new test framework or component-preview application.

Acceptance requires:

1. A valid fixture ID produces exactly the resolver's public image URL, catalog width/height and canonical alt text in an `<img>`. Metadata containing special characters is safely escaped. The catalog/resolver remains the only origin/URL authority.
2. Default lazy loading, async decoding and browser-default priority are observable in generated HTML. Explicit eager loading, supported decoding and high/low/auto priority overrides are honored independently.
3. Explicit decorative use emits empty alt text while leaving the catalog unchanged. Informative use cannot override or omit the canonical alternative, and decorative mode does not excuse an invalid reference.
4. Malformed and unknown IDs fail with useful diagnostics, including when the primitive is rendered directly outside a Project. Invalid catalog entries and unknown references in hidden Projects continue failing through existing content validation.
5. Caller classes, `class:list`, inline presentation styles and supported annotation attributes reach the native image correctly. Reserved source/dimension/alt attributes cannot bypass the abstraction, including when props are spread. The primitive adds no contextual crop, size, radius, shadow or wrapper.
6. Single-derivative rendering emits no invented `srcset`; optional `sizes` is preserved as a native caller hint. No variant schema or generation changes are introduced.
7. Both real route consumers use the primitive for media-ID heroes. Build fixtures preserve homepage lazy loading, detail eager loading, contextual classes and figure caption/credit. Existing local image rendering and sample content still work.
8. The production build succeeds with catalog fixture paths that have no uploaded bytes and without contacting external media hosting. Generated output contains no component JavaScript, hydration islands, processor references or copied/transformed remote assets. Use a request guard where needed to prove the absence of remote image fetches.
9. `npm run validate` runs the new component tests alongside the existing tests, Astro/TypeScript checks, static build and formatting checks. Review narrow/wide rendering for undistorted images and preservation of consumer layout, and verify informative/decorative native semantics.

This specification is the only file created for the current request. Implementation, testing of the future component, durable contract changes and specification removal belong to the subsequent approved implementation phase.
