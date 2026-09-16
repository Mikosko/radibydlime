# Project content

## Source and identity

`*.mdoc` files in this directory are the `projects` Content Collection. `content.config.ts` owns the schema; `query.ts` supplies published Projects to the homepage, `/kapitoly/` index, and detail routes.

Frontmatter `id` is the canonical identity: a type-qualified, language-neutral sequence such as `project-0001`. Assign a new unused number to a new object; never recycle or change an existing ID when renaming its file, title, or slug. Future cross-content references must target this `data.id`.

Astro's `entry.id` is an internal source-file key, deliberately distinct from domain identity. Keeping source keys distinct lets validation detect duplicate frontmatter IDs and slugs instead of allowing the loader to overwrite an entry. Do not use `entry.id` as a durable cross-content reference.

The separate `slug` is a lowercase, hyphenated Czech URL spelling without diacritics, used at `/projekty/<slug>/`. IDs and slugs must be unique across all Projects, including hidden entries. `getPublishedProjects()` validates both before filtering and is used by every current public consumer.

## Fields and visibility

Required metadata: `id`, `slug`, nonempty `title` and `summary`, `topic`, `authorId`, `status`, `publishedAt`, and `hero` with a valid local `src` and nonempty informative `alt`. `topic` is a concise Czech editorial label such as `Obnova domu`, `Dřevo a řemeslo`, or `Zahrada`; it identifies the subject without creating a taxonomy route. The detail header derives the parent section label `Kapitoly` from the Project content type and presents it with the authored topic and date. `authorId` references a stable profile in `src/content/authors/registry.ts`; published and hidden entries reject unknown authors during collection validation. The profile owns reusable author wording, biography and portrait, while the article stores only the relationship. Hero `caption` and `credit` are optional and shown on the detail page when supplied. Alternatively, `hero: { mediaId }` references the [published media catalog](../media/SPEC.md), which owns alt text, optional caption/credit and intrinsic dimensions. These two hero forms are mutually exclusive. Local paths resolve relative to the content file. Dates are displayed in Czech using UTC so calendar dates do not shift with the build machine's timezone.

An author's optional decorative ornament also belongs to that author profile, so every article by the same author uses the same author-card treatment. It is distinct from the article-specific `sidebarPoster`.

An optional `sidebarPoster` gives an individual Project a short quote and local decorative illustration for its article-orientation rail. The quote is real text; the illustration is presentational and receives empty alternative text. Keeping this pair in frontmatter lets each post choose or omit its own note without coupling the layout to one message.

An optional `gallery` contains one to eight images in authored order for the closing [ArticleGallery](../../components/article-gallery/SPEC.md). Each item uses either a stable published `mediaId` or a local `src` with informative `alt` and optional `caption`/`credit`. Catalog items inherit their public URL, alt text, dimensions, caption, and credit from the media catalog; do not repeat these fields in frontmatter. The gallery is omitted when absent. Its images follow the narrative and precede adjacent-article navigation.

- `published`: included on the homepage and emitted as a detail route.
- `draft`: retained in source, excluded from public lists and routes.
- `archived`: retained in source, excluded from public lists and routes in this initial implementation. This is unpublishing, not a public archive or redirect service.

`publishedAt` is a displayed date and descending sort key, not a scheduling mechanism. All entries require it in this small schema; only an explicit `published` status makes an entry public. Equal dates sort by canonical ID. When no entries are public, the homepage shows a Czech empty state.

The Project detail route uses that same published ordering for its closing article navigation. It labels adjacent entries explicitly as newer or older, omits a direction when there is no adjacent Project, and resolves links from localized slugs while preserving canonical IDs as content identity.

The `/kapitoly/` index uses that same published ordering without copying Project metadata. It gives the newest story an editorial feature and lists remaining stories below, linking each image and title to its detail route. Every entry displays the resolved author, topic, and publication date without chapter numbering. A no-content state replaces the feature when nothing is published. No category taxonomy, filters, or client-side script are introduced.

Markdoc supplies ordinary narrative elements plus the explicit [article image and illustrated-section tags](../../blocks/BLOCKS.md). Raw HTML is disabled; unsupported tags fail the build. The Project route derives its desktop article-orientation rail from rendered level-two Markdoc headings and their generated fragment IDs, so authors do not duplicate a table of contents in frontmatter. The rail is omitted where the layout no longer has a left sidebar at narrower widths. Heroes and narrative image blocks reference published media by stable ID; invalid IDs fail the build. No generalized queries are implemented. Future relationship fields also need canonical-ID target validation. Narrative headings start at level two because the route owns the page's level-one title.

## Validation

Schema validation covers metadata and local image references. Public collection queries reject duplicate identities and URLs and resolve all Project media IDs before visibility filtering. `getPublishedProjects(catalog?)` accepts a catalog already validated by `getMediaCatalog()`, or loads and validates it when omitted. Homepage assembly and detail `getStaticPaths()` share their catalog with the query and image components. Both routes retain the resolved hero for canonical caption/credit data and pass its stable ID to [MediaImage](../../components/media-image/SPEC.md); local heroes retain Astro's `Image`. Remote derivatives render with public URLs and explicit dimensions; the build never fetches them. Integration tests in `tests/integration/content-build.spec.ts` exercise the actual Astro build, identity preservation under renaming, hidden content, malformed content, and output rendering in isolated temporary copies.

`entrance-door.mdoc` remains explicitly labeled sample narrative and uses locally authored sample photography while the editorial article presentation is reviewed. The local SVG remains available for build fixtures, and production photographic content can continue to use published media IDs.
