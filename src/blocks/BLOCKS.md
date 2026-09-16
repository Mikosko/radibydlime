# Semantic block contract

Blocks express what authored content means; Astro rendering decides how it appears. Narrative content must not embed executable application code, component imports, or arbitrary author-defined logic.

Use Markdoc's narrative capabilities for ordinary content. Introduce an explicit semantic tag and renderer only when a concrete content requirement needs one. Define and validate supported attributes and inputs; keep application behavior in application code.

Possible future concepts include images, galleries, before/after comparisons, quotes, callouts, materials, measurements, videos, and content feeds. This is vocabulary guidance, not a bootstrap backlog. Do not create placeholder implementations or directories for these concepts.

Future feed/query blocks may express intent such as latest, tagged, related, manual, upcoming, or available. They should reuse Content Collection records under the content contract. Do not build a generalized query engine now.

Navigation, footer, and other global chrome belong to layouts.

## Article image and illustrated section

`article-image` renders one published media-catalog image at the article's content width. `article-section` pairs prose with one visual, placing that visual on the `left` or `right` at desktop widths and preserving the same order on narrow screens. Both are explicit Markdoc tags, so ordinary paragraphs, headings, lists, and quotations remain ordinary Markdoc. Neither tag adds client-side JavaScript.

Use a stable `mediaId` for photographic content. `article-section` may instead use one named local `decoration` from its small authored illustration set. Exactly one visual reference is required. The block resolves public media IDs at build time through the canonical catalog and [MediaImage](../components/media-image/SPEC.md); invalid IDs or decoration names fail the build. Decorative art receives empty alt text; published media keeps catalog alt text and intrinsic dimensions. Text remains real Markdoc content. Visual style and responsive columns belong to the renderers, not author-supplied CSS or raw URLs.

Example authoring:

```mdoc
{% article-image mediaId="media-your-published-id" /%}

{% article-section mediaId="media-your-published-id" side="left" %}
Text beside the photo.
{% /article-section %}

{% article-section decoration="construction-house" side="right" %}
Text beside the drawing.
{% /article-section %}
```

The available decoration names are `leaf-sprig`, `construction-hammer`, `construction-trowel`, and `construction-house`. The hero remains a separate Project field above the narrative. `article-image` uses the catalog's optional caption and credit; do not duplicate that metadata in Markdoc.
