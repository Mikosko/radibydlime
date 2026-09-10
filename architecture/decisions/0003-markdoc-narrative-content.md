# 0003 — Markdoc for narrative content

Status: Accepted

Decision: Use Markdoc narrative bodies with YAML frontmatter and typed Astro Content Collections, rather than executable authored content such as MDX.

Reason: Authors should describe content and its semantic meaning without embedding application logic. This keeps content understandable and separates it from rendering code.

Consequence: Rich content concepts require explicit supported tags and application-owned rendering. Add these only for concrete needs; do not build an exhaustive block catalog.
