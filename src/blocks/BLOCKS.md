# Semantic block contract

Blocks express what authored content means; Astro rendering decides how it appears. Narrative content must not embed executable application code, component imports, or arbitrary author-defined logic.

Use Markdoc's narrative capabilities for ordinary content. Introduce an explicit semantic tag and renderer only when a concrete content requirement needs one. Define and validate supported attributes and inputs; keep application behavior in application code.

Possible future concepts include images, galleries, before/after comparisons, quotes, callouts, materials, measurements, videos, and content feeds. This is vocabulary guidance, not a bootstrap backlog. Do not create placeholder implementations or directories for these concepts.

Future feed/query blocks may express intent such as latest, tagged, related, manual, upcoming, or available. They should reuse Content Collection records under the content contract. Do not build a generalized query engine now.

Navigation, footer, and other global chrome belong to layouts.
