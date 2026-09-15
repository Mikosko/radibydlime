# Site layout

`SiteLayout.astro` is the only current presentation shell. Routes pass a title and description and supply page content through the default slot.

The shell emits a Czech HTML document (`lang="cs"`), responsive viewport metadata, page description, and a title suffixed with the site name. It owns the site header, primary navigation, main landmark, and footer. A site-wide discovery strip transitions from page content into the footer: a torn-paper personal quotation, a short introduction, and three illustrated topic links reflow from a horizontal editorial band into a single-column reading order on narrow screens. The footer begins with a bounded information band containing the stacked reusable brand mark, a short site statement, grouped navigation, and illustrated social links. Social marks use their restrained olive artwork by default and reveal the supplied platform-color artwork on pointer hover or keyboard focus. Destinations without a public route or confirmed social URL remain explicit `#` placeholders and identify themselves as forthcoming where icon-only labeling needs it.

The authored transparent landscape fills the available width on wide screens; narrow screens retain its visual height and crop the outer scenery around the centered landscape. Its central [BrandMark](../../components/brand-mark/SPEC.md) uses the one-line variant; themes and handwritten phrase are also real responsive HTML text layered with CSS. The panorama is decorative and uses empty alternative text. A quiet divided copyright row closes the page.

A transparent botanical drawing finishes the right edge of the information band's upper rule. It is decorative, stays outside the content flow, and scales down at narrow widths.

The first keyboard link skips to the focusable main landmark. [TopNavigation](../../components/top-navigation/SPEC.md) owns the shared header and derives its visible and semantic current state from the route. The Kapitoly link and detail-page return link target the homepage's `#projekty` section. Each route supplies one level-one heading.

Styling comes from `src/styles/global.css`: Tailwind tokens for paper, ink, muted text, borders, accent, the [semantic typography roles](../../styles/UI.md), and a bounded site width. Source Serif 4 supplies body text and Cormorant Garamond supplies display text. The shell preloads only their normal local WOFF2 files using the same emitted URLs as CSS. Italic and optional accents are not preloaded. Navigation reflows on small screens. There are no client scripts, third-party font requests, or required JavaScript interactions.

The cross-cutting output checks live in `tests/integration/content-build.spec.ts`; no component test harness is needed for this static shell.
