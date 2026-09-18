# Photo albums

Album is an independently authored Content Collection in `*.mdoc`, with stable `album-NNNN` identity, localized unique slug, title, description, status, publication date, and a nonempty ordered image list. Images use published media IDs or local authored sample assets with alt text and optional caption/credit. The first image is the cover; photo counts are derived, not stored. No narrative body is currently rendered.

`getPublishedAlbums` validates IDs, slugs, image references, duplicate images within each album, and optional canonical `projectId` references for all entries, including hidden ones. Only published albums have index cards and detail routes. Albums sort newest first with ID as tie breaker. Optional related chapters link only when that Project is published. Albums work without a Project; they are not generated from Project titles or slugs.

Initial albums use existing illustrative samples. Production photographs should reference catalog media IDs. The index is not paginated yet; pagination can later operate over album records without splitting an album's images.

Projects may reference albums via `galleryId`. `getAlbums` validates and resolves all albums once per project query; `getPublishedAlbums` filters for public listings/routes. Articles consume the same resolved images as standalone album pages, so captions, order and media metadata have one source of truth.
