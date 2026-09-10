# 0004 — Tailwind as primary styling

Status: Accepted

Decision: Use Tailwind CSS with a small coherent token foundation; allow custom CSS where appropriate.

Reason: Local, explicit styling makes refactoring predictable and lets humans and agents understand a component without tracing a large CSS dependency graph.

Consequence: Reuse established tokens and conventions as real screens emerge. This choice does not require an extensive design system or forbid focused custom CSS.
