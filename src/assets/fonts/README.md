# Self-hosted typography assets

These are web subsets/instances of the four approved faces, not new type designs. CSS aliases and internal family names use `Radi Display`, `Radi Reading`, `Radi Annotation` and `Radi Editorial Note` to distinguish modified files and avoid retaining reserved font names. Components use semantic roles documented in [UI.md](../../styles/UI.md).

## Sources and licenses

All originals were obtained from [google/fonts at 809e4d8b8d7e9364a914909bb777679606c178b8](https://github.com/google/fonts/tree/809e4d8b8d7e9364a914909bb777679606c178b8). Source files:

- `ofl/cormorantgaramond/CormorantGaramond[wght].ttf`: Cormorant Garamond, copyright 2015 the Cormorant Project Authors; [OFL](cormorantgaramond-OFL.txt).
- `ofl/sourceserif4/SourceSerif4[opsz,wght].ttf` and `SourceSerif4-Italic[opsz,wght].ttf`: Source Serif 4, the Source Serif Project Authors / Adobe; [OFL](sourceserif4-OFL.txt).
- `ofl/allura/Allura-Regular.ttf`: Allura, copyright 2010 The Allura Project Authors; [OFL](allura-OFL.txt).
- `apache/specialelite/SpecialElite-Regular.ttf`: Special Elite, copyright 2010 Brian J. Bonislawsky DBA Astigmatic (AOETI); [Apache 2.0](specialelite-LICENSE.txt).

Original copyright and license name records remain in each binary. The adjacent license texts are copied unchanged. Local modifications: selected axes/instances, Unicode/layout subsetting, internal naming and WOFF2 encoding. No glyph outlines were designed or extended locally.

## Selection and reproduction

Prepared with FontTools 4.65.0 and Brotli 1.2.0 in temporary authoring tools outside the project. These tools are not needed for installation, build, CI or runtime. To reproduce, obtain the pinned originals, instantiate the axes below, save/reopen the SFNT, subset, rename and encode as WOFF2. FontTools' default retained layout features preserve normal kerning, ligatures and mark positioning; speculative stylistic sets/swashes are excluded. Preserve all original copyright/license name records while replacing family/style/full/unique/PostScript names with the `Radi` aliases (IDs 1, 2, 3, 4, 6, 16, 17; remove obsolete IDs 21, 22, 25).

Retained Unicode input: U+0020–024F, U+0300–036F, U+2000–206F, U+20AC and U+2122, intersected with each font's coverage. This is reusable Latin/Latin Extended/combining marks and punctuation coverage, not a subset of current page copy. Absence of other scripts is intentional; do not imply every point in these ranges exists in every face.

| File                       | Source face / selected axes                            | Bytes  |
| -------------------------- | ------------------------------------------------------ | ------ |
| `display-400.woff2`        | cormorantgaramond / `{'wght': 400}`                    | 29,744 |
| `body-400-600.woff2`       | sourceserif4 / `{'wght': [400, 400, 600], 'opsz': 18}` | 41,960 |
| `body-italic-400.woff2`    | sourceserif4 / `{'wght': 400, 'opsz': 18}`             | 25,620 |
| `annotation-400.woff2`     | allura / `regular 400`                                 | 33,920 |
| `editorial-note-400.woff2` | specialelite / `regular 400`                           | 59,328 |

Source Serif 4 normal is limited to weights 400–600 with optical size fixed at 18 for the site's reading sizes. It uses 41,960 bytes versus 51,200 bytes for separate 400/600 instances with identical subsetting. The italic is a true 400 italic at optical size 18. There are no synthetic bold/italic styles, duplicate static body faces or unused full-axis fonts. Additional authored emphasis combinations, such as semibold italic, require selecting the corresponding style in a future change.

All five delivered binaries were reopened with FontTools and their actual cmap inspected for `ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž„“‚‘’–—…`, ASCII letters/digits and Czech sample text. None were missing. Special Elite contains real composite Czech glyphs even though its upstream metadata lists only Latin. Preserve these checks whenever replacing assets; use the body role for an entire annotation/label if its text needs unsupported glyphs, never strip accents or mix fallback letters intentionally.

## Loading and verification

`global.css` declares local faces with swap behavior. The site shell preloads only the normal body and display files, using the same Vite-resolved URLs as CSS. Italic loads for prose that uses it; accents load only when used. No runtime provider, build download or font-loading JavaScript is involved.

The display-only local Georgia fallback uses `size-adjust: 88.5%`, based on normalized advance-width ratios for representative Czech headings (Cormorant/Georgia approximately 0.88–0.89). Its ascent/descent overrides derive from Cormorant's 924/287 metrics per 1000 units, divided by 0.885, with zero line gap. This keeps the current mobile Project title on one line both before and after font arrival. Systems without Georgia proceed to the remaining serif fallbacks; these adjustments are not a universal metric match.

Browser review used Chrome on macOS with cold font requests at 320, 390 and 1440 CSS pixels, plus the 720-CSS-pixel / 2× raster configuration representing 200% desktop zoom. The homepage requested 71,704 font bytes (display + variable body); the Project detail requested 97,324 bytes including italic. Each requested font loaded once; neither accent loaded on those pages. A temporary specimen verified the actual rendered font for Czech text in all four faces, true body emphasis and a whole-label body fallback for `Ǎ`, which Special Elite lacks.

With simulated 300 ms CSS and 800 ms font delays, preloads began the two critical requests around 5 ms rather than around 310 ms without preload. At 390 pixels, the display fallback adjustment reduced the observed Project layout-shift score from approximately 0.040 to 0.014; the homepage was below 0.001. Some body/italic reflow remains under delayed fonts. These are local measurements, not production performance guarantees. Blocked fonts remained readable without horizontal overflow. Screenshots confirmed Czech marks, accent legibility and long-form spacing; rerun browser checks when typography or content layout changes.

Binary fingerprints below pin the exact files whose coverage was inspected; the focused typography test checks them. They are provenance checks, not a replacement for cmap/browser review after an intentional asset update.

- `display-400.woff2`: `d9eb185ec4ecd584bd963d3585fa07e741645b84e6e455984fd4dd210b9c7802`
- `body-400-600.woff2`: `bbe8e6d1dd96d1bb56c8accc112b75469390a829cbdeb50081efb1b0a92ba954`
- `body-italic-400.woff2`: `6f0c5439b167265d56a4619fc2490d97ee6be57545489b72de530b5d65fe7017`
- `annotation-400.woff2`: `57e322b7dba1542a66ac2c483fef420dc2d4f69a4290addc23900f95b33b294d`
- `editorial-note-400.woff2`: `e02afb71b3accb3a56b00926d929b71d6fc9d4b4fb61bfb5fd2ceaad472d2f6d`
