# Optional local Figma bridge

## Goal

Document an optional developer-local connection from Codex through an MCP bridge and Figma development plugin to an open Figma Desktop design. Basic visual exploration should not depend on the hosted Figma MCP request quota. Preserve the repository and production code as canonical.

## Current relevant state and reconnaissance

Read `AGENTS.md`, `architecture/ARCHITECTURE.md`, `src/styles/UI.md`, `README.md`, and `changes/CHANGES.md`; inspected the existing integration checks and package configuration. The worktree is clean. The site builds static Astro pages and has no Figma dependency. Existing tests validate website output and content, not developer-machine integrations.

`UI.md` already defines exploration → human approval → repository specification → implementation, but currently excludes tool-specific integration infrastructure and says no desktop app is required. Clarify that these restrictions concern mandatory/project infrastructure: developers may opt into a local tool that requires Desktop. The agent router already reaches `UI.md`; it needs no additional route.

Upstream verification on 2026-09-10 identified `@gethopp/figma-mcp-bridge` version `0.0.21`, requiring Node.js 20 or newer. Reviewed the published npm package's manifest, tool registrations, stdio startup, HTTP/WebSocket bridge, upstream README, plugin manifest, and release information. Codex's local CLI help and official MCP documentation confirm user-level stdio configuration.

The released tool surface includes connected-file discovery, metadata/current-page/selection reads, frame/text/shape creation, property edits, and auto-layout. It is sufficient for basic exploration, not the full Figma API. The bridge uses local communication; the plugin must remain running in the target file. Editing requires file edit rights and the design editor, not Dev Mode.

A material limitation is that the released listener does not explicitly bind to loopback and its HTTP/WebSocket request paths have no authentication. Document restricting access to the developer machine; do not describe localhost communication as proof of network isolation. Do not introduce a custom bridge or repository infrastructure to address this.

Verification sources: [upstream project](https://github.com/gethopp/figma-mcp-bridge), [v0.0.21 release](https://github.com/gethopp/figma-mcp-bridge/releases/tag/v0.0.21), [npm package](https://www.npmjs.com/package/@gethopp/figma-mcp-bridge), and [Codex MCP configuration](https://developers.openai.com/codex/mcp/). Distinguish source verification from an actual Desktop connection test.

## Desired resulting state

- Add a concise developer guide at `docs/figma-local.md`, linked from `README.md` and `src/styles/UI.md`. Keep installation details out of the durable visual principles.
- Describe Codex → local MCP process → development plugin → open Figma Desktop design, separately from the hosted integration. Desktop is required only for this optional route.
- Prefer the verified bridge conditionally on its documented limitations being acceptable. Show an invocation pinned to the verified release and explain that the unversioned `npx -y @gethopp/figma-mcp-bridge` follows the current npm version. Recheck compatibility when upgrading the server and plugin.
- Provide user-level Codex CLI/TOML configuration, installation of the released plugin outside the website repository, opening/running it in a design, and discovery of the connected file. Keep personal configuration, downloads, and credentials outside the project.
- Explain how to inspect metadata, the current page, and selected nodes; target the returned `fileKey` explicitly. Describe a small reversible edit/read-back check for a later authorized design session, without creating a design as part of this change.
- Document important limitations: active plugin and file permissions, design-editor-only mutations, restricted editing API, local listener exposure, matching server/plugin versions, and connection troubleshooting. Do not promise unlimited Codex usage, offline Figma operation, or full Plugin API support.
- Preserve human review as the boundary before a later implementation specification. Approved durable decisions return to `UI.md` or relevant repository contracts. Figma and the bridge remain replaceable.

## Constraints and out of scope

This is a repository documentation change. Do not install permanent tooling or edit this developer's Codex configuration as part of it. Verify upstream capabilities and provide a reproducible local connection check; do not claim an unperformed live check succeeded.

Do not add the package to website dependencies, scripts, or lockfiles. No Astro/Tailwind/content/deployment/runtime changes, servers for the website, SSR, databases, secrets, CI integration, or repository-managed bridge infrastructure. No hosted MCP configuration, subscription changes, REST API integration, custom bridge development, Figma-to-code generation, Code Connect, token synchronization, or bidirectional component/design-system synchronization. No Figma design creation or modification in this change.

## Observable acceptance criteria

1. The guide documents an optional, repeatable Codex user-configuration and Figma Desktop development-plugin setup, with release sources and a verified version.
2. A developer can follow the connection checklist to discover an open file and inspect its metadata, current page, and selection. Basic edit capabilities and a later reversible check are described without relying on the hosted MCP quota.
3. The verification record accurately separates inspected upstream capabilities, local checks actually performed, and any live Desktop test still to be performed by the developer.
4. The guide explains the material limitations above and does not imply a complete Figma API, network isolation by default, or unlimited AI-service usage.
5. `README.md` and `UI.md` link to the guide; `UI.md` permits optional machine-local tooling without making Desktop or any particular bridge mandatory for the project. Existing design approval and specification rules remain intact.
6. The final diff contains only these documentation changes and lifecycle removal of this specification. Production code, package files, configuration, deployment, and credentials remain untouched.
7. Local documentation links and formatting pass, and `npm run validate` succeeds without a bridge or Figma connection. No new automated tests are needed for this documentation-only change.

## Architectural impact

No production architectural impact. This clarifies an optional developer-tool boundary within the existing UI workflow. Git contracts, Tailwind/CSS, and Astro retain their responsibilities. No new ADR or architecture-contract change is needed; `AGENTS.md` routing already suffices.
