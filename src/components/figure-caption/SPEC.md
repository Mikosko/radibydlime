# Figure caption

`FigureCaption.astro` renders a shared editorial `figcaption` beneath article images when a canonical caption or credit exists. The article hero supplies its local or resolved media metadata; `article-image` supplies catalog metadata. The component does not invent or edit wording and renders nothing when both fields are absent.

Keep the treatment quiet: a short accent rule, readable body-role caption, and a smaller credit line. The caption remains inside its parent `figure`, follows the image in document order, and conveys meaning through text rather than decoration alone.
