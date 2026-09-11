# Local media CLI

`cli.ts` supplies `media:process` and `media:upload` using the existing Node/TypeScript toolchain. Setup and recovery live in [docs/media.md](../../docs/media.md). The website never imports these modules.

## Stage boundary

Processing owns discovery, verified source copies, allowlisted ExifTool facts, Sharp derivatives, local Ollama suggestions and explicit terminal review. It never opens a transfer connection, reads transfer credentials or writes the published catalog. Upload reads immutable approved snapshots and uses FTPS or SFTP plus public HTTPS verification; it never invokes AI, ExifTool or image preparation. Dynamic CLI imports preserve this boundary. No command installs tools, downloads models, changes hosting, commits, pushes or deploys.

## Local state and approval

The ignored `.media/` root contains `inbox`, `work/<id>`, `ready/<id>` and `processed/<id>`. An external absolute physical root may be configured. One exclusive lock serializes commands per root. Atomic local file replacement and exclusive catalog creation preserve recoverability; interrupted work stays at its last safe stage. Originals remain unchanged and are not deleted. A source SHA-256 maps byte-identical/renamed inbox sources to their existing item across all stages. Source IDs and checksums cannot be edited to replace published images.

Draft JSON and derivatives are inspectable with ordinary local tools. Only an explicit terminal `approve` may seal them; noninteractive processing leaves drafts pending. The seal binds normalized public metadata, the raw draft digest, source digest, image digest and fixed recipe. Review verifies files again after the user decision. Changed drafts, seals or image bytes are rejected before upload. Reopening a ready item requires review; items with an upload attempt require reconciliation first. Approval is an editing guard, not protection against malicious alteration of all local state.

## Facts and image preparation

Support regular still JPEG, PNG and WebP, maximum input 100 MiB/100 megapixels. ExifTool supplies orientation and original date/offset from an allowlist; filesystem times, GPS and serials never become public facts. Missing EXIF is valid. A changed/uncertain date requires local trusted-source provenance; publish day precision without inventing timezones.

Sharp normalizes orientation including mirrors, bounds the long edge at 2400px without upscaling, preserves aspect/alpha, converts to sRGB and strips metadata. Output is one quality-80 WebP. Changing the recipe requires a new unapproved preparation. No automatic crop/retouching/variants occur.

Ollama must be on a literal loopback HTTP origin with cloud disabled, an installed local model and vision capability. Only oriented stripped pixels enter structured Czech suggestion requests. Reject model remote-host fields, unknown output fields and invalid/oversized values. Model text and image text are untrusted; no tool execution, identity inference or factual date assignment. No hosted fallback or automatic model pull. Explicit manual mode follows the same review contract.

## Publication and recovery

Preflight validates every catalog/ready record and collision before connecting. Select exactly one transport in external machine configuration. SFTP uses pinned SSH host keys and an agent/private key. FTPS loads an external owner-only environment file at upload time, requires explicit TLS with certificate verification on control and data channels, and rejects a public base differing from the canonical media origin. FTPS requires MLSD, bounded listings and transfers, and the same host for passive connections. Paths stay beneath the configured remote root; symlink parents and access errors are not treated as missing files.

For SFTP, write a random exclusive staging file, read back its SHA-256 and promote using `hardlink@openssh.com`. POSIX hard-link creation fails on an existing destination, including a competing writer; no overwriting file rename is used. Retain staging links, including successful ones, because automatic remote deletion is out of scope. Missing host support is an explicit failure.

For FTPS, exclusively claim `/images/.<id>.<attempt>.part/` with MKD and write its single reviewed filename only after that call succeeds. Never retry STOR into an existing staging directory. After byte verification, rename the entire staging directory to `/images/<id>`. Require machine-local `directoryRenameVerified: true` only after verifying host behavior: POSIX directory rename cannot replace an existing nonempty directory, file or symlink, protecting competing publishers' images. Reject any observed final directory and extra/unexpected staging entries. A racing empty directory can be replaced, but existing file bytes cannot. This assumes a trusted account/root: other clients must not mutate another attempt's private random staging directory. Failed attempts retain staging; successful promotion moves it. No remote deletion or plaintext fallback is part of either transport.

Before adding Git metadata, verify the public HTTPS response bytes exactly; an HTTP status or file size alone is not success. Revalidate Git state before exclusively creating a formatted record. A matching existing record is reused without rewriting; conflicts require human reconciliation. Receipts precede moving local state to `processed`.

Persist attempt, transport-specific staging path, sealed payload digest and promotion intention before remote transitions. Switching transports with an existing journal requires reconciliation. Retries reuse only recorded destinations with matching bytes, or matching canonical records. Never adopt unrelated files based only on matching bytes. A failed item creates no new catalog entry; partial success keeps valid entries and returns nonzero with counts/IDs. Preserve sources, incomplete staging and errors for manual recovery. Never log raw connection errors, credentials or model/raw EXIF dumps.

Focused tests live beside this file; cross-cutting content validation is in `tests/integration/content-build.spec.ts`. External prerequisites and real hosting/model smoke checks are separate from automated validation.
