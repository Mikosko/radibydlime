# Author card

`AuthorCard.astro` renders a reusable article-author panel from an explicitly supplied author profile. The route resolves the article's stable `authorId`; the component does not query content or select an author itself.

The profile owns its Czech heading (`O autorce`, `O autorovi`, or another reviewed form), name, portrait and alternative text, biography, optional non-semantic decoration, and optional profile destination. Omit the link when no real author page exists. Article files reference the profile ID instead of duplicating these details.

The component owns the bordered editorial-card presentation, accessible heading relationship, and author-specific corner ornament. It renders a profile's optional decoration with empty alternative text; an author without one has no ornament. The surrounding article layout owns placement among other sidebar widgets.
