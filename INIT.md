# Repository Initialization

You are bootstrapping a new repository for a Czech-first personal/family website about estate restoration, DIY projects, workshops, journal content, and occasional items for sale.

The purpose of this initialization is not to build the full website.

The purpose is to establish a minimal, robust application foundation and an AI-readable repository protocol that future Codex sessions can extend incrementally.

---

# Execution protocol

Work in two phases.

## Phase 1 — Architecture contract

Before implementing application code:

1. Inspect the repository.
2. Read this entire file.
3. Create the initial AI/architecture documentation described below.
4. Review the generated documentation for:
   - contradictions
   - duplicated rules
   - unnecessary complexity
   - missing constraints
   - speculative architecture
5. Present a concise summary of the resulting architecture.
6. STOP.

Do not initialize or implement the Astro application during Phase 1.

Do not proceed to Phase 2 until explicitly instructed.

## Phase 2 — Bootstrap implementation

After explicit approval:

1. Re-read `AGENTS.md`.
2. Follow its context-routing rules.
3. Treat the repository documentation created during Phase 1 as the architectural source of truth.
4. Bootstrap the minimum application described by those contracts.
5. Implement only the smallest vertical slice necessary to validate the architecture.
6. Run all configured validation.
7. Review the final diff against the architecture contracts.
8. Report deviations or unresolved issues.

Do not implement predicted future features merely to demonstrate extensibility.

---

# Technical foundation

Use:

- Astro
- TypeScript in strict mode
- Tailwind CSS
- Astro Content Collections
- Markdoc for narrative/rich content
- YAML frontmatter
- local images
- static generation by default
- Git as the canonical source of truth

Do not introduce:

- database
- SSR/runtime server
- CMS
- authentication
- React or another frontend framework unless genuinely required
- commerce infrastructure
- Nx
- monorepo tooling
- speculative infrastructure
- speculative abstractions for anticipated features

Czech is the primary language.

The architecture should remain translation-ready, but do not implement a complete internationalization system yet.

Content identity must use stable language-neutral IDs.

Localized URL slugs may be Czech, but slugs must not be used as canonical cross-content identifiers.

---

# Engineering principles

Prefer the smallest implementation satisfying current requirements.

Do not implement speculative abstractions.

Introduce shared abstractions only when multiple concrete use cases demonstrate the same underlying concept.

Prefer static generation until a concrete requirement requires runtime behavior.

Content must remain portable and understandable without a proprietary CMS or service.

Git is the canonical source of truth.

The repository should be intentionally easy for both humans and AI agents to understand.

Documentation should be concise, high-density, and loaded progressively rather than globally.

---

# AI-readable repository protocol

Create this documentation hierarchy:

```text
AGENTS.md

architecture/
  ARCHITECTURE.md
  decisions/

changes/
  CHANGES.md

src/
  components/
    COMPONENTS.md

  blocks/
    BLOCKS.md

  layouts/
    LAYOUTS.md

  content/
    CONTENT.md
```

Do not create implementation directories for hypothetical features.

---

# AGENTS.md

Keep `AGENTS.md` short.

Its primary responsibility is context routing.

It should instruct future agents to:

- always follow `architecture/ARCHITECTURE.md`
- read `changes/CHANGES.md` only when creating or processing a change specification
- read `src/components/COMPONENTS.md` when working on components
- read `src/blocks/BLOCKS.md` when working on semantic content blocks
- read `src/layouts/LAYOUTS.md` when working on layouts
- read `src/content/CONTENT.md` when working on content models, schemas, or content processing
- read the nearest relevant `SPEC.md` when modifying an existing implementation unit
- consult `architecture/decisions/` only when architectural history or reasoning is relevant

Do not duplicate subsystem rules inside `AGENTS.md`.

Treat `AGENTS.md` as a router, not a complete handbook.

---

# Architecture

Create:

```text
architecture/
  ARCHITECTURE.md
  decisions/
```

`ARCHITECTURE.md` describes current architectural truth.

It should contain current rules and invariants, not long historical explanations.

`architecture/decisions/` stores concise ADR-style documents explaining important architectural choices and why they were made.

Initial ADRs should cover only decisions important enough to prevent accidental reversal, such as:

- static-first architecture
- Git as canonical content storage
- Markdoc for rich content rather than executable content such as MDX
- Tailwind as the primary styling approach

Keep ADRs concise.

Future agents should not read all ADRs by default.

They should consult relevant ADRs only when:

- replacing an architectural technology or convention
- challenging an architectural rule
- resolving a conflict with `ARCHITECTURE.md`
- needing historical reasoning

---

# Change protocol

Create:

```text
changes/
  CHANGES.md
```

A file inside `changes/` represents temporary desired future state.

Before generating a change specification, an agent must perform repository reconnaissance.

The agent should:

1. inspect the affected implementation
2. read `ARCHITECTURE.md`
3. read relevant subsystem documentation
4. read affected local `SPEC.md` files
5. inspect relevant tests
6. consult relevant ADRs only when architectural reasoning is needed
7. identify the likely scope and impact

Then create:

```text
changes/<descriptive-name>.md
```

A change specification should focus on:

- goal
- current relevant state
- desired resulting state
- relevant constraints
- affected areas
- acceptance criteria
- architectural impact, if any

Avoid unnecessary implementation prescriptions.

Prefer behavioral requirements over low-level coding instructions.

Expected lifecycle:

```text
human request
→ repository reconnaissance
→ changes/<name>.md
→ spec commit
→ implementation
→ tests
→ durable SPEC updates
→ validation/build
→ remove temporary change file
→ implementation commit
```

