# Architecture contract

## Status and scope

Phase 2 implements the approved foundation from [INIT.md](../INIT.md): a static Czech homepage, one site layout, and one sample Project detail route. The application uses Astro 7, strict TypeScript, Tailwind 4, and the Astro Markdoc integration. Package versions are pinned in the npm lockfile.

The product is a Czech-first personal/family website about estate restoration, DIY projects, workshops, journal content, and occasional items for sale. These subjects describe the domain, not a requirement to implement every section now.

## Foundation and invariants

- Use Astro, strict TypeScript, Tailwind CSS, Astro Content Collections, and Markdoc with YAML frontmatter for narrative content.
- Generate static pages by default. Add runtime behavior only for a concrete requirement and an explicit architectural change.
- Git is the canonical source of truth for code, content, published media metadata, small authored local assets, and contracts. Bulk photographic bytes live on external static webhosting; camera originals and local working state stay outside Git. Content must remain portable and understandable without a proprietary service.
- Czech is the primary language. Keep content identity language-neutral and distinct from localized URL slugs; defer a complete internationalization system.
- Do not introduce a database, SSR/runtime server, CMS, authentication, commerce infrastructure, Nx, monorepo tooling, or infrastructure for hypothetical applications. A frontend framework such as React requires a demonstrated need; Astro is the default.
- Prefer the smallest implementation meeting current requirements. Share abstractions only after multiple concrete uses establish the same underlying concept.

## Delivery

The repository is configured for static deployment to GitHub Pages through the official Astro-supported GitHub Actions workflow. Pushes to `main` validate, build, upload, and deploy `dist/`; failed validation prevents publication. The workflow uses GitHub's standard Pages permissions and `github-pages` environment, with serialized production runs.

The production site is served from `https://www.radibydlime.cz/`. Astro sets that origin directly and leaves `base` unset. The GitHub destination is `Mikosko/radibydlime`; Pages settings, DNS, and HTTPS enablement remain owner-admin configuration until their completion is recorded in `README.md`. No runtime adapter, server, database, extra provider, committed build output, `gh-pages` branch, or repository `CNAME` file is part of delivery.

## Responsibility boundaries

- Content Collections own typed domain content and references; see [CONTENT.md](../src/content/CONTENT.md).
- Markdoc bodies express narrative and semantic content. Blocks map authored meaning to presentation; see [BLOCKS.md](../src/blocks/BLOCKS.md).
- Components provide reusable UI; see [COMPONENTS.md](../src/components/COMPONENTS.md).
- Layouts own presentation shells and global chrome independently of content types; see [LAYOUTS.md](../src/layouts/LAYOUTS.md).
- Page routes assemble content and presentation at build time. Do not duplicate content records to display them in multiple contexts.

## Local media authoring

The optional [media CLI](../docs/media.md) separates local preparation/review (`media:process`) from explicit publishing (`media:upload`). ExifTool provides source facts, Sharp prepares one derivative, and a local-only Ollama vision model proposes editable Czech metadata. Human approval seals the exact draft and derivative; deterministic FTPS or SFTP publication verifies bytes before adding a [catalog record](../src/content/media/SPEC.md). FTPS uses verified TLS and whole-directory promotion on a verified compatible host; SFTP uses pinned SSH keys and no-replace hard links. Model/transfer implementations and credentials are machine-side authoring concerns, not website runtime dependencies.

The browser fetches public images from `https://media.radibydlime.cz/images/...`; a centralized origin/path resolver preserves portable content IDs. Astro builds use catalog dimensions and metadata without fetching remote images. Existing authored local assets remain supported. Public byte availability depends on the media host; GitHub Pages delivery, the Astro static output and CI credentials are unchanged. [ADR 0005](decisions/0005-external-media-storage.md) records the deliberate storage change from local images only.

## Styling

The [UI contract](../src/styles/UI.md) owns cross-page visual principles and the Figma exploration/review workflow.

Tailwind is the primary styling approach. Establish only a small coherent foundation for typography, spacing, content widths, responsive behavior, and basic surfaces. Reuse existing design tokens and conventions; avoid a large anticipatory design system. Custom CSS is allowed when Tailwind does not express a requirement cleanly.

## Durable contracts and changes

This file records current architectural rules. Relevant ADRs in [decisions/](decisions/) explain important choices; they are not a second rulebook. Keep current contracts consistent when an approved change supersedes a decision.

Colocate implementation, tests, and a durable `SPEC.md` for concrete reusable units with meaningful behavior or design rules worth preserving. Do not create specifications or tests merely for symmetry. Unit/component tests normally live beside the code; a root integration test directory is reserved for genuinely cross-cutting behavior.

Temporary desired state belongs in `changes/<descriptive-name>.md` and follows [CHANGES.md](../changes/CHANGES.md). Once implemented, preserve lasting rules in the relevant contracts and remove the temporary specification through that lifecycle.

## Implemented slice and validation

The homepage and `/projekty/<slug>/` route query the same published Project records. The [Project contract](../src/content/projects/SPEC.md) defines stable identity, draft/archive visibility, metadata, and validation. The [site layout contract](../src/layouts/site/SPEC.md) defines the shared shell. The sample uses a published media-catalog hero and ordinary Markdoc narrative; local SVG image support remains covered by build fixtures. No JournalEntry or custom content blocks were needed to validate this slice.

Do not pre-build workshop or sale systems, galleries, before/after blocks, editors, authentication, commerce, or an extensive component library. Do not create implementation directories for hypothetical features.

`npm run validate` runs TypeScript/Astro checks, focused local media tests, the production build and Node integration tests, and Prettier validation. Build-time schema and query checks reject malformed metadata, missing local images, and duplicate Project IDs/slugs. Deployment checks also cover production-origin requirements and root-path output. Build-time validation also checks all published media records and Project hero media references, including hidden content. Other relationships remain deferred. No separate linter is configured. Before completing changes, run all configured validation, inspect the final diff against the contracts, and report deviations or unresolved issues.
