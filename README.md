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

`npm run build` writes static output to `dist/`; `npm run preview` serves that output locally. No hosting provider, production domain, or runtime adapter is configured.

## Authoring and repository contracts

Start with [AGENTS.md](AGENTS.md) for task-specific context. The [architecture contract](architecture/ARCHITECTURE.md) is the current source of truth.

Projects live in `src/content/projects/*.mdoc`. Copy the sample structure, assign a new stable `project-0002` style ID and a unique Czech slug, and keep unfinished content in `draft`. Set `published` only when it should appear publicly. Keep local images in `src/assets/` and refer to them relative to the content file.

Read the [Project contract](src/content/projects/SPEC.md) for exact identity, metadata, visibility, and validation rules. Custom blocks, JournalEntries, workshops, sale features, translations, and content relationships are intentionally deferred until concrete requirements exist.
