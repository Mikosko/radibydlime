# 0002 — Git as canonical storage

Status: Accepted

Decision: Keep canonical content, local images, code, and repository contracts in Git.

Reason: Versioned, portable files support review, recovery, and collaboration without a proprietary content service.

Consequence: Publishing follows repository changes and builds. A future authoring tool must preserve this source of truth unless a deliberate architectural change replaces it.
