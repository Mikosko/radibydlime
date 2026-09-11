# Component contract

- Use Astro components by default. Ship client-side JavaScript only when interaction requires it.
- Use Tailwind and the project's established styling tokens and conventions.
- Accessibility is required: use semantic HTML, appropriate accessible names, keyboard-operable interactions, and visible focus where applicable.
- Presentational components receive data through typed inputs; they do not fetch or query content themselves. Routes or other assembly code supply it.
- Extract shared components only when concrete reuse establishes a common concept. Do not build a component library during initialization.
- Colocate tests for meaningful local behavior. Add a local `SPEC.md` when durable behavioral or design rules warrant it; do not create either for symmetry alone.

A unit with such a contract may use `src/components/workshop-card/WorkshopCard.astro`, `WorkshopCard.spec.ts`, and `SPEC.md`. This illustrates colocation only; it is not an instruction to create a workshop card.

Render published media IDs through [MediaImage](media-image/SPEC.md), supplying a validated catalog from route/assembly code. It owns native image semantics and resolution; consumers own contextual presentation, captions and credits. Local authored assets continue using Astro's `Image`.
