# Published media catalog

One strict JSON file per published image lives here as `<id>.json`. `schema.ts` owns the shared validator, inferred type, public origin and resolver. CLI and Astro use the same rules; Astro never imports the processor. The media Content Collection uses source filenames as loader keys and validates canonical identity separately. It clears old cached entries before loading so an empty catalog cannot retain deleted records.

## Identity and fields

`id` is a lowercase `media-<UUID-v4>` assigned once; the filename matches it. `path` is `/images/<id>/<ASCII-hyphenated-stem>.webp`. Both IDs and paths are unique. Neither identity nor organization derives from Project, JournalEntry, localized titles or dates. Published bytes/path are immutable; replacement means a new media ID. Metadata-only corrections follow ordinary Git review.

Required: `id`, `path`, `mimeType: image/webp`, positive intrinsic `width` and `height` (at most 2400), informative Czech `alt`, and derivative `sha256`. Optional: `caption`, `credit`, reliable calendar date `capturedOn`, and unique short `tags`/`groups` labels. Unknown fields fail validation. Source fingerprints, raw EXIF, precise timestamps, GPS, local paths, model details, credentials and approval state do not belong in public records. The derivative hash has a concrete verification/recovery role; do not duplicate full URLs, filename fields or byte counts.

The public origin is `https://media.radibydlime.cz` in `schema.ts`; resolve it with `path`. A storage migration preserves IDs/content semantics and preferably paths. Transfer account/root settings remain machine-local and independent of this public origin.

## Publication and consumers

The local upload command adds a record only after successful secure-transfer readback (FTPS or SFTP) and public HTTPS byte verification. Catalog file creation is exclusive and atomic; upload does not commit or deploy. A failed check does not add a record or remove a previously valid one. Git remains canonical for reviewed metadata; bytes and camera originals stay outside Git.

Projects may use `hero: { mediaId }` instead of the existing local hero object. Resolve remote metadata once from this catalog and render an ordinary static image with explicit dimensions, alt text and existing caption/credit behavior. The build validates every catalog record and every Project reference, including hidden Projects and unused media. Invalid files/IDs report their source. An empty catalog is valid.

Builds require no hosting connection, originals, credentials, ExifTool or model runner. No remote image probing, build-time transformation, SSR, runtime API or processor call is allowed. Narrative image/gallery blocks and other content types remain future changes.
