# Initial typography system

## Goal and approval

Establish the approved editorial typography direction through small semantic Tailwind roles and self-hosted fonts: Cormorant Garamond for display, Source Serif 4 for reading, Allura for occasional handwritten annotations, and Special Elite for occasional editorial notes. Preserve the static architecture and readable Czech content.

This change specifies future implementation. Update `src/styles/UI.md` with durable typography decisions during implementation; do not change production styles, download font assets, or edit Figma as part of creating this specification. The named font direction is approved by the user; additional page compositions are not part of that approval.

## Reconnaissance and current state

- Read `AGENTS.md`, architecture and change protocols, `src/styles/UI.md`, component/layout contracts, and the site layout `SPEC.md`. Inspected global CSS, both routes, the site shell, current content, package scripts, integration tests and their build-fixture helper. The working tree was clean.
- `src/styles/global.css` holds Tailwind 4 CSS-first `@theme` tokens: `--font-sans` uses system fonts and `--font-display` uses Georgia. The body applies `font-sans`; headings and the text site name use `font-display`. There are no bundled fonts, font packages or font-loading integrations.
- Existing usage needs regular headings/body text, semibold links/labels and narrative strong emphasis. Narrative blockquotes currently use italic display text. Reading content already uses `text-lg`, relaxed leading and `max-w-prose`; headings have responsive sizes. Navigation, dates and captions are smaller text. No handwritten annotations or torn-paper/stamp components exist.
- Tailwind's installed theme/preflight supplies default font inheritance and weight utilities. The existing CSS token approach is sufficient; no Tailwind configuration file or new typography library is required. ADR 0004 confirms the small-token approach rather than requiring a broader design system.
- Astro's site shell imports global CSS. Existing Node integration tests build isolated copies, copy `src/`, and reject build-time network requests. They cover semantic output and static behavior, but there are no font asset, glyph-coverage or loading checks.
- Upstream metadata lists normal/italic variable fonts and Latin Extended for [Cormorant Garamond](https://github.com/google/fonts/blob/main/ofl/cormorantgaramond/METADATA.pb) and [Source Serif 4](https://github.com/google/fonts/blob/main/ofl/sourceserif4/METADATA.pb). [Allura](https://github.com/google/fonts/blob/main/ofl/allura/METADATA.pb) lists regular 400 and Latin Extended. These three list OFL licensing. [Special Elite](https://github.com/google/fonts/blob/main/apache/specialelite/METADATA.pb) lists regular 400, Apache 2.0 and Latin only. These are source-selection leads, not proof of the glyph coverage of a particular delivered file; verify selected binaries and accompanying licenses during implementation.

## Semantic roles and durable contract

Define the following family roles in `global.css` using the existing `--font-*` Tailwind namespace. Consumers use role utilities rather than literal font-family declarations or new per-component combinations.

| Token / utility                                 | Face and responsibility                                                                                       | Restrictions                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--font-display` / `font-display`               | Cormorant Garamond: major headings, editorial titles, existing typographic site name                          | Keep small text and long reading passages in the body role. Do not reinterpret an authored brand logo as text. |
| `--font-body` / `font-body`                     | Source Serif 4: body, long-form prose, navigation, controls, captions, ordinary dates/labels, supporting text | Default readable role, including fallback for unsuitable decorative treatment.                                 |
| `--font-annotation` / `font-annotation`         | Allura: short personal notes, handwritten annotations or signature-like accents                               | Opt-in only; never normal body copy, navigation, controls or long passages.                                    |
| `--font-editorial-note` / `font-editorial-note` | Special Elite: short stamps, dates, torn-paper notes or editorial labels in a deliberately selected context   | Opt-in only; never general body or heading typography, and not automatically every date/label.                 |

`UI.md` owns this role mapping, hierarchy, readability and restrained-use rules. Replace its system-body baseline with the approved direction, without copying exact sizes, CSS declarations or file inventories into that contract. Tailwind/CSS owns stacks, weights, sizing, leading and mechanics. Unit `SPEC.md` files own context-specific behavior and refer to these shared roles. Figma remains optional exploration/review; repository contracts and production code remain canonical.

Use Source Serif 4 as the body/default inherited font without falsely naming a serif stack `font-sans`. Keep the existing system sans stack only if an actual separate use warrants it. Provide serif fallbacks such as Georgia, Times New Roman and generic serif for display/reading. Decorative stacks must end in a dependable readable fallback; generic cursive alone is insufficient. Fallbacks must preserve text and semantics when local fonts fail.

Retain the current heading hierarchy, page composition and bounded reading measure. Review sizes/leading after the family change: long-form text must remain comfortable, headings must not clip Czech marks, and controls/navigation must remain legible. Source Serif 4 italic becomes the narrative quotation/emphasis treatment, replacing the current display-italic blockquote family; retain its existing border and spacing. Keep display character concentrated in headings. Do not introduce a comprehensive type scale or duplicate existing spacing tokens.

Accent roles may be available without being applied to current production pages. Do not invent handwritten copy, stamps, notes or torn-paper UI simply to demonstrate all four families. Neither font choice nor handwriting conveys essential information by itself; retain real semantic HTML text, reading order and accessible names.

## Asset selection and minimal payload

Prefer vetted WOFF2 assets under `src/assets/fonts/`, referenced through CSS so Astro/Vite emits cacheable asset URLs. Keep only the selected web assets and required license/provenance records in Git, not entire upstream distributions. Record exact source/version or revision, license, selected styles, glyph coverage, any conversion/subsetting and resulting byte sizes in a small colocated README. Preserve required notices and follow license conditions for modifications.

Initial usage requires:

- Cormorant Garamond: normal 400 for current display roles. Check its contrast/readability at existing sizes; an additional heading weight needs a demonstrated use. No display italic is needed after moving narrative quotations to the reading role.
- Source Serif 4: normal 400 and 600 for reading and existing semibold emphasis, plus true italic 400 for prose emphasis/quotations. Support the actual authored emphasis combinations; add another style only when content needs it, rather than silently relying on synthesized bold/italic.
- Allura and Special Elite: their regular 400 only, opt-in. Do not synthesize bold or italic accent styles.

Compare the byte cost of narrowly selected static WOFF2 files with an appropriately limited variable file for Source Serif 4; choose the smaller practical solution for these uses. Do not ship static and variable duplicates. Preserve or deliberately choose Source Serif's reading optical size when selecting static instances; if an optical-size axis is retained, use appropriate optical sizing. Avoid every available weight, style, script or axis range by default. Record the final inventory and actual page-request payload rather than inventing unmeasured byte claims now.

## Czech coverage and decorative limitations

Select assets covering Czech upper/lowercase diacritics, ordinary Latin, digits and Czech punctuation, including quotation marks, dashes and ellipsis. Do not subset only to today's page strings: future Czech content must work without regenerating fonts. Latin Extended labels are an initial filter, not an acceptance test; inspect the actual font character map and render representative text, including `Příliš žluťoučký kůň úpěl ďábelské ódy` and uppercase accented letters.

Special Elite's currently listed Latin-only coverage is a known verification risk. Never remove diacritics, invent glyphs, or accept visually mixed fallback letters inside Czech labels. If the selected licensed asset lacks needed characters, retain the approved accent role but render the whole affected label in the body role and document its usage limitation. No automatic JavaScript glyph detector, custom font extension or silent replacement family is required. Any proposal for a different accent family requires human approval. Test the fallback case explicitly; do not claim all four supplied faces support Czech without evidence.

## Loading and static delivery

Use local `@font-face` declarations with accurate weight/style descriptors and `font-display: swap` as the starting policy. Font definitions must not force downloads for unused roles. No hosted font CSS, Google Fonts runtime requests, third-party preconnects, font-loading JavaScript or font fetching during build/CI. Obtaining assets is an implementation-time authoring step; subsequent clean builds use committed assets offline.

Preload only measured, above-the-fold critical faces when beneficial: initially consider one regular body face and one regular display face, not every weight, italic or accent. Use the exact emitted asset URL with the correct font type and crossorigin behavior to avoid duplicate downloads. Omitting an unnecessary preload is preferable to adding one speculatively. Accent files must not load on pages that do not use them.

Compare fallback and loaded rendering on slow/blocked-font connections. Use suitable fallback stacks and, where measurement justifies them, narrowly scoped metric adjustments (`size-adjust` and ascent/descent/line-gap overrides). Do not copy arbitrary metric percentages or promise zero layout shift. Keep content immediately usable, prevent clipping/overflow and record any remaining material font-swap movement. Hosting and deployment stay ordinary static assets on GitHub Pages.

## Affected areas and architectural impact

Expected implementation: `src/styles/global.css`, `src/styles/UI.md`, selected `src/assets/fonts/` assets and provenance/licenses; minimal `SiteLayout.astro` loading hints if justified; site layout `SPEC.md` wording; both routes only where role/readability adjustments are necessary; focused font/build tests and fixture updates where required. Link shared rules from the component contract only if needed. Preserve content/media schemas, media rendering, imagery, colors, deployment setup and runtime behavior.

There is no production architectural change: this is a small presentation foundation within Astro/Tailwind. No SSR, database, runtime API, font service, client framework, typography component library, Figma synchronization or new design-system pipeline. No new dependency or build integration is necessary by default. Do not introduce a separate font-management subsystem or permanent preview application.

## Validation and observable acceptance criteria

1. `UI.md` records the approved families, semantic roles, reading priorities, accent restrictions and fallback/Czech limitations. Exact implementation details remain in CSS and asset provenance. The site layout contract no longer describes a system-font body.
2. Existing headings use Cormorant Garamond; body/navigation/captions/prose use Source Serif 4; narrative strong and italic text use intentional available styles. Existing page structure and semantic HTML remain intact. Accent roles work in isolated fixtures without adding speculative production content.
3. Selected WOFF2 files have documented provenance/licenses, verified glyph coverage and a minimal usage-based style inventory. Test Czech characters, punctuation, uppercase, emphasis and the whole-label fallback for unsupported accent text. Do not rely solely on computed `font-family` or `document.fonts.check()` as proof of individual glyph coverage.
4. Production build output references existing local font files with correct descriptors. Any preload points to the same emitted URL used by CSS. A clean offline fixture build succeeds, with no runtime external font requests or font-loading scripts.
5. Browser network inspection confirms used families/styles load successfully, unused accents do not load, and preload choices do not duplicate requests. Record actual font payload for homepage and Project detail under cold-cache conditions.
6. Review those routes and a temporary typography specimen at narrow and wide widths, 200% zoom, and slow/blocked fonts. Verify Czech marks, line length, line height, quotation/emphasis legibility, header reflow and stable usable fallback rendering. No new horizontal overflow, obscured controls or decorative text too small to read; evaluate font-swap movement against the fallback render.
7. Extend the existing Node/isolated-build approach with focused output/asset checks, colocating style-specific tests when appropriate and wiring them into normal validation. Use browser/font inspection for actual rendering and coverage rather than source-string tests alone. Run `npm run validate` and preserve all existing media/content checks.
8. Implementation updates durable contracts, removes this temporary file and follows the commit lifecycle only after the specification has been reviewed and committed. Creating this specification changes no production files.
