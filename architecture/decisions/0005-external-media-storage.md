# 0005 — External image bytes with Git-canonical metadata

Status: Accepted. Supersedes the local-image-only portion of [0002](0002-git-canonical-storage.md).

Decision: Store bulk published photographs on external static webhosting, with one typed Git-tracked metadata record per stable media ID. Preserve small authored local assets. Content references media IDs; one public-origin resolver maps portable paths to public URLs.

Reason: Camera originals and photographic derivatives do not need to enlarge Git history. Versioned metadata retains review, identity and content portability without a CMS or proprietary media service. A small optional local CLI separates preparation/AI suggestions/human review from deterministic publication.

Consequence: Public image availability depends on the external host, while site builds remain independent of it. Only verified uploads add canonical metadata; credentials and originals stay machine-local. FTPS/SFTP and model implementations are replaceable and outside the website runtime. The owner's host lacks SSH access, so verified explicit FTPS is an alternative authoring transport with whole-directory promotion to protect existing files. This does not alter catalog identity or production architecture. Deleting or hiding content does not delete public media bytes; deletion is intentionally manual and outside the initial tool. GitHub Pages continues to deploy only the static site.
