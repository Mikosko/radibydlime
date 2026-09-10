# Local AI-assisted media pipeline

## Goal

Add a small, image-only local CLI for preparing and reviewing media, then explicitly publishing approved derivatives to external webhosting. Git remains canonical for published metadata; the static website never calls the processor, model runner, or upload client.

This is a temporary desired-state specification. Follow [CHANGES.md](CHANGES.md): review and commit this specification before implementation. This change request authorizes specification creation only, not installation, implementation, media upload, or hosting changes.

## Current relevant state and reconnaissance

- Read `AGENTS.md`, `architecture/ARCHITECTURE.md`, `changes/CHANGES.md`, `src/content/CONTENT.md`, `src/content/projects/SPEC.md`, and `src/styles/UI.md`. Read ADR `0002-git-canonical-storage.md` because external image storage deliberately changes the current local-image convention.
- The application uses static Astro 7, strict TypeScript, Tailwind 4, Markdoc and npm. Node support starts at 22.12; GitHub Pages CI uses Node 24. Existing tests run TypeScript through Node's built-in test runner and type stripping.
- `src/content.config.ts` defines only Projects. Required `hero.src` uses Astro's local `image()` validation; alt text is required, with optional caption and credit. `src/content/projects/query.ts` checks canonical IDs and slugs before filtering visibility.
- `src/pages/index.astro` and `src/pages/projekty/[slug].astro` render the same Project hero with `astro:assets`. The sole sample is an explicitly illustrative local SVG. The site shell is bounded at 72rem; no photographic pipeline or media catalog exists.
- `tests/integration/content-build.spec.ts` exercises isolated Astro builds, identity, visibility, invalid metadata and local image rendering. No processor, AI, catalog-reference or upload tests exist.
- Sharp 0.35.4 is already an optional transitive dependency in the lockfile. Its installed types support EXIF orientation, bounded resizing and metadata handling. Declare packages directly when the new code imports them; do not depend on incidental transitive availability.
- On the inspected machine, Node 26.8.2 and SSH/SFTP commands are available; ExifTool and Ollama are not on PATH. This is a machine observation, not a new project prerequisite version. Nothing was installed or executed against hosting.
- `.gitignore` excludes builds, dependencies and environment files, but has no media-workspace rule. There is no scripts directory or existing media workflow to extend.
- Upstream checks confirm Ollama supports [vision requests](https://docs.ollama.com/capabilities/vision) and [structured output](https://docs.ollama.com/capabilities/structured-outputs). Its [local-only configuration](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features) matters: a loopback endpoint alone does not exclude cloud-backed models. [ExifTool's upstream manual](https://raw.githubusercontent.com/exiftool/exiftool/master/html/exiftool_pod.html) documents selective metadata extraction and JSON output. The [ssh2 SFTP API](https://github.com/mscdex/ssh2/blob/master/SFTP.md) exposes exclusive creation and readback; [host verification](https://github.com/mscdex/ssh2#client-methods) must be configured explicitly. Actual hosting capabilities and a suitable installed local model remain implementation-time checks.

## Desired resulting state

Two explicit commands own separate stages:

| Command                 | Reads                                                                              | May write                                                                      | Must never do                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `npm run media:process` | Local sources, source facts, local model suggestions, catalog for collision checks | Ignored working files, review drafts, approved ready bundles                   | Contact media hosting, upload, change the published catalog                          |
| `npm run media:upload`  | Approved ready bundles, catalog, machine-local transfer configuration              | Remote derivatives, verified catalog records, local publication receipts/state | Invoke AI or ExifTool, transform images, generate or revise metadata, approve drafts |

An upload makes bytes public. Adding the resulting catalog/content changes to Git and deploying the website remains the ordinary human-controlled Git workflow. Neither command commits, pushes, deploys, changes DNS, or changes hosting settings.

## Local tooling and state

Use TypeScript orchestration under `scripts/media/`, compatible with the existing Node minimum and test runner. Prefer Sharp as a direct development dependency, an external ExifTool executable, and native HTTP requests to an independently installed Ollama. Use one small SFTP transport module, preferably `ssh2` as a development dependency: explicit exclusive writes and verifiable completion justify it over an unchecked shell `put`. Verify compatibility and pin direct dependencies through the existing lockfile during implementation. Keep transport and model calls behind small replaceable functions, not a plugin framework.

Default transient storage to an ignored repository-root `.media/` directory for an obvious inbox. Permit a machine-local absolute work-root override for large collections stored outside the checkout. Never place the work root beneath `src/`, `public/`, or a build input. Ignore `.media/` in Git and formatting/type-check discovery where necessary; exclude an explicitly configured in-checkout alternative too. Do not create tracked placeholder originals or derivatives.

| Location within work root | Meaning                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `inbox/`                  | User-supplied source images awaiting discovery                                                                 |
| `work/<id>/`              | Recoverable source copy, deterministic facts, draft metadata, derivative and processing progress; not approved |
| `ready/<id>/`             | Complete reviewed bundle with an approval record bound to its contents                                         |
| `processed/<id>/`         | Successfully published bundle and receipt; retained locally for recovery                                       |

Use `inbox → work/review → ready → processed`. Preserve the source byte-for-byte; do not edit or delete the user's original. Claim a source through a verified local copy and durable source fingerprint before moving on. A repeated scan of an unchanged source resumes or skips its existing item, including after the source filename changes. Exact source-byte checksums provide retry deduplication only, not perceptual matching. Changed source bytes require a new item or an explicitly restarted unapproved preparation, never silent replacement of approved work.

Failures retain the bundle at its last safe stage with a local error and next action; a separate error directory is unnecessary. Persist transitions atomically where practical and lock a work root against overlapping commands. Fail clearly on incomplete copies, corrupt images, unsupported formats, missing tools or stale locks. Keep originals and receipts until the user performs manual cleanup; this tool is not a backup system. Reject path traversal and symlinks escaping the work root.

## Processing, facts and local AI

1. Discover regular JPEG, PNG and still WebP files, validate their actual format and process in a stable order with bounded resource use. Report unsupported HEIC/RAW, animated images and other formats without consuming or silently converting them. Supporting additional decoders is a later need, not an installation side effect.
2. Allocate an ID once and record a source SHA-256 fingerprint. Read an explicit ExifTool allowlist, including orientation and reliable original capture information; use decoded image dimensions for image operations. Do not infer capture dates from filesystem modification times or ingest times. Missing EXIF is valid; malformed or conflicting facts require review.
3. Prepare an oriented, metadata-stripped derivative. The model sees these pixels and only deliberately selected source facts. Do not send raw EXIF, GPS, camera serials, local directory names or credentials. Retain only necessary source facts/provenance in ignored working state.
4. Ask the local VLM for structured Czech suggestions: a short filename stem, informative alt text, optional caption, tags and optional grouping labels. Grouping is editorial metadata, not an assertion that pictures share a date, place or people. The model cannot select IDs, destination directories, approval flags, capture dates, dimensions or upload behavior.
5. Validate suggestions as untrusted data with bounded text lengths and safe filename normalization. Do not execute image text, model output or metadata as commands. Do not present guessed identities, relationships, exact places, materials, dates or historical claims as fact. Prefer descriptions of visible details; unsupported details must be omitted or explicitly resolved by the reviewer.
6. Save a reviewable draft and the actual derivative. Cached valid drafts survive retries; ordinary reruns do not spend additional model time or overwrite human edits. Explicit regeneration returns an item to unapproved review.

Ollama runs independently on loopback in local-only mode, with cloud functionality disabled and a locally installed vision-capable model selected in machine configuration. Reject remote model endpoints, cloud-backed models and redirects outside loopback. No hosted AI fallback, Codex integration, account, model allowance or automatic model download is part of processing. Document a tested model/version, approximate resource needs and Czech-output limitations after implementation-time verification; do not invent a tested choice now. Initial tool/model installation is an explicit developer setup step outside normal commands.

Model absence, timeout or invalid output leaves recoverable unapproved work with a useful diagnostic. An explicitly requested manual-metadata mode may finish the same review workflow without AI; never silently replace a failed model response with apparently AI-reviewed content. Neither normal build nor upload requires a running model or ExifTool.

### Image policy

Produce one still WebP derivative per item at quality 80, with a maximum long edge of 2400px and no upscaling. This supports the current 1152px page shell near double density without speculative thumbnail/srcset families. Preserve aspect ratio and transparency, normalize orientation including mirrored EXIF cases, and convert appropriately to sRGB. Strip private EXIF/XMP/IPTC and unnecessary embedded metadata from the published bytes. Read final intrinsic dimensions from the encoded derivative.

Do not automatically crop, retouch, invent pixels, watermark or apply a photographic style. Version one needs no crop interface; a deliberate crop may be supplied as a separate prepared source without altering the original. Record the processing policy/version locally so an intentional future change invalidates approval and produces freshly reviewed output. Visually verify representative portrait, landscape, transparent and detailed photographs before accepting the initial quality policy.

### Review and approval semantics

Keep an editable JSON draft beside the derivative and show both paths, extracted facts and final proposed public metadata in CLI output. The user inspects the actual image with their normal image viewer and edits the JSON in their editor; no GUI is added. `media:process` offers explicit per-item approve/skip decisions, with a review-only resume such as `npm run media:process -- --review <id>` that does not call the model again.

Approval is never inferred from successful processing, directory membership, a model boolean or a default yes. Require an explicit terminal decision after displaying the final metadata and derivative path. Noninteractive processing may generate drafts but cannot approve them. Require nonempty useful alt text for this first version's informative photographs; optional caption/tags/groups must be consciously retained or omitted. Credit may be supplied by the user, never invented by AI. Capture date corrections need a recorded trusted source in local review state.

On approval, validate completeness and collisions, then seal a bundle containing the reviewed catalog payload, exact destination path, derivative SHA-256, dimensions and processing-policy identity. Bind approval to a digest of that payload and derivative. Move only complete bundles to `ready`. Any subsequent metadata, filename, path, recipe or byte edit makes approval stale; upload refuses it and directs the user back to processing/review. Upload consumes an immutable snapshot so edits during a run cannot change what was approved.

## Identity, public paths and catalog

Generate a language-neutral `media-<uuid>` ID once using a random UUID. Identity never depends on a Czech title, source filename, date, folder, Project or JournalEntry. Never recycle published IDs. AI proposes a human-readable ASCII hyphenated filename stem only; the reviewer can edit it before approval, with `image` as a neutral fallback.

Use `/images/<id>/<approved-stem>.webp`. Do not organize directories by content type or guessed capture date. Freeze published paths; changing captions or tags does not rename files. Version one publishes new items only: replacing published image bytes requires a new media ID and path. Later metadata-only corrections are ordinary reviewed Git edits, not re-uploads.

Store one Git-tracked JSON record per item at `src/content/media/<id>.json`. Use a small shared plain-TypeScript schema/validator there, usable by the CLI and an Astro media Content Collection without importing the CLI into Astro. Infer types from that validation boundary and declare any directly imported validation dependency explicitly. Keep loader source keys distinct from canonical IDs until duplicate validation, as the existing Project convention does; never silently overwrite a duplicate during loading. An empty catalog is valid.

| Field               | Requirement                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `id`                | Stable `media-<uuid>`, matching the record filename                                          |
| `path`              | Validated root-relative path under `/images/`; unique across the catalog                     |
| `mimeType`          | `image/webp` in version one; the media type, without a redundant format/kind field           |
| `width`, `height`   | Positive integer intrinsic dimensions of published bytes                                     |
| `alt`               | Required nonempty Czech informative alternative text                                         |
| `caption`, `credit` | Optional human-reviewed text                                                                 |
| `capturedOn`        | Optional valid `YYYY-MM-DD`, only when reliably known                                        |
| `tags`, `groups`    | Optional unique nonempty editorial labels; no domain collection relationships implied        |
| `sha256`            | Derivative digest retained for upload verification and safe recovery across local-state loss |

Publish capture date at day precision only; EXIF often lacks timezone information, so do not fabricate a UTC timestamp. Preserve any richer original date/offset and source provenance locally, not as redundant public fields. Reject unknown public fields to prevent accidental EXIF or working-state leakage.

Keep the public origin `https://media.radibydlime.cz` in one tracked, non-secret media configuration location under `src/content/media/`. Resolve `origin + path` centrally; do not also store full URLs, filename stems, byte counts, approval status, source hashes, original paths, model names or transfer credentials in each catalog record. Storage account/root configuration is separate and machine-local. A provider migration can retain IDs and paths, changing transfer configuration and, if necessary, that single public origin.

## Upload, verification and recovery

`media:upload` snapshots and validates ready items in stable ID order. Before remote writes, validate the full existing catalog and candidate set for duplicate IDs/paths, malformed records, stale approvals, missing files and byte/hash mismatches. Fail the batch before writes on ambiguous identity/path conflicts. Unapproved work is skipped and reported. A local publication journal records attempts and verification milestones so crashes do not require metadata regeneration.

Use SFTP with SSH-agent authentication or a machine-local private key. Keep host, port, account, actual remote root and verified host-key information in a user configuration file outside the repository, such as `~/.config/radibydlime/media.json`, with a configurable path. Keep secrets out of arguments, logs, receipts and Git; prefer the SSH agent for encrypted keys. Verify server host keys against an owner-established fingerprint or trusted known-host entry, never auto-accept or disable verification. No credentials or machine settings enter GitHub Actions.

The public hostname is known; the SFTP endpoint, login, remote document root, key support and mapping to `/images/` are not. Document these as required owner configuration, along with HTTPS/public-read readiness and permissions for staging, readback and safe promotion. Do not assume the public hostname is the SFTP host. If the hosting cannot meet the secure-transfer and no-overwrite requirements, stop with a documented prerequisite; a different secure transport needs an explicit supported choice, not silent FTP fallback. Hosting is not provisioned by the tool.

For each approved item:

1. Check existing destination state without treating access errors as absence. An existing unrelated file, directory or symlink is a collision even if its name looks suitable. Preflight checks alone are insufficient: actual writes/promotion must prevent overwriting under concurrent publishers.
2. Upload only the derivative to a unique staging path created exclusively. Do not upload originals, drafts, EXIF dumps, credentials or approval receipts. Verify transferred bytes by SHA-256 readback over SFTP; file size alone is insufficient to adopt a pre-existing file on retry.
3. Promote to the reviewed final path using verified no-replace semantics. Do not use an overwriting POSIX rename or a check-then-overwrite sequence. Verify server/client behavior during implementation; refuse publication if this guarantee is unavailable. Never silently overwrite an existing remote file, including a partial file from an earlier attempt.
4. Verify the final public HTTPS URL with bounded retries and a content-hash match. A transfer exit status, HEAD response or HTTP 200 error page alone is not success. Keep the item pending if the public mapping or TLS is not working; retry verification without re-uploading verified bytes. Do not disable certificate validation or accept an unrelated redirect origin.
5. Only after verified success, atomically create the canonical catalog record without clobbering an existing record. Record the durable local receipt, then move the bundle to `processed`. Report the catalog file for normal Git review; no automatic commit occurs.

When remote promotion succeeded but verification, local catalog creation or the final state transition failed, retain a recoverable ready bundle and journal. A rerun can adopt only its recorded destination with matching approved payload and exact remote bytes; complete the remaining steps without AI or retransformation. A matching canonical record and remote hash are an idempotent success, not a reason to rewrite Git. A changed/conflicting catalog record requires human reconciliation, never silent replacement. When ownership cannot be established, report a collision instead of adopting a file merely because its bytes match.

Keep failed staging files and unexpected remote files for explicitly documented manual recovery; no automatic remote deletion or orphan cleanup. If a partial destination prevents a safe retry, report the exact non-secret path and required reconciliation. Continue independent items after isolated transfer failures, report published/skipped/failed/pending counts and IDs, and exit nonzero when requested work failed. Successful catalog entries remain valid during partial batch failure; failed items get no new canonical entry. Do not remove previously valid catalog records because a later remote check fails.

## Website integration

Extend Project hero metadata with a mutually exclusive media-reference form, for example `hero: { mediaId: media-<uuid> }`, alongside the existing local `{ src, alt, caption?, credit? }` form. Resolve remote alt/caption/credit and dimensions from the catalog; do not repeat URLs or metadata in frontmatter. Preserve the existing sample SVG and local-image validation. No synthetic published remote record or live upload is necessary to migrate that sample.

Validate all catalog records and all Project media references, including hidden Projects and unused catalog entries, during every build. Report source record and offending ID/path for invalid records, duplicate IDs/paths and unknown references. Do not let the absence of a published Project skip global validation. Other domain collections and narrative image/gallery blocks remain deferred; document the same ID-reference convention for their future introduction.

Update both current hero consumers to resolve the same typed media data at build time. Local images may retain `astro:assets`; remote derivatives render as ordinary static images with explicit intrinsic width/height, meaningful alt text and existing caption/credit behavior. Do not fetch, probe, optimize or copy remote images during the Astro build. No remote dimension inference or transformation service is needed. Keep the current presentation and responsive image behavior; this is not implementation of a Figma exploration.

Build and CI require only repository code, catalog and ordinary npm dependencies. They must work without the inbox, originals, local model, ExifTool, credentials or media-host connectivity. At runtime the browser fetches public image URLs directly; the site has no connection to the local processor or authenticated hosting interface.

## Affected areas and architectural impact

- Add `scripts/media/` CLI code, focused colocated tests and a durable `SPEC.md` describing approval, transitions, publishing and recovery.
- Add `src/content/media/` records, shared validation/resolution and meaningful durable media rules; register the Content Collection and build-time validation. Add npm commands and direct development/build dependencies only as needed, preserving the supported Node range.
- Update Project schema/query, both hero consumers, Project `SPEC.md`, and content/build integration tests. Add media tests to the existing validation command without requiring external services.
- Add a concise `docs/media.md` setup/review/upload/recovery guide and README routing. Update ignore rules for transient state. Do not add hosting configuration, model binaries or secrets to the repository.
- Explicitly revise `architecture/ARCHITECTURE.md`, `src/content/CONTENT.md`, and the local-only asset wording in `src/styles/UI.md`. Record the external-bulk-media decision in a new ADR that supersedes the local-image-only portion of ADR 0002 while retaining its Git-canonical metadata rationale. `AGENTS.md` needs no new route unless the resulting contract placement demonstrates one is necessary.

This is an intentional storage/authoring architecture change: bulk photographs move outside Git, while stable identity and published metadata remain in Git. Small authored local assets and the sample illustration remain supported. Public media availability now depends on the external webhost; deployment remains static GitHub Pages and does not publish media itself. There is no SSR, runtime server, database, CMS, runtime API or local-AI dependency in the website. Model and transfer implementations remain replaceable design-time/authoring tooling.

## Validation and observable acceptance criteria

- With a new supported image in the inbox, `media:process` produces an oriented derivative and editable metadata proposal using deterministic facts and a local VLM. Repeating processing preserves identity and edits; unsupported or corrupt inputs remain recoverable.
- Processing cannot contact the transfer/publication host or change the canonical catalog. Test that boundary with a transport which fails if called. Conversely, upload succeeds from valid ready fixtures with AI, ExifTool and image-generation entry points unavailable.
- Missing/invalid EXIF, all orientation cases, portrait/landscape dimensions, transparency, no upscaling, no unintended crop and metadata stripping are covered by meaningful image fixtures. Assert private GPS/serial fields are absent from both derivative and public catalog; visually inspect quality on representative photographs.
- Review defaults to unapproved, works after editing/resuming without fresh AI calls, and cannot approve in noninteractive mode. Changing a reviewed payload or derivative invalidates approval. Test malformed model output, timeout, unsupported factual suggestions and local-only endpoint/model enforcement with controlled responses; document a separate manual local-model smoke check.
- Test exact-source retries, renamed-source discovery, path containment, duplicate IDs/paths, invalid catalog fields and simultaneous command attempts. Approval and state transitions survive interruption without losing sources or accepting partial files.
- Exercise the actual SFTP adapter against a disposable local SFTP fixture, with a controlled HTTP verification endpoint for tests only. Cover authentication/host-key rejection, exclusive staging, destination collisions including a competing writer, transfer failure, readback mismatch, no-replace promotion, public-verification failure and retry. Production configuration continues to require HTTPS and trusted SSH keys.
- Inject failure after remote promotion, after catalog creation and before the processed transition. Reruns reconcile verified owned work without duplicate catalog entries, overwrites, deletion, AI or re-encoding. Mixed batches report partial success and return the correct failure status. Logs and receipts contain no secrets.
- Build fixtures cover valid media-ID rendering on homepage/detail, intrinsic dimensions and catalog alt/caption/credit, unknown IDs including hidden content, duplicate IDs/paths, unused invalid catalog entries, an empty catalog, and the existing local SVG path. Static output contains public media URLs and no processor code or new client scripts. These tests run without public media access.
- `npm run validate` includes relevant new tests and preserves existing identity, visibility, Markdoc, local-image and GitHub Pages checks. It requires no installed model, ExifTool binary or real hosting account; external calls use controlled fixtures. A separate documented manual smoke test verifies the real local model and, once independently authorized and configured, real hosting behavior. Do not claim live verification based on mocks.
- The only tracked bulk-media output from a successful upload is the validated metadata record. Catalog updates remain reviewable Git changes; local sources, work, receipts, credentials and model files stay outside Git. No hosting changes or sample production uploads occur implicitly during implementation or tests.

## Out of scope

GUI/media manager, generalized DAM, database, CMS, watcher, background daemon, publication on file drop, hosted AI requirement, cloud transformations, automatic remote deletion, perceptual/advanced duplicate detection, facial recognition or identity inference, video/documents, camera originals in Git, bulk variant generation, crop editor, automatic content creation, galleries, replacement of published bytes, Figma integration and unrelated website redesign.
