# Content contract

## Domain and authoring

Use Astro Content Collections with typed schemas. Author structured metadata in YAML frontmatter and narrative/rich bodies in Markdoc. Keep images local and content portable; authored content must not contain executable application code.

The durable domain vocabulary is Project, JournalEntry, Workshop, SaleItem, and Page. These are domain types, not page templates. Each may combine structured metadata with a flexible narrative body. The current slice implements only Project; its concrete rules live in [projects/SPEC.md](projects/SPEC.md). Implement collections and schemas only for actual content. Do not create empty collections for the rest.

## Identity, URLs, and references

- Give each content object an explicit, stable, language-neutral canonical ID. Do not derive identity from its title, localized slug, or a path that changes when it is renamed.
- IDs must be unambiguous across domain types. A type-qualified ID or a reference containing both type and ID is sufficient; choose one minimal convention when implementing the first schema.
- Use a separate localized slug for URLs. Czech slugs are appropriate for Czech content. Validate uniqueness within the route namespace that uses them.
- Relationships reference canonical IDs, never localized slugs. Renaming a slug must not break cross-content identity.
- Czech is the initial language. Preserve the distinction between identity and localization without implementing locale routing, translation registries, or a complete internationalization system now.
- Validate reference targets at build time when relationships are introduced. Do not emit public links to content without a public route.

## Metadata and lifecycle

Model only metadata currently useful. For a routed entry, identity, slug, and title form the minimum. Add summary/description, publishing dates, relationships, hero imagery, and SEO/social fields only where used. Do not introduce generic metadata layers to anticipate future types.

Where lifecycle is relevant, use `draft`, `published`, and `archived`. Draft content must not appear in public output or public queries. Define archived route/listing behavior in the concrete content contract when archiving is first needed; do not infer it from a status name alone. Apply visibility rules consistently to routes and reused content queries.

Image metadata includes alt text, with optional caption and credit where useful. Informative images need meaningful alt text; explicitly decorative images may use empty alt text. Validate local image references during content processing/build where practical.

## Reuse and validation

Query the same Content Collection object for every display context instead of duplicating records. A homepage's latest journal entries and a project's related entries can draw from the same collection. Upcoming workshops and available sale items are future use cases, not required implementations.

Use direct, typed collection queries for current needs. Do not build a generalized feed/query engine.

Schemas and build-time processing should catch malformed metadata, ambiguous IDs, conflicting slugs, and invalid references where practical. Colocate tests for local processing behavior; use root integration tests only for cross-cutting concerns such as route generation, content build validity, or reference integrity. Preserve meaningful type-specific rules in a local `SPEC.md` when a concrete implementation warrants it.
