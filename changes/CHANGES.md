# Change specification protocol

This file is the durable protocol. Other Markdown files in this directory describe temporary desired future state, not current architectural truth.

## Reconnaissance before writing

1. Inspect the affected implementation.
2. Read `architecture/ARCHITECTURE.md`.
3. Read relevant subsystem documentation.
4. Read affected local `SPEC.md` files.
5. Inspect relevant tests; note when none exist.
6. Consult relevant ADRs only when architectural reasoning is needed.
7. Identify the likely scope, dependencies, and impact.

Then create `changes/<descriptive-name>.md`.

Keep it concise and grounded in the inspected repository. Include:

- Goal.
- Current relevant state.
- Desired resulting state.
- Relevant constraints.
- Affected areas.
- Observable acceptance criteria.
- Architectural impact, or an explicit statement that there is none.

Prefer behavioral requirements over low-level coding instructions.

Prescribe implementation details only when needed to preserve an actual constraint.

Record architectural changes explicitly rather than silently overriding existing contracts.

## Lifecycle

Human request → repository reconnaissance → temporary change specification → spec commit → implementation → tests → durable SPEC updates → validation/build → remove temporary change file → implementation commit.

The spec commit preserves the request in Git history.

Update relevant subsystem and architecture contracts and add or supersede an ADR when the change warrants it.

Create or update local `SPEC.md` files only where meaningful lasting behavior exists.

If implementation or validation remains incomplete, retain the temporary change file and report the unresolved work.

Follow explicit session instructions about commits.

If commits cannot be made, keep the temporary specification until its history can be preserved and report the pending lifecycle step.

## Git workflow

A normal change should produce two logical commits:

1. a specification commit
2. an implementation commit

The goal is to preserve both the requested change and the resulting implementation in Git history without introducing unnecessary commit ceremony.

### Specification commit

After the temporary change specification has been reviewed and accepted, commit it separately before implementation begins.

Preferred commit format:

`spec: <short description>`

Examples:

- `spec: add GitHub Pages deployment`
- `spec: add project listing`
- `spec: simplify image metadata`

The specification commit should normally contain only:

- `changes/<descriptive-name>.md`
- directly related specification metadata, if any

Do not mix implementation work into the specification commit.

The committed temporary specification becomes the historical record of what was requested.

### Implementation commit

After implementation is complete:

1. run the relevant tests and validation
2. update durable contracts where required
3. inspect the final diff against the accepted change specification
4. remove `changes/<descriptive-name>.md`
5. create the implementation commit

Use a concise Conventional Commit-style prefix where useful.

Preferred prefixes:

- `feat:` — new user-visible capability
- `fix:` — bug fix
- `refactor:` — behavior-preserving restructuring
- `chore:` — tooling, deployment, configuration, dependencies, or maintenance
- `docs:` — documentation-only change
- `test:` — test-only change

A scope may be added when it improves clarity.

Examples:

- `feat(projects): add project listing`
- `feat(workshops): add workshop detail page`
- `fix(gallery): preserve image aspect ratio`
- `refactor(content): simplify reference resolution`
- `chore(deploy): add GitHub Pages deployment`
- `docs(content): clarify image metadata rules`

Do not add a scope merely for consistency.

The implementation commit should contain the complete coherent resulting change, including where applicable:

- implementation
- tests
- local `SPEC.md` updates
- subsystem contract updates
- `architecture/ARCHITECTURE.md` updates
- new or superseding ADRs
- configuration changes
- removal of the temporary change specification

Do not split implementation into separate commits merely by file type.

For example, avoid creating separate commits for:

- implementation
- tests
- documentation
- formatting

when all of them form one logical change.

Prefer one coherent implementation commit.

### Commit quality

Commit messages should describe intent, not mechanics.

Prefer:

`chore(deploy): add GitHub Pages deployment`

over:

`chore: update yaml`

Prefer:

`feat(projects): add project listing`

over:

`feat: add files`

Avoid vague messages such as:

- `update files`
- `changes`
- `fix stuff`
- `misc`
- `cleanup`
- `wip`

unless an explicit workflow requires them.

Do not include unrelated modifications in either the specification or implementation commit.

Do not rewrite or amend unrelated existing history unless explicitly requested.

## Specification divergence

Implementation must remain consistent with the accepted change specification.

If implementation reveals that the specification is materially incorrect, incomplete, or conflicts with repository architecture, do not silently diverge from it.

Instead:

1. identify the issue
2. update the temporary change specification
3. explain the material change
4. preserve the revised specification in Git history before completing implementation

Small implementation discoveries that do not alter requested behavior or architectural intent do not require a new specification commit.

Use judgment: the specification describes desired behavior and constraints, not every implementation detail.

## Incomplete work

Do not create the final implementation commit when the accepted change is materially incomplete.

If implementation, tests, validation, or required contract updates remain unresolved:

- keep `changes/<descriptive-name>.md`
- leave the unresolved state visible
- report what remains incomplete
- do not represent the change as finished

If commits are not permitted in the current session, preserve the working tree state and report which lifecycle step is pending.

## Architectural changes

A change specification may intentionally modify architecture.

When it does:

- state the architectural impact explicitly in the change specification
- update `architecture/ARCHITECTURE.md` as part of implementation
- add or supersede an ADR when the reasoning is important to preserve

The architecture documentation after the implementation commit must describe the new current truth.

Do not leave architecture documentation describing the pre-change state.

## Initialization exception

Phase 1 initialization is governed directly by `INIT.md`.

It creates documentation only and does not require an additional temporary change specification or application bootstrap.

Once initialization is complete, normal repository evolution should follow this change protocol.
