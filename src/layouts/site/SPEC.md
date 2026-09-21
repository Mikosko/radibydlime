# Site layout

`SiteLayout.astro` is the only current presentation shell. Routes pass a title and description and supply page content through the default slot.

An optional `footer-intro` slot replaces the entire default discovery strip when a page has a more relevant footer introduction. Kontakt supplies its enquiry topics there and Náš příběh, Dílny, Inzerce and the homepage supply an invitation to contact; other pages keep the default.

The header and footer both link to the static [contact page](../../pages/kontakt/SPEC.md) at `/kontakt/`.

The shell emits a Czech HTML document (`lang="cs"`), responsive viewport metadata, page description, and a title suffixed with the site name. It owns the site header, primary navigation, main landmark, and footer. A site-wide discovery strip transitions from page content into the footer: a torn-paper personal quotation, a short introduction, and three illustrated topic links reflow from a horizontal editorial band into a single-column reading order on narrow screens. The footer begins with a bounded information band containing the stacked reusable brand mark, a short site statement, grouped navigation, and social links. Social links use compact line icons inside the same quiet circular controls as article utilities. Their restrained default treatment shifts to each platform's familiar brand color on pointer hover, while keyboard focus remains clearly visible through the site's accessible focus treatment. Destinations without a public route or confirmed social URL remain explicit `#` placeholders and identify themselves as forthcoming through accessible labels.

The authored transparent landscape fills the available width on wide screens; narrow screens retain its visual height and crop the outer scenery around the centered landscape. Its central [BrandMark](../../components/brand-mark/SPEC.md) uses the one-line variant; themes and handwritten phrase are also real responsive HTML text layered with CSS. The panorama is decorative and uses empty alternative text. A quiet divided copyright row closes the page.

A transparent botanical drawing finishes the right edge of the information band's upper rule. It is decorative, stays outside the content flow, and scales down at narrow widths.

The first keyboard link skips to the focusable main landmark. [TopNavigation](../../components/top-navigation/SPEC.md) owns the shared header and derives its visible and semantic current state from the route. Kapitoly links and detail-page return links target `/kapitoly/`. Each route supplies one level-one heading.

Styling comes from `src/styles/global.css`: Tailwind tokens for paper, ink, muted text, borders, accent, the [semantic typography roles](../../styles/UI.md), and a bounded site width. Source Serif 4 supplies body text and Cormorant Garamond supplies display text. The shell preloads only their normal local WOFF2 files using the same emitted URLs as CSS. Italic and optional accents are not preloaded. Navigation reflows on small screens. The shell adds no client scripts or third-party font requests. Detail routes opt into [ReturnToList](../../components/return-to-list/SPEC.md), a small enhancement for explicit back-to-list links that uses native history and scroll restoration when the referrer matches the listing. Links work normally without JavaScript.

The cross-cutting output checks live in `tests/integration/content-build.spec.ts`; no component test harness is needed for this static shell.

The homepage uses an illustrated estate opening, two scrapbook-style sample photos, the three latest published Projects with canonical heroes and author/date metadata, links to implemented sections, an editorial quotation, and introductions to the family theme and Tuchořice. Its photo notes are illustrative, not a factual before/after comparison. No newsletter subscription, shop, or unimplemented destination is added by the landing-page composition.
