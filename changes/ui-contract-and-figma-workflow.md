# Minimal UI contract and Figma exploration workflow

## Goal

Establish a lightweight, durable repository contract for visual presentation and a Figma exploration/review workflow for future page design. Keep Git documentation and production code canonical, and adopt further design-system machinery only after repeated concrete needs justify it.

## Current relevant state

- `AGENTS.md` routes agents to architecture, subsystem contracts, and relevant local specifications; it has no visual-work route.
- `architecture/ARCHITECTURE.md` requires static Astro output, Git-owned portable content, Tailwind styling, and minimal abstractions.
- `src/styles/global.css` holds a small Tailwind theme and narrative styles. The homepage, Project detail route, and site layout use warm paper surfaces, dark green text, restrained earthy accents, serif headings, system body fonts, generous spacing, and bounded widths with narrower prose.
- `src/components/COMPONENTS.md`, `src/layouts/LAYOUTS.md`, and `src/layouts/site/SPEC.md` already define presentation responsibilities, accessibility, and meaningful local contracts. Project content owns local image references, alt text, captions, and credits.
- The site uses a sample SVG illustration. It has no established photography art direction, UI contract, or documented Figma workflow. The current sample is not a finalized brand reference.
- `tests/integration/content-build.spec.ts` checks static output, metadata, navigation, local images, and content behavior. There are no visual regression tests or Figma integration tests.

Reconnaissance covered these contracts, the stylesheet, both page routes, the site layout implementation, relevant integration checks, and package scripts. This proposal extends existing conventions without replacing an architectural decision.

## Desired resulting state

### UI contract and routing

Add `src/styles/UI.md` beside the existing global stylesheet. It owns cross-page visual intent and the lightweight design workflow. Keep it a short, readable contract with brief principles, not a comprehensive design-system manual or a catalog of CSS values.

Add a task-specific link in `AGENTS.md` directing agents to read this contract before visual design exploration, visual review, or presentation changes. Preserve progressive context loading and the router's concise role. Add a short reference in the architecture styling section so the responsibility is discoverable without duplicating the contract.

The initial contract must address:

- **Overall direction:** use the current calm, warm, editorial presentation as an evolving baseline for family stories and restoration work; distinguish existing conventions from decisions still awaiting exploration.
- **Typography:** preserve a clear hierarchy, readable Czech text, serif display emphasis, and a legible system-font body baseline. Font declarations and precise scales remain in styles.
- **Spacing/layout:** use consistent rhythm and generous separation that communicate content grouping; favor simple, content-driven layouts over ornamental complexity.
- **Content widths:** distinguish the bounded page shell from comfortable reading measures; avoid stretching prose across the full available screen. Exact widths remain in implementation.
- **Imagery/photo treatment:** let imagery support the real subject, preserve important details when cropping, avoid distortion, and retain meaningful captions/credits. Do not turn the sample illustration into a mandatory photographic style; leave detailed art direction open for reviewed examples.
- **Color usage:** describe roles for surfaces, primary and secondary text, borders, and restrained emphasis using the existing palette as the baseline. Do not duplicate hex values or rely on color alone to convey meaning.
- **Responsive behavior:** design for narrow screens first, allow content and navigation to reflow, retain reading order and hierarchy, and support larger screens without excessively wide text. Fixed Figma frames do not define every viewport's behavior.
- **Interaction/motion:** favor clear native interactions and visible feedback. Motion is optional, purposeful, and must respect reduced-motion preferences when introduced; essential content must not depend on animation or hover.
- **Accessibility:** require semantic structure, readable contrast, visible keyboard focus, keyboard-operable controls, meaningful image alternatives, and usable zoom/reflow. Visual review does not replace verification in the browser.
- **Relationship to implementation:** reuse established Tailwind tokens and components; add abstractions only for demonstrated reuse. Update durable principles when approved decisions change them, without mirroring utility classes or component internals.

Leave unresolved choices explicitly open. Do not invent a full palette, spacing scale, component inventory, motion language, or exhaustive page rules merely to fill the document.

### Responsibility boundaries

