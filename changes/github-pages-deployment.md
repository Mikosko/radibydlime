# Deploy the existing site to GitHub Pages

## Goal

Publish the existing static Astro website through GitHub Actions whenever `main` changes, serving it over HTTPS at the root of the owner's custom domain. Keep the build portable and preserve the current content and rendering architecture.

This is a temporary specification for review. Do not implement deployment or change GitHub/DNS settings in this specification-only step. After acceptance, follow the separate specification and implementation commit lifecycle in `CHANGES.md`.

## Current relevant state

Repository reconnaissance covered `AGENTS.md`, `architecture/ARCHITECTURE.md`, `changes/CHANGES.md`, the layout subsystem and site layout contract, the Project contract, the static-first ADR, Astro configuration, package scripts, README, and integration tests.

- The working tree was clean on `main` at `81347d6`. No Git remote is configured; the target GitHub owner/repository is unknown.
- `astro.config.mjs` uses Astro 7 with `output: 'static'`, `trailingSlash: 'always'`, Markdoc, and Tailwind. It has no `site`, deployment `base`, or runtime adapter.
- The homepage and `/projekty/druhy-zivot-starych-dveri/` are generated into `dist/`. Navigation, Project links, and built assets already use root-relative URLs. The layout does not emit canonical/social URLs.
- npm dependencies are locked in `package-lock.json`; Node must satisfy `>=22.12.0`. `npm run validate` runs Astro/TypeScript checks, a production build, nine integration tests, and Prettier checks. Tests use isolated temporary builds and verify root paths, local images, content validity, and hidden content.
- No deployment workflow, production domain, `public/CNAME`, or hosting configuration exists. README explicitly describes hosting and production domain as unconfigured. There are no deployment-specific tests.

## Desired resulting state

### Production URL

- Confirm the actual production hostname with the owner. Choosing an apex hostname or `www` changes DNS setup, but either must serve the application at `/`, without a repository-name prefix.
- Configure Astro's `site` with the confirmed absolute HTTPS origin. Leave `base` unset (the root default), or explicitly `/`; never set `/repository-name/`. Preserve existing route, asset, navigation, and trailing-slash behavior. This matches the custom-domain section of the [Astro deployment guide](https://docs.astro.build/en/guides/deploy/github/).
- Do not invent a domain or substitute a guessed `github.io` hostname. The real hostname and GitHub destination are explicit prerequisites before the first production deployment. If still unknown during implementation, record them as unresolved configuration and prevent publishing with placeholder values.
- Keep the production origin in a simple, documented configuration location. No secret is required for a public domain name. Local development, validation, and static builds must remain usable without GitHub credentials. Adding SEO features or redesigning layouts is outside this change.

### Automated build and deployment

