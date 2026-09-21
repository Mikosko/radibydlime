# Page container

`PageContainer.astro` supplies the shared section-page content width, horizontal centering, and top/bottom spacing. The site layout already supplies responsive horizontal gutters; do not duplicate them here. It is a neutral div with a default content slot, not another main landmark.

Section pages compose it with PageHeader. The optional class prop preserves page-specific hooks (such as contact-page), not independent width or padding overrides. Landing and detail-page editorial layouts retain their own composition. No JavaScript is emitted.
