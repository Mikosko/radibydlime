# Not found

During preparation, `src/pages/404.astro` renders the same shared PreparingPage as `/`, without a redirect. GitHub Pages still returns HTTP 404 for unknown addresses. The illustrated design below is preserved at `/nahled/404/` for review and can be restored at launch.

The intended launch design produces GitHub Pages' static `404.html`. It uses the shared shell, one heading, a clear Czech 404 explanation and root-relative links home and to Kapitoly. Asset URLs must work even for deeply nested unknown addresses.

Four local decorative illustrations pair with four Czech titles/notes: gate, wheelbarrow, sleeping cat and signpost. A small synchronous inline script selects one pair once per document load; no timer, persistence, framework or service. The gate is the complete no-JavaScript fallback. Images have empty alt text because the HTML explains the error; intrinsic dimensions and a fixed illustration area preserve layout. The normal footer remains but the discovery strip is omitted.

Generated illustrations are optimized locally by Astro; no runtime image transformations. Validate all four pairings, emitted 404.html, asset paths, no-script content and narrow-screen rendering. GitHub Pages owns the HTTP 404 response; no redirect or SPA fallback is used.
