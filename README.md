# Rádi bydlíme

A minimal Czech-first family website for restoration and DIY stories. Built as static Astro pages with strict TypeScript, Tailwind CSS, and Markdoc Content Collections. The current slice is a homepage and one clearly labeled sample Project with a local SVG illustration.

## Development

Use Node.js 22.12 or newer and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

Open the local address printed by Astro (normally `http://localhost:4321`). The sample detail page is `/projekty/druhy-zivot-starych-dveri/`.

```sh
npm run validate
```

Validation runs Astro/TypeScript checking, a production build, integration tests, and Prettier checks. Tests use Node's built-in runner and temporary copies of the project for invalid-content builds; they do not alter authored content. `npm run format` applies formatting. `INIT.md` and the user-maintained `AGENTS.md` are excluded from automatic formatting to preserve their source text.

`npm run build` writes static output to `dist/`; `npm run preview` serves that output locally. No runtime adapter is configured.

## Optional local Figma tooling

For AI-assisted visual exploration, see the [local Figma bridge guide](docs/figma-local.md). It connects Codex to a development plugin in Figma Desktop through developer-local tooling. Follow the [UI contract](src/styles/UI.md) for visual constraints and human review. The website builds and deploys independently of this optional setup.

## GitHub Pages deployment

The repository is prepared to deploy its static `dist/` output to GitHub Pages through `.github/workflows/deploy.yml`. Every push to `main` runs the full validation suite and deploys only if it succeeds. The workflow uses Astro's official Pages action and GitHub's Pages deployment action; it does not use a runtime server or a separate publishing branch.

The GitHub destination is `git@github.com:Mikosko/radibydlime.git`, and the production origin is `https://www.radibydlime.cz`. The following owner/admin steps document how the current setup is maintained or recreated:

1. Push `main` to `origin`. Confirm the repository's visibility/plan supports Pages and its Actions policy permits the official actions used by the workflow.
2. In **Settings → Pages**, select **GitHub Actions** as the publishing source. Ensure the `github-pages` environment permits automatic deployments from `main` without a required approval.
3. Verify `radibydlime.cz` with GitHub when possible. In **Settings → Pages → Custom domain**, enter and save `www.radibydlime.cz` before changing DNS.
4. At the existing DNS provider, create a `CNAME` for `www.radibydlime.cz` pointing directly to `mikosko.github.io`, without the repository name. To redirect the apex domain too, configure `radibydlime.cz` using GitHub's current Pages `A` records (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`) or a supported `ALIAS`/`ANAME` pointing to `mikosko.github.io`. Check GitHub's current documentation before applying DNS because provider interfaces and target values can change. Preserve unrelated records and avoid wildcard records.
5. After DNS has propagated and GitHub's domain check succeeds, enable **Enforce HTTPS**. Verify that `https://radibydlime.cz` redirects to `https://www.radibydlime.cz` when the apex records are configured.

Astro sets `https://www.radibydlime.cz` as its production `site` origin. It deliberately has no repository-name `base`, so routes and assets are served from the custom domain root. A repository `CNAME` file is intentionally absent because GitHub ignores it for custom Actions publishing; the Pages setting and DNS records are authoritative.

The first deployment of commit `b22b75d` succeeded in [GitHub Actions](https://github.com/Mikosko/radibydlime/actions/runs/34473313766), including repository validation and both Pages jobs. GitHub Pages uses Actions publishing, `www.radibydlime.cz` is its custom domain, and the `github-pages` environment permits only `main`.

The live setup was verified on 2026-09-10. FORPSI DNS points `www.radibydlime.cz` to `mikosko.github.io` and the apex to GitHub Pages. GitHub's certificate covers both hostnames and HTTPS enforcement is enabled. The HTTPS homepage and direct Project route return the deployed Czech content; navigation, CSS, and images load from the domain root; HTTP redirects to HTTPS; and the apex redirects to `https://www.radibydlime.cz/`.

## Authoring and repository contracts

Start with [AGENTS.md](AGENTS.md) for task-specific context. The [architecture contract](architecture/ARCHITECTURE.md) is the current source of truth.

Projects live in `src/content/projects/*.mdoc`. Copy the sample structure, assign a new stable `project-0002` style ID and a unique Czech slug, and keep unfinished content in `draft`. Set `published` only when it should appear publicly. Keep local images in `src/assets/` and refer to them relative to the content file.

Read the [Project contract](src/content/projects/SPEC.md) for exact identity, metadata, visibility, and validation rules. Custom blocks, JournalEntries, workshops, sale features, translations, and content relationships are intentionally deferred until concrete requirements exist.
