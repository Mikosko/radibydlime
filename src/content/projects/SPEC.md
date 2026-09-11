# Project content

## Source and identity

`*.mdoc` files in this directory are the `projects` Content Collection. `content.config.ts` owns the schema; `query.ts` supplies published Projects to the homepage and detail routes.

Frontmatter `id` is the canonical identity: a type-qualified, language-neutral sequence such as `project-0001`. Assign a new unused number to a new object; never recycle or change an existing ID when renaming its file, title, or slug. Future cross-content references must target this `data.id`.

Astro's `entry.id` is an internal source-file key, deliberately distinct from domain identity. Keeping source keys distinct lets validation detect duplicate frontmatter IDs and slugs instead of allowing the loader to overwrite an entry. Do not use `entry.id` as a durable cross-content reference.

The separate `slug` is a lowercase, hyphenated Czech URL spelling without diacritics, used at `/projekty/<slug>/`. IDs and slugs must be unique across all Projects, including hidden entries. `getPublishedProjects()` validates both before filtering and is used by every current public consumer.

## Fields and visibility

Required metadata: `id`, `slug`, nonempty `title` and `summary`, `status`, `publishedAt`, and `hero` with a valid local `src` and nonempty informative `alt`. Hero `caption` and `credit` are optional and shown on the detail page when supplied. Alternatively, `hero: { mediaId }` references the [published media catalog](../media/SPEC.md), which owns alt text, optional caption/credit and intrinsic dimensions. These two hero forms are mutually exclusive. Local paths resolve relative to the content file. Dates are displayed in Czech using UTC so calendar dates do not shift with the build machine's timezone.

- `published`: included on the homepage and emitted as a detail route.
- `draft`: retained in source, excluded from public lists and routes.
- `archived`: retained in source, excluded from public lists and routes in this initial implementation. This is unpublishing, not a public archive or redirect service.

`publishedAt` is a displayed date and descending sort key, not a scheduling mechanism. All entries require it in this small schema; only an explicit `published` status makes an entry public. Equal dates sort by canonical ID. When no entries are public, the homepage shows a Czech empty state.

Markdoc supplies ordinary narrative elements. Raw HTML is disabled; unsupported tags fail the build. The hero media reference is the first implemented cross-content relationship. No custom block tags or generalized queries are implemented. Future relationship fields also need canonical-ID target validation. Narrative headings start at level two because the route owns the page's level-one title.

## Validation

Schema validation covers metadata and local image references. Public collection queries reject duplicate identities and URLs and resolve all Project media IDs before visibility filtering. `getPublishedProjects(catalog?)` accepts a catalog already validated by `getMediaCatalog()`, or loads and validates it when omitted. Homepage assembly and detail `getStaticPaths()` share their catalog with the query and image components. Both routes retain the resolved hero for canonical caption/credit data and pass its stable ID to [MediaImage](../../components/media-image/SPEC.md); local heroes retain Astro's `Image`. Remote derivatives render with public URLs and explicit dimensions; the build never fetches them. Integration tests in `tests/integration/content-build.spec.ts` exercise the actual Astro build, identity preservation under renaming, hidden content, malformed content, and output rendering in isolated temporary copies.

`entrance-door.mdoc` and its local SVG are explicitly labeled sample content, to be replaced with real authored material.
