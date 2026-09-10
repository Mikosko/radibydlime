# Layout contract

Content types and layouts are separate concepts. Project, JournalEntry, Workshop, SaleItem, and Page describe domain objects; a layout describes a presentation shell. Do not encode a domain identity in a layout choice or require one layout per content type.

The site/layout layer owns global document structure, page language, navigation, footer, and shared metadata presentation. Content blocks own narrative meaning, not global chrome. Supply page-specific data explicitly from the route or assembly layer.

The current Czech slice uses one base/site layout, described in [site/SPEC.md](site/SPEC.md). Editorial, minimal, landing, or fullscreen shells may be introduced for real requirements later; do not create them during initialization.

Use shared styling conventions and accessible document structure.
