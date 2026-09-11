# Local media authoring

The website stays static. This optional CLI prepares and reviews photographs on your machine, then publishes approved derivatives in a separate command. Git stores published metadata; image bytes are served from `https://media.radibydlime.cz/images/`. Neither command commits, pushes, deploys the site or changes hosting.

## Setup

Use the repository's supported Node version and `npm ci`. Sharp, the FTPS/SFTP clients and validation libraries are direct development dependencies. ExifTool and Ollama are separate machine tools: install ExifTool from its [official distribution](https://exiftool.org/) and optionally [Ollama](https://ollama.com/download). No command installs tools or pulls models automatically.

For AI suggestions, install a vision-capable model suited to your machine and Czech descriptions. Start Ollama with cloud features disabled (`OLLAMA_NO_CLOUD=1`, or the equivalent server configuration), bound to loopback. The CLI verifies `/api/status` reports `cloud.disabled: true` and `/api/show` describes a local vision model before sending pixels. Old runners without this status API are rejected; upgrade or use manual metadata. See [Ollama's local-only setup](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features), [vision](https://docs.ollama.com/capabilities/vision) and [structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

No live model/version is certified by the automated tests: they exercise the local API contract with controlled responses. Model weights and Czech quality depend on your machine; confirm them using the smoke check below. Image decoding, encoding and the actual FTPS/SFTP adapters are tested without a real model or hosting account. Ollama and ExifTool were not installed as part of implementing the repository tooling.

Create `~/.config/radibydlime/media.json` outside the repository. Alternatively set `RADIBYDLIME_MEDIA_CONFIG` to an absolute external configuration path. This is an illustrative configuration; replace placeholders before use:

```json
{
  "exiftool": "exiftool",
  "ollama": {
    "endpoint": "http://127.0.0.1:11434",
    "model": "<installed-local-vision-model>"
  },
  "sftp": {
    "host": "<hosting-SFTP-endpoint>",
    "port": 22,
    "username": "<hosting-account>",
    "root": "/<remote-document-root>",
    "hostKeySha256": "SHA256:<verified-host-key-fingerprint>"
  }
}
```

All sections are optional until their stage needs them. `--manual` needs no Ollama configuration; preparing/reviewing needs no transfer credentials. For SFTP, use the SSH agent (`SSH_AUTH_SOCK`) for authentication. Alternatively supply an absolute `sftp.privateKeyPath` outside Git; use an agent for encrypted keys. SFTP passwords/passphrases in JSON or command arguments are not supported. Restrict access to your user configuration and keys. Verify the SSH host fingerprint through the hosting provider/trusted channel; never merely accept the first presented key.

### FTPS alternative

When SSH/SFTP is unavailable, replace the `sftp` section with the following section in the same external `media.json`. Keep your existing ExifTool/Ollama settings. Never configure both transports at once.

```json
{
  "ftps": {
    "envFile": "/absolute/path/outside/repository/media-ftp.env",
    "directoryRenameVerified": true
  }
}
```

Set `directoryRenameVerified` only after verifying the directory-promotion requirements below. `envFile` defaults to `~/.config/radibydlime/media-ftp.env` when omitted; an explicitly supplied path must be absolute, outside the repository, and without symlink ancestors. Its permissions must allow only its owner, for example `chmod 600` on the private file. Populate these keys locally with your actual values:

```dotenv
MEDIA_FTP_HOST=<transfer-host>
MEDIA_FTP_USER=<account>
MEDIA_FTP_PASSWORD=<password>
MEDIA_FTP_SECURE=true
MEDIA_REMOTE_ROOT=/<remote-document-root>
MEDIA_PUBLIC_BASE=https://media.radibydlime.cz/
```

Quote values containing `#` or other dotenv syntax. Optional `MEDIA_FTP_PORT` defaults to 21. The CLI reads this file directly only during upload; there is no need to export credentials into a shell. Plain FTP, implicit TLS, disabled certificate verification, and a public base that differs from the catalog origin are rejected. The [basic-ftp client](https://github.com/patrickjuchli/basic-ftp) provides verified explicit TLS and passive encrypted transfers. Credentials and actual machine settings must never be copied into this guide or other shared files.

The default work root is ignored `.media/` in this checkout. An optional absolute `workRoot` outside the repository can hold a larger collection. Use a physical path without symlink ancestors. An in-repository override other than `.media` is rejected to keep originals out of build inputs and Git. `src/`, `public/`, production output and model directories are never valid inboxes. Credentials, model files, raw sources, review drafts and receipts are not committed.

### Hosting prerequisites

The owner supplies the actual transfer endpoint, account and document root, plus a verified host key when using SFTP. The public hostname is not assumed to be the transfer endpoint. `<root>/images/...` must map to `https://media.radibydlime.cz/images/...`, with working HTTPS and public read access. Both the FTPS host and public HTTPS hostname require valid matching certificates; successful FTPS login does not establish public HTTPS readiness. The tool does not configure DNS, certificates, permissions, directory listing or hosting services.

SFTP needs directory creation, exclusive file creation, readback and `hardlink@openssh.com` on the same filesystem. Promotion uses an atomic hard link, which fails if the final name already exists.

FTPS needs MLSD, exclusive MKD, STOR/RETR with protected data connections, and POSIX whole-directory RNFR/RNTO semantics. Verify with a disposable isolated probe that a second MKD fails, directory promotion to a fresh destination succeeds, promotion onto a nonempty directory fails and preserves both images, and the final bytes are publicly accessible over verified HTTPS. [Pure-FTPd's implementation](https://github.com/jedisct1/pure-ftpd/blob/master/src/ftpd.c) uses these filesystem operations; behavior must still be checked on the selected host. File renames are unsuitable because they can overwrite files. An empty destination created in a race may be replaced by directory promotion, but existing files cannot. Do not use other tools to modify another attempt's staging directory. Hosts without these guarantees fail safely; there is no plaintext fallback. The transports are replaceable and content IDs do not depend on the provider.

## Prepare and review

Run `npm run media:process` once to create local folders, then place still JPEG, PNG or WebP files in `.media/inbox/`. Subdirectories, links, animated images, HEIC/RAW and other formats are reported without being consumed. Originals remain untouched; byte-identical sources, including renamed copies, resume/skip their existing item.

```sh
npm run media:process
```

Each item moves through `inbox → work/review → ready → processed`. Processing makes a verified local source copy and records its fingerprint, allowlisted EXIF facts, one derivative and an editable `draft.json` under `.media/work/<id>/`. EXIF supplies original capture date/orientation; AI supplies suggestions, not facts. GPS, serials and raw source metadata are not sent to the model or published. Model prompts exclude the source filename and local paths.

The image policy is one WebP, quality 80, long edge at most 2400px, no upscaling, normalized orientation/sRGB, retained aspect ratio/transparency and stripped metadata. No automatic crop or retouching occurs. A deliberate crop can be a separate source; keep your camera original elsewhere too.

Open the printed `image.webp` with your normal viewer. Edit the adjacent JSON with your editor. Suggested filename, alt, caption, tags and groups are editorial proposals. Correct or remove claims about people, places, materials and history that the image/source does not establish. Alt text is required for these informative images. Remove optional fields you do not want; supply credit yourself. To correct/add a capture date, use `capturedOn: "YYYY-MM-DD"` and a local `captureSource` describing trustworthy evidence. That provenance stays local.

```sh
npm run media:process -- --review media-<uuid>
```

Review-only resumes prepared work without calling AI, ExifTool or re-encoding. The terminal shows source facts and final catalog fields, then asks you to type `approve` after inspecting the actual derivative. Enter skips. An invalid/incomplete draft remains pending with a diagnostic. Noninteractive runs never approve. You can also run `npm run media:process -- --manual` to create blank metadata for manual completion; it still reads ExifTool facts and requires the same review.

Approval seals the exact draft, public metadata, path, derivative digest and processing policy before moving the bundle to `ready`. Editing ready files makes that approval stale. Before any upload attempt, `--review <id>` returns a ready item to work for another explicit approval. Ordinary reruns preserve edits and do not regenerate AI suggestions. To deliberately start preparation over, first move the unapproved work bundle outside the work root as a backup, then rescan the retained source; this assigns a new ID. Never reset published or attempted uploads this way without reconciliation.

Nothing is uploaded by processing or approval.

## Publish

```sh
npm run media:upload
```

This command validates the complete catalog and ready batch before connecting, snapshots approved bytes, then publishes in stable ID order. It never runs AI, ExifTool or Sharp. A UUID is permanent; the approved filename lives at `/images/<id>/<stem>.webp` and does not depend on a Project, journal or capture date.

Upload writes exclusive staging, checks its SHA-256 through the selected secure transport, promotes the image without overwriting existing files, then fetches the public HTTPS URL and verifies the returned bytes. Only then does it create `src/content/media/<id>.json` exclusively and move the local bundle to `processed`. Partial batches retain their successful catalog records, identify failures/pending items and exit nonzero. A valid existing catalog entry is never removed by this command.

SFTP stages `.<attempt-uuid>.part` inside the item's remote directory and retains the staging hard link after publication. FTPS exclusively creates `/images/.<id>.<attempt-uuid>.part/`, uploads only the reviewed filename inside it, then renames that whole directory to `/images/<id>`. Successful FTPS promotion moves the staging directory; incomplete staging remains. The exact path is recorded in the local journal before writing. No command deletes remote paths. Any manual staging cleanup must preserve final public files and publication receipts.

Review the generated catalog diff, reference the media ID in content, run `npm run validate`, then commit/push through the ordinary workflow. Upload itself does not deploy the website.

## Content authoring

```yaml
hero:
  mediaId: media-<uuid>
```

This replaces the entire local hero object for that use. Do not mix `mediaId` with `src`, repeated URLs or repeated alt/caption/credit. The catalog owns those fields and dimensions. Existing local `{ src, alt, caption?, credit? }` heroes remain supported, including the sample SVG. Future narrative blocks may use the same identity convention, but no gallery or Markdoc image tag is introduced here.

The media catalog is one strict JSON record per ID under `src/content/media/`; [its contract](../src/content/media/SPEC.md) defines fields. Change metadata in Git without renaming its published path. To replace image bytes, publish a new item/ID. Media origin configuration is centralized in `src/content/media/schema.ts`; storage migration can preserve content references.

## Recovery

- **Missing tool/model, invalid AI output or broken image:** the source and work bundle remain local. Fix setup/input and rerun processing. Use explicit manual metadata if desired; there is no hosted fallback.
- **Invalid draft or stale approval:** edit the local draft and run `--review <id>`. If an upload journal already exists, restore the originally approved files and retry publication, or reconcile the attempted paths before creating another item. The CLI does not approve over an upload attempt.
- **Transfer/public verification interruption:** retain the ready bundle and `journal.json`, fix connectivity/mapping, and rerun upload. Matching owned, verified bytes are reused; no metadata/model work repeats. An unrelated existing file is a collision even if its bytes happen to match.
- **Partial staging or conflicting destination:** inspect the exact path printed in the journal/error, verify ownership and resolve it manually. Nothing is overwritten or deleted automatically. A journal records intention before promotion to recover a disconnect immediately after the remote operation.
- **FTPS stage directory exists but is empty/partial:** the upload refuses to write into it again. Keep the journal and reconcile that exact attempt manually. A successful promotion followed by HTTPS/certificate failure can be retried after fixing the host; matching published bytes are reused without re-upload. Do not switch between FTPS and SFTP on an attempted bundle without reconciling its journal.
- **Upload succeeded but Git write/move failed:** fix local permissions or reconcile catalog edits, then rerun. Identical catalog records are reused. The receipt and retained bundle allow completion without another upload.
- **Interrupted initial claim:** originals stay in the inbox. An incomplete work directory missing `source.json` must be inspected and moved outside the work root before retry; a recorded claim missing `source.bin` is restored from the same inbox bytes on discovery. Do not edit source fingerprints to force a match.
- **Lock remains after a crash:** confirm no media command is running, then manually remove `.media/.lock`. Never remove a live lock. State/approval files are not a security boundary against someone deliberately rewriting your local records.

`processed` retains copies and receipts until you clean up locally. Keep an independent originals backup. A published image is publicly readable even before any content references it; hiding a Project does not remove its media bytes. No automatic remote deletion or privacy-unpublishing workflow is provided.

## Verification

`npm run test:media` checks preparation, local-AI API boundaries, approval edits, collisions, crash recovery for both publication modes, and disposable authenticated SFTP and TLS FTP servers. The FTPS fixture uses public test-only localhost certificates/keys; these are not hosting credentials. Tests need loopback sockets but no ExifTool, model, hosting login or public media access. `npm run validate` also checks types, offline Astro builds, local/remote hero rendering, hidden/unknown references, duplicate/invalid catalog records and formatting.

For a manual local-model smoke check, prepare a few non-sensitive photographs: detailed landscape, portrait, transparent image, rotated camera photo and one with no EXIF date. Record your Ollama version, exact model/tag, model size and available memory locally. Verify Czech suggestions describe visible details without guessed identities, places, dates or materials; check dimensions, orientation, detail quality and stripped EXIF. Confirm drafts remain editable and an ordinary rerun makes no new inference request. Do not upload during this check.

Once hosting setup and a real publication are independently authorized, publish one explicitly approved test image; confirm the exact public URL and catalog diff, rerun to check no duplicate upload, and retain the receipt. Automated fixture results do not constitute verification of a real hosting account or model's semantic quality.
