# Gallery pages

`/galerie/` is the album index, replacing the unimplemented Zápisky destination. It queries published [albums](../../content/albums/SPEC.md) and shows responsive cards with cover, title, description and derived photo count. Each card opens `/galerie/<slug>/`; the index has no image dialogs. An empty state handles no published albums.

Album detail pages use the existing ArticleGallery grid and modal viewer with captions, chevrons, keyboard navigation and native dialog focus handling. Both top and bottom link back to all albums. An optional related published Project links by resolved canonical ID. Gallery remains current in primary navigation on both index and detail pages.

Reuse the shared shell, local typography and restrained botanicals. No new runtime service or gallery framework is introduced; remote catalog images are never fetched at build time. Initial albums contain sample photos. Pagination is deferred until the album count needs it.
