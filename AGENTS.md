# Repository context router

* Always read and follow [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md).
* Read [changes/CHANGES.md](changes/CHANGES.md) only when creating or processing a change specification.
* Load subsystem contracts according to the task:
  * Visual exploration, visual review, or presentation changes: [src/styles/UI.md](src/styles/UI.md).
  * Components: [src/components/COMPONENTS.md](src/components/COMPONENTS.md).
  * Semantic content blocks: [src/blocks/BLOCKS.md](src/blocks/BLOCKS.md).
  * Layouts: [src/layouts/LAYOUTS.md](src/layouts/LAYOUTS.md).
  * Content models, schemas, or processing: [src/content/CONTENT.md](src/content/CONTENT.md).
* Before modifying an existing implementation unit, read its nearest relevant `SPEC.md`.
* Consult [architecture/decisions/](architecture/decisions/) only for relevant architectural history or reasoning: replacing a convention or technology, challenging a rule, or resolving a conflict with the architecture contract.

Load context progressively; do not read every subsystem contract or ADR by default.

## External documentation

When working with third-party libraries, prefer repository-local types/source and current official documentation over assumptions about library APIs.

Use available documentation tools, such as Context7, when behavior or APIs are uncertain. Do not fetch external documentation when repository-local information is sufficient.