- Add one minimal workflow under `.github/workflows/` using Astro's maintained `withastro/action` to build/upload the static artifact and GitHub's `actions/deploy-pages` to publish it. Follow the [official Astro-supported workflow](https://docs.astro.build/en/guides/deploy/github/) and verify supported action releases when implementing.
- Trigger production deployment on pushes to `main`, including merged changes. Other branches and pull requests must not deploy production. A manual rerun is optional and, if present, must also be restricted to `main`.
- Use a supported Node version satisfying the repository engine constraint, npm, and the committed lockfile. Preserve reproducible dependency installation. Run the existing validation before publishing; a failed check, test, formatting check, or build must prevent deployment. The Astro action exposes a build-command input suitable for the validation gate; its default install step currently uses `install`, so do not assume it already provides `npm ci` semantics. See the [action implementation](https://github.com/withastro/action/blob/main/action.yml).
- Publish only the generated `dist/` artifact from the validated revision. Do not commit generated output or introduce a `gh-pages` publishing branch, deploy script framework, or personal access token.
- Use the standard `GITHUB_TOKEN`/OIDC deployment path: repository read permission, Pages write permission, and ID-token write permission with appropriate job scope. Deployment depends on the successful build job and uses the `github-pages` environment with its deployment URL. Follow [GitHub's workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- Serialize production deployment runs so overlapping pushes cannot race to replace the live site. Keep this within normal workflow concurrency controls.

## GitHub and DNS configuration outside repository code

The implementation documentation must identify these owner/admin steps and record their completion separately from repository validation:

1. Confirm the GitHub owner/repository, add the intended remote, and push `main`. Confirm repository visibility/plan permits Pages and Actions policy allows the required official actions.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the publishing source. Configure the `github-pages` environment to allow `main` deployments without a required manual approval that would defeat automatic publishing. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
3. Enter the confirmed hostname in Pages **Custom domain** before pointing DNS at Pages. Document GitHub's recommended ownership verification.
4. At the existing DNS provider, configure the selected hostname: apex uses GitHub Pages `A` records or supported `ALIAS`/`ANAME`; optional IPv6 uses the documented `AAAA` records. A subdomain uses a DNS `CNAME` to the confirmed account's Pages hostname, with no repository path. Use GitHub's current published targets when recording the actual DNS values. Preserve unrelated DNS records.
5. Verify DNS propagation and GitHub's domain check, then enable **Enforce HTTPS** once the certificate is ready. If both apex and `www` are configured, verify that the alternate redirects to the chosen production hostname. These domain/DNS steps follow [GitHub's custom-domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

For custom Actions publishing, GitHub says a repository `CNAME` file is ignored and unnecessary. Omit `public/CNAME`; it cannot replace the Pages setting or DNS configuration. This resolves the difference from Astro's guide, which still describes that file. See [GitHub's authoritative publishing behavior](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain).

## Constraints and affected areas

No SSR, runtime server, database, additional hosting provider, or Cloudflare-, Vercel-, or Netlify-specific infrastructure. No application framework, content-model change, generic deployment abstraction, or separate preview-hosting system is needed. Git remains canonical storage; GitHub Pages receives portable static build output.

Expected affected areas during implementation:

- `.github/workflows/`: the build/deploy workflow.
- `astro.config.mjs`: the confirmed production `site` origin and root-path invariant.
- `README.md`: deployment prerequisites, actual configuration locations, GitHub/DNS setup, validation, and rerun instructions.
- `architecture/ARCHITECTURE.md`: record GitHub Pages as the current static delivery destination after implementation.
- Existing integration tests or narrowly scoped deployment checks, only where needed to validate URL/artifact behavior. Preserve existing content checks. Update local contracts only if their behavior changes; no layout rewrite is anticipated.

## Acceptance criteria

1. `npm run validate` passes, and the resulting artifact contains the homepage, Project detail HTML, CSS, and local image assets. Production configuration uses the confirmed HTTPS origin with root-relative links/assets and no repository-name prefix.
2. A push to `main` runs the official Astro-supported workflow and deploys the validated revision to Pages automatically. Validation failure blocks deployment; another branch or pull request cannot deploy production. The environment and workflow permissions support this behavior without extra credentials.
3. Repository setup documentation states the actual GitHub destination and production hostname, or explicitly records either as still pending. No placeholder host is treated as production. External setup completion is not inferred from a successful local build or workflow file.
4. Once Pages, DNS, and HTTPS are configured, the chosen domain's `/` and the existing Project detail URL load directly and on refresh. Navigation, image/CSS requests, and any configured alternate-host redirect work without a repository base path or mixed content.
5. Deployment configuration and durable documentation match the architecture, and build output remains ordinary static files. Record evidence of the first successful Actions deployment and live checks; if external prerequisites remain unresolved, retain the temporary specification and report deployment as incomplete.

## Architectural impact

Adds GitHub Actions and GitHub Pages as the delivery mechanism for the existing static application. It does not replace any architectural technology or introduce runtime behavior. Update current deployment truth during implementation; the existing static-first ADR remains valid. No additional ADR or infrastructure abstraction is required for this minimal hosting setup.

## Implementation status

Repository implementation is complete: the official Astro-supported workflow deploys pushes from `main`, runs reproducible installation and full validation before artifact upload, preserves root paths, serializes deployments, and uses GitHub's standard Pages environment and permissions. Astro sets the confirmed `https://www.radibydlime.cz` origin directly, and `origin` points to the confirmed `Mikosko/radibydlime` GitHub repository. Durable documentation reflects the deployment contract. Ten integration tests, including the production-origin and root-path case, pass.

External completion remains pending. The repository must be pushed, and an administrator must complete the Pages, DNS, HTTPS, first-deployment, and live-site verification steps documented in `README.md`. Keep this temporary specification until those acceptance criteria are verified; do not represent the deployment as live before then.