| Surface                            | Responsibility                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/UI.md`                 | Durable cross-page visual principles, open visual decisions, and the design review workflow.                                                                                     |
| Tailwind theme, utilities, and CSS | Executable values, styling rules, breakpoints, and concrete presentation mechanics.                                                                                              |
| Component/layout `SPEC.md`         | Meaningful local behavior, accessibility obligations, and unit-specific design rules; refer to shared principles instead of copying them.                                        |
| Figma                              | Visual alternatives, composition experiments, annotations, and human review references. It does not override repository architecture, content contracts, or production behavior. |
| Production Astro code              | Working static pages and components, semantic markup, responsive behavior, and asset rendering governed by accepted repository contracts.                                        |

Content models continue to own content meaning and image metadata. Neither Figma frames nor the UI contract introduce new domain schemas. Resolve conflicts through an explicit repository change rather than treating a design artifact as an implicit override.

### Figma exploration and implementation handoff

Document this sequence: **repository UI contract → Figma exploration → human review/approval → repository change specification → Codex implementation**.

1. Read the UI contract and relevant current code/contracts before exploring a page. Use realistic content and representative narrow/wide layouts and relevant interaction states where needed to explain the proposal.
2. Use Figma as the intended visual exploration and review surface. Agents may create or inspect designs through available Figma tooling when appropriate to the task. Do not prescribe a particular MCP implementation, require the desktop app, or install integration infrastructure as a prerequisite.
3. Obtain explicit human approval of the chosen proposal. Keep alternatives and unresolved questions distinct from accepted decisions. A Figma edit, tool output, or link by itself is not approval to implement.
4. After approval, perform repository reconnaissance and create a later temporary change specification under `changes/CHANGES.md`. Record the approved design reference (file/frame and identifiable reviewed revision or snapshot where useful), approval context, and a concise textual account of the accepted layout, responsive behavior, states, assets, and relevant accessibility expectations. Include observable acceptance criteria and identify required contract updates. Resolve material gaps before dependent implementation rather than guessing from a screenshot.
5. Review and preserve that specification through the existing lifecycle before Codex implementation. Translate the approved intent into Astro and Tailwind, verify the actual browser result, and preserve lasting decisions in repository contracts. Approval of the exploration does not bypass specification review or authorize unrelated changes.

The repository handoff must remain understandable if a Figma link becomes unavailable. Keep accepted requirements in text and any production assets local under existing content conventions; retain a reference image only when necessary to communicate a concrete decision. No routine export pipeline or compulsory artifact bundle is required. Figma must remain replaceable without changing the production architecture, and routine presentation maintenance need not require a new Figma exercise.

## Scope and constraints

The implementation of this specification is documentation only: add `src/styles/UI.md`, add routing in `AGENTS.md`, and add the brief architecture reference. Remove this temporary specification only through the normal completed-change lifecycle.

Do not redesign existing pages, modify CSS/tokens, create components, change content, create or modify Figma designs, or require a Figma file for acceptance of this iteration. Do not add runtime or development dependencies, scripts, credentials, hosting changes, SSR, a server, or a database.

Explicitly exclude a large design system, component library, Figma token synchronization, Code Connect, bidirectional component sync, Figma-to-code automation, and any tool-specific integration setup. Introduce additional machinery only through later changes justified by repeated concrete use cases.

## Observable acceptance criteria

1. `src/styles/UI.md` exists as a concise contract covering all ten topics above, separates established baseline from open choices, and points to implementation for exact values rather than duplicating them.
2. `AGENTS.md` routes visual tasks to it; the architecture styling section links to its responsibility without becoming a second visual rulebook. All new local links resolve.
3. The documented boundaries make Git/contracts/code canonical, keep Figma outside production, and distinguish shared principles from CSS mechanics and local specifications.
4. The complete exploration-to-implementation sequence includes human approval and the existing change-specification lifecycle. A later implementer can identify the approved reference and accepted requirements from repository documentation without relying solely on live Figma access.
5. The workflow allows available Figma tooling without requiring a particular MCP, desktop app, or advanced synchronization infrastructure; it permits progressive adoption and future replacement.
6. The implementation diff contains only the described documentation changes and lifecycle removal. Existing UI, assets, package files, and deployment behavior remain unchanged.
7. Review the final documentation against these criteria, check links and formatting, and run `npm run validate` under the repository protocol. No new tests or visual-testing infrastructure are needed for this documentation-only change.

## Architectural impact

Add one durable visual responsibility and a review convention under the existing styling rules. Static-first Astro, Tailwind ownership of styling, Git as the canonical source, local portable assets, and current subsystem boundaries remain intact. Figma introduces no build or runtime dependency. A short architecture reference is sufficient; no new ADR is needed for this iteration.
