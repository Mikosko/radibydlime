# UI contract

This contract defines shared visual intent and the design review workflow. Git documentation, content, and production code remain canonical under the [architecture contract](../../architecture/ARCHITECTURE.md).

## Visual principles

The current site provides an evolving baseline, not a finalized brand system:

- **Direction:** calm, warm, editorial presentation that gives family stories, restoration work, and real content room to lead.
- **Typography:** clear hierarchy, serif display emphasis, and legible system-font body text. Preserve Czech readability and comfortable line spacing.
- **Spacing/layout:** consistent rhythm and generous separation should express content grouping. Prefer simple, content-driven composition.
- **Content widths:** use a bounded page shell and a narrower reading measure for prose; extra screen space should not produce excessively long lines.
- **Imagery/photo treatment:** support the real subject, preserve important details when cropping, and avoid distortion. Retain meaningful captions and credits. The sample illustration does not establish a photographic style.
- **Color:** use warm paper surfaces, dark green primary text, muted secondary text, quiet borders, and restrained earthy accents as the baseline. Communicate meaning through more than color alone.
- **Responsive behavior:** begin with narrow screens; let navigation and content reflow while preserving reading order and hierarchy. Design for intermediate widths and zoom as well as representative Figma frames.
- **Interaction/motion:** favor clear native interactions and visible feedback. Motion is optional and purposeful; respect reduced-motion preferences when introducing it. Essential content must not depend on hover or animation.
- **Accessibility:** use semantic structure, readable contrast, visible keyboard focus, keyboard-operable controls, meaningful image alternatives, and usable zoom/reflow. Verify the actual browser experience as well as reviewing designs.
- **Reuse:** use established Tailwind tokens and components. Extract shared abstractions only after concrete reuse demonstrates a common need.

Detailed photography art direction, further page compositions, and any motion language remain open for real examples and human review. Evolve this contract from accepted decisions; do not fill these gaps with an exhaustive palette, scale, or component inventory.

## Responsibility boundaries

- **This file** owns cross-page principles, open visual decisions, and the review workflow.
- **[Tailwind/CSS](global.css)** owns exact token values and styling mechanics; utilities and styles implement spacing, widths, typography, and breakpoints. Do not duplicate those values here.
- **[Components](../components/COMPONENTS.md) and [layouts](../layouts/LAYOUTS.md)** implement reusable presentation. Their local `SPEC.md` files own meaningful unit-specific behavior, accessibility obligations, and design rules, referring to shared principles rather than copying them.
- **[Content contracts](../content/CONTENT.md)** own content meaning and image metadata, including local assets, published media IDs, alt text, captions, and credits.
- **Figma** holds visual alternatives, composition experiments, annotations, and review references. It does not override repository architecture or contracts.
- **Production Astro code** delivers static pages, semantic markup, responsive behavior, and local/published-media rendering according to accepted repository contracts.

Resolve conflicts through an explicit repository change. Update lasting principles and relevant local contracts when an approved implementation changes them.

## Exploration and review

**Repository UI contract → Figma exploration → human review/approval → repository change specification → Codex implementation.**

1. Read this contract and relevant current code/contracts. Explore with realistic content, representative narrow/wide layouts, and interaction states needed to explain the proposal.
2. Use Figma as the visual exploration and review surface. Agents may create or inspect designs through available Figma tooling when appropriate to the task. No particular MCP implementation or desktop app is mandatory for the project. Developers may choose the [optional local bridge](../../docs/figma-local.md), which requires Figma Desktop and a development plugin on their machine.
3. Obtain explicit human approval of the chosen proposal. Distinguish accepted decisions from alternatives and unresolved questions. A file edit, tool result, or design link alone is not implementation approval.
4. After approval, perform repository reconnaissance and create a temporary specification following [CHANGES.md](../../changes/CHANGES.md). Record the approved file/frame reference, an identifiable reviewed revision or snapshot where useful, and approval context. Describe accepted layout, responsive behavior, relevant states, assets, accessibility expectations, observable acceptance criteria, and needed contract updates in repository text. Resolve material gaps before dependent implementation.
5. Review and commit that specification through the existing lifecycle before Codex implementation. Translate approved intent into Astro and Tailwind, verify the browser result, and preserve lasting decisions in repository contracts. Design approval does not bypass specification review or authorize unrelated changes.

Keep the handoff understandable without live Figma access: repository text must capture accepted requirements, and production assets follow the content contracts: small authored assets may remain local; published photographs use Git-canonical media metadata and external static image bytes. Retain a reference image only when a concrete decision needs one; no routine export pipeline or mandatory artifact bundle is required. Routine presentation maintenance need not start a new Figma exercise.

## Progressive adoption

Figma stays completely outside the build and production runtime and can be replaced without changing the website architecture. Optional bridge processes and plugins belong to developer machines; they introduce no website dependencies, runtime server, SSR, or database.

Do not introduce a large design system, component library, token synchronization, Code Connect, bidirectional component sync, Figma-to-code automation, or repository-managed integration infrastructure at this stage. Additional machinery requires a later change justified by repeated concrete use cases.
