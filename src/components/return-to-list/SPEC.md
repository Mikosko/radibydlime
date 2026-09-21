# Return to list

Opt-in, script-only enhancement used on album, Project, workshop and sale detail pages. Anchors marked `data-return-to-list` retain real listing URLs.

For an unmodified primary click in the same tab, use native history.back only if a previous entry exists and the document referrer matches the target's origin, path and query. This restores the browser's previous scroll position without storage or overriding scrollRestoration. Direct visits, different referrers, new tabs, modified clicks, downloads and JavaScript-disabled visits keep ordinary link navigation. No route interception, framework, runtime API or site-wide script.

Verify an actual scrolled listing → detail → return round trip and direct-visit fallback in a browser. The component has no visible UI.
