# Component contract

- Use Astro components by default. Ship client-side JavaScript only when interaction requires it.
- Use Tailwind and the project's established styling tokens and conventions.
- Accessibility is required: use semantic HTML, appropriate accessible names, keyboard-operable interactions, and visible focus where applicable.
- Presentational components receive data through typed inputs; they do not fetch or query content themselves. Routes or other assembly code supply it.
- Extract shared components only when concrete reuse establishes a common concept. Do not build a component library during initialization.
- Colocate tests for meaningful local behavior. Add a local `SPEC.md` when durable behavioral or design rules warrant it; do not create either for symmetry alone.

A unit with such a contract may use `src/components/workshop-card/WorkshopCard.astro`, `WorkshopCard.spec.ts`, and `SPEC.md`. This illustrates colocation only; it is not an instruction to create a workshop card.

Render published media IDs through [MediaImage](media-image/SPEC.md), supplying a validated catalog from route/assembly code. It owns native image semantics and resolution; consumers own contextual presentation, captions and credits. Local authored assets continue using Astro's `Image`.

The shared site shell composes [TopNavigation](top-navigation/SPEC.md). It owns the canonical logo link, current primary destination and responsive header composition, with a small native-dialog enhancement for the mobile menu.

[BrandMark](brand-mark/SPEC.md) owns the reusable live wordmark, heart, and botanical relationship used by the shared header and illustrated footer. Its consumers own links, supporting taglines, and surrounding composition.

[ArticleActions](article-actions/SPEC.md) provides the progressively enhanced favorite and share controls used by article pages. Favorites remain a browser-local preference keyed by stable content ID; the component introduces no account or runtime service.

[AuthorCard](author-card/SPEC.md) renders a reusable author widget from a profile resolved by route assembly. Article content references stable author IDs, while the profile owns its Czech heading, identity, biography, portrait, optional decoration, and optional real profile link.

[FigureCaption](figure-caption/SPEC.md) presents canonical image captions and credits beneath article figures without owning or rewriting their content.

[ArticleGallery](article-gallery/SPEC.md) renders an article's optional, ordered image diary from resolved Project gallery items.

[PageHeader](page-header/SPEC.md) centralizes section-page introductory typography with a right-hand artwork slot. The landing page and detail-page editorial titles remain separate.

[PageContainer](page-container/SPEC.md) owns the shared section-page content width and vertical spacing inside the site shell.
