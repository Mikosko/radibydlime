# 0001 — Static-first delivery

Status: Accepted

Decision: Use Astro static generation as the default delivery model.

Reason: The current site consists of authored content that can be rendered at build time. A runtime server would introduce deployment and operational complexity without meeting a present requirement.

Consequence: New content is published through a build. A future runtime requirement must justify an architectural change; do not provision services in anticipation of it.
