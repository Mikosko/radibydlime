# 0002 — Git as canonical storage

Status: Accepted for Git-canonical code, content and contracts. The local-image-only portion is superseded by [0005](0005-external-media-storage.md).

Decision: Keep canonical content, local images, code, and repository contracts in Git.

Reason: Versioned, portable files support review, recovery, and collaboration without a proprietary content service.

Consequence: Publishing follows repository changes and builds. A future authoring tool must preserve this source of truth unless a deliberate architectural change replaces it.
