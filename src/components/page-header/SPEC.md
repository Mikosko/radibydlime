# Page header

`PageHeader.astro` owns the shared section-page introduction: eyebrow paragraph, one h1, lead paragraph and optional supporting paragraph. String props preserve semantic HTML and centralize their font roles, sizes, widths and spacing. Headings use display typography; both introductory paragraphs use body typography. Titles wrap naturally rather than requiring page-specific line breaks.

The named `artwork` slot holds a caller-owned image, illustration or icon with any associated decoration. It sits to the right on wide screens and after the copy on narrow screens. Without artwork the header has one column. The optional `annotation` slot follows the introductory copy for existing personal notes. Consumers retain responsibility for meaningful image alternatives and decorative semantics.

The text column aligns to the top of the header rather than vertically centering against taller artwork. The optional class prop supports surrounding spacing/borders, not per-page typography overrides. This static component adds no client JavaScript or content querying. Section indexes use it; the landing page and article/album detail titles retain their distinct editorial structures.
