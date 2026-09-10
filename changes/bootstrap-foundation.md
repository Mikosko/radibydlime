# Bootstrap the static Czech website

## Goal

Implement the approved Phase 2 foundation from `INIT.md` with the smallest working content-to-page slice.

## Current relevant state

The repository contains Phase 1 architecture, subsystem contracts, and four ADRs. There is no application, dependency configuration, content, or test suite. `AGENTS.md` additionally directs agents to prefer local types/source and official library documentation. Phase 2 is explicitly approved.

## Desired resulting state

- A static Astro application using strict TypeScript, Tailwind, and Markdoc Content Collections.
- A Czech homepage, one site layout with minimal navigation, and one clearly identified sample Project at a Czech detail URL.
- The homepage and detail route use the same collection entry. A stable canonical Project ID is independent of its filename and slug.
- A local sample image with accessible metadata demonstrates the local asset path.
- Typed content validation and focused checks cover malformed content, duplicate identity/URLs, draft visibility, and successful narrative rendering.
- A documented local development and validation workflow with a reproducible dependency lockfile.

## Constraints and affected areas

Follow `architecture/ARCHITECTURE.md` and the content, layouts, components, and blocks contracts. Touch application configuration, Project content and processing, site layout, routes, minimal styles/assets, focused tests, and durable documentation. Keep existing Phase 1 documents and user edits intact except for necessary current-state updates.

Do not add optional JournalEntry content unless the Project slice proves insufficient. Do not add future collections, semantic block catalogs, services, frontend frameworks, or generic query infrastructure.

## Acceptance criteria

- The homepage and one published Project detail page build as static Czech HTML without client-side JavaScript.
- YAML metadata is validated; the Markdoc narrative and local image render successfully.
- A slug/filename change preserves canonical identity. Duplicate IDs/slugs fail validation. Drafts appear in neither public lists nor generated routes.
- TypeScript checks, configured tests, formatting checks, and the production build pass.
- Durable contracts describe the actual implementation and its boundaries; the final changes are reviewed against them.

## Architectural impact

No technology or architectural rule changes. Establish concrete Project identity, visibility, routing, and image conventions only for this slice.

## Git lifecycle

Git author details were not configured at reconnaissance. If commits cannot be made, retain this specification per `CHANGES.md` and report that history preservation and commits remain pending.

## Implementation result

The requested slice is implemented. Durable Project and site layout specifications and the architecture contract describe the resulting application. No optional JournalEntry or future infrastructure was necessary.

Astro/TypeScript checks, nine integration tests, production build, and Prettier validation pass. Browser checks at 1440, 390, and 320 pixels verify navigation with JavaScript disabled, the keyboard skip link, local images, and absence of horizontal overflow or browser errors. Desktop and mobile output were visually reviewed.

Git was initialized locally. Author details are now configured and committing is explicitly authorized. The specification is being preserved in its own commit before the final implementation commit removes this temporary file; application implementation and validation are complete.
