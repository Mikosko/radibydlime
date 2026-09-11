# Site layout

`SiteLayout.astro` is the only current presentation shell. Routes pass a title and description and supply page content through the default slot.

The shell emits a Czech HTML document (`lang="cs"`), responsive viewport metadata, page description, and a title suffixed with the site name. It owns the site header, primary navigation, main landmark, and footer. No production domain is assumed; canonical/social URLs can be added when a real deployment URL exists.

The first keyboard link skips to the focusable main landmark. The homepage navigation link has `aria-current="page"` only on `/`. The Projects link and detail-page return link target the homepage's `#projekty` section. Each route supplies one level-one heading.

Styling comes from `src/styles/global.css`: Tailwind tokens for paper, ink, muted text, borders, accent, the [semantic typography roles](../../styles/UI.md), and a bounded site width. Source Serif 4 supplies body text and Cormorant Garamond supplies display text. The shell preloads only their normal local WOFF2 files using the same emitted URLs as CSS. Italic and optional accents are not preloaded. Navigation wraps on small screens. There are no client scripts, third-party font requests, or required JavaScript interactions.

The cross-cutting output checks live in `tests/integration/content-build.spec.ts`; no component test harness is needed for this static shell.
