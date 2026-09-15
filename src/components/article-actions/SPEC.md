# Article actions

`ArticleActions.astro` adds optional browser-side utilities to an article while preserving the static document and reading experience. Routes provide the article's stable language-neutral ID and title.

The circular heart and bookmark controls store distinct favorite and read-later preferences in the browser under `radibydlime:article-preferences`, keyed by stable article ID. They restore their pressed states on later visits and synchronize changes made in another tab. These local preferences do not imply an account, cross-device synchronization, or a public saved-articles index.

Sharing uses the browser's native share capability when available and otherwise copies the canonical page URL to the clipboard. Both controls communicate outcomes through a polite live region, expose visible keyboard focus, and remain hidden when JavaScript cannot initialize them so the static page never presents inert controls.

Keep the script small and framework-free. It must not add a runtime service, tracking, authentication, or a server dependency.