Git history preserves the original temporary change request.

---

# Local implementation contracts

Concrete reusable units should colocate implementation, tests, and durable AI-readable specification when appropriate.

Example:

```text
src/components/workshop-card/
  WorkshopCard.astro
  WorkshopCard.spec.ts
  SPEC.md
```

Meaning:

- `SPEC.md` = durable behavioral/design contract
- `*.spec.ts` = executable contract
- implementation file = actual implementation

Do not create `SPEC.md` files merely for symmetry.

Create them when a concrete unit has meaningful behavior or rules worth preserving.

Unit/component tests should normally live beside the code they test.

Use a root integration test directory only for genuinely cross-cutting behavior.

---

# Components

Create:

```text
src/components/COMPONENTS.md
```

This document defines general component rules.

Initial direction:

- Astro by default
- no client-side JavaScript unless interaction requires it
- Tailwind as primary styling
- accessibility is required
- prefer existing design tokens
- presentational components should not fetch content themselves
- tests should be colocated
- local `SPEC.md` should describe durable behavior when warranted
- avoid speculative generic abstractions

Do not create a large component library during initialization.

---

# Blocks

Create:

```text
src/blocks/BLOCKS.md
```

Blocks represent semantic content concepts rather than arbitrary application code.

The architecture may eventually support concepts such as:

- text
- image
- gallery
- before/after
- quote
- callout
- materials
- measurements
- video
- content feed/query

Do not implement this entire list during bootstrap.

Blocks should express what content means.

Astro decides how that semantic meaning is presented.

Avoid executable application code inside authored content.

---

# Layouts

Create:

```text
src/layouts/LAYOUTS.md
```

Content types and layouts are separate concepts.

A Project, Workshop, JournalEntry, SaleItem, or Page is a domain object.

A layout defines presentation shell/chrome.

Layouts may eventually include concepts such as:

- site
- editorial
- minimal
- landing
- fullscreen

Do not implement them all initially.

Global concerns such as navigation and footer belong to the site/layout layer, not content blocks.

Implement only the minimum layout needed for the initial vertical slice.

---

# Content architecture

Create:

```text
src/content/CONTENT.md
```

Use Astro Content Collections with typed schemas.

Initial durable domain concepts:

- Project
- JournalEntry
- Workshop
- SaleItem
- Page

These are domain types, not page templates.

Each may contain structured metadata plus a flexible Markdoc narrative body.

Support future relationships between content through stable language-neutral IDs.

Do not use localized slugs as cross-content identity.

Use Czech slugs for Czech URLs where appropriate.

Support a lightweight lifecycle where relevant:

- draft
- published
- archived

Content metadata should support only what is currently useful, including where appropriate:

- stable ID
- slug
- title
- summary/description
- publishing dates
- relationships
- hero/image metadata
- SEO/social metadata

Avoid over-modeling hypothetical fields.

Image metadata should support:

- alt text
- optional caption
- optional credit where useful

---

# Shared content

Do not duplicate content merely to display it in several places.

The same content object should be reusable through Content Collection queries.

Examples:

- homepage can show latest JournalEntries
- project page can show related JournalEntries
- homepage can show upcoming Workshops
- sale listing can show available SaleItems

Future semantic feed/query blocks may express intent such as:

```text
latest
tagged
related
manual
upcoming
available
```

Do not build a generalized query engine during bootstrap.

---

# Styling

Use Tailwind CSS.

Establish a small coherent styling foundation for:

- typography
- spacing
- content widths
- responsive behavior
- basic surface treatment

Prefer reusable design tokens and established conventions over arbitrary values.

Avoid building a large design system before real use cases exist.

Tailwind is preferred partly because styles remain local and explicit, refactoring is predictable, and AI agents can reason about component styling without searching large CSS graphs.

Custom CSS is allowed where Tailwind does not model a requirement cleanly.

---

# Testing and validation

During Phase 2, configure appropriate validation.

Prefer colocated tests for local behavior.

Use something like:

```text
tests/
  integration/
```

only for genuinely cross-cutting behavior such as:

- route generation
- content build validity
- broken content references

Build-time validation should catch malformed content and invalid references where practical.

Before completion of Phase 2:

- run TypeScript checks
- run configured tests
- run Astro production build
- run lint/format validation if configured
- inspect the final diff
- compare implementation with the architectural contracts

---

# Initial visible application scope

Keep the initial website deliberately small.

Build only enough of a vertical slice to prove that the foundation works.

A reasonable initial scope is:

- minimal Czech homepage
- one base/site layout
- minimal navigation
- one sample Project
- optionally one sample JournalEntry
- basic route/rendering for those examples

Do not pre-build:

- workshop system
- sale section
- gallery system
- before/after block
- AI editor
- CMS
- authentication
- commerce
- extensive design-system components

Those should arrive through future change specifications when real requirements exist.

---

# Future architecture

Do not design infrastructure now for hypothetical future applications.

For example, a future AI-assisted editor for a non-technical author may require architectural evolution.

When such a requirement becomes real, treat it as an architectural change through the existing change process.

Do not introduce Nx, monorepo architecture, multiple applications, backend services, or shared libraries in anticipation of that possibility.

Add architectural mechanisms only when concrete requirements justify them.

---

# Phase 1 completion

During Phase 1 create only the documentation/contracts required by this file.

Then:

1. review them against this specification
2. remove unnecessary duplication
3. ensure context-routing is progressive and task-specific
4. ensure architecture remains minimal and non-speculative
5. summarize what was created
6. identify anything you deliberately changed from this initialization specification
7. STOP

Do not initialize Astro yet.