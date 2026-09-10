# Optional local Figma bridge

Use this optional developer-machine setup for AI-assisted visual exploration. Read the [architecture contract](../architecture/ARCHITECTURE.md) and [UI contract](../src/styles/UI.md) first.

```text
Codex → local MCP process → development plugin → open Figma Desktop design
```

This route uses the third-party `@gethopp/figma-mcp-bridge`, independently of Figma's hosted MCP request quota. It does not use the hosted connector or Figma's built-in MCP server. Codex usage limits, Figma account permissions, and normal Figma connectivity still apply; this is not an offline or unlimited AI service.

## Verified scope

On 2026-09-10, upstream review identified **0.0.21** as the current npm/release version. It supports the basic inspection and editing needed here and is the initial preferred local option when the limitations below are acceptable. Reassess the bridge if requirements or upstream behavior change.

The published npm package's manifest, tool registrations, stdio startup, and HTTP/WebSocket code were inspected alongside the upstream README, plugin manifest, and release information. This verifies the advertised interface and communication path; it is **not a completed live Figma Desktop connection test**. Follow the connection check below on each developer's machine.

Sources: [upstream guide and tool list](https://github.com/gethopp/figma-mcp-bridge), [0.0.21 release and plugin download](https://github.com/gethopp/figma-mcp-bridge/releases/tag/v0.0.21), [npm package](https://www.npmjs.com/package/@gethopp/figma-mcp-bridge), and [Codex MCP documentation](https://developers.openai.com/codex/mcp/).

## Machine-local setup

1. Have Codex, Node.js, and npm available on the same machine as Figma Desktop. The verified bridge requires Node.js 20 or newer; the website's existing Node requirement also satisfies it. Ensure Codex can find `npx` on its PATH.
2. Download and extract the built plugin from the release above into a persistent directory **outside this repository**. Keep its manifest and bundled files together. In Figma Desktop, use **Plugins → Development → Import plugin from manifest** and select the released plugin's `manifest.json`. No plugin source build is needed with the release bundle.
3. Register a distinctly named local server in Codex's user configuration:

   ```sh
   codex mcp add figma-local -- npx -y @gethopp/figma-mcp-bridge@0.0.21
   ```

   Alternatively, add this table to the user-level `~/.codex/config.toml`, preserving existing settings:

   ```toml
   [mcp_servers.figma-local]
   command = "npx"
   args = ["-y", "@gethopp/figma-mcp-bridge@0.0.21"]
   ```

   Choose one method. Do not add a project `.codex/config.toml` or website package dependency for this setup. `npx` resolves the package through npm's local cache, downloading it when necessary. The unversioned `npx -y @gethopp/figma-mcp-bridge` follows the current npm version; the example pins the reviewed release. Recheck capabilities and update the plugin and server together when upgrading.

4. Restart the Codex session so it discovers the server. Codex launches the process and speaks MCP over stdio; a separately maintained daemon is unnecessary.
5. Open the intended design in Figma Desktop, use the design editor, and run **Figma MCP Bridge** from the development plugins. Keep it running during the session. The released plugin connects through local WebSocket communication on port **1994**. This route requires Desktop only for developers choosing it.

## Connection check and exploration

Ask Codex to use the **figma-local** tools explicitly so similarly named hosted tools are not selected:

> Use only the local Figma bridge. List connected files, identify the intended design, and report its metadata, current page, and selected nodes. Do not modify the canvas.

The check should call `list_files`, then use the returned `fileKey` with `get_metadata`, `get_document` (or the depth-limited `get_design_context`), and `get_selection`. Confirm that the file name, current page, and selected node IDs match Desktop. Selecting a known node in Desktop and rereading the selection is a useful end-to-end check. Use the discovered key explicitly, especially with multiple files open.

During a later authorized exploration, the bridge can create frames, text, and simple shapes; edit text, geometry, and paints; and set auto-layout. Verify a small reversible change in a designated scratch area before larger edits: create a labeled frame and text, read them back with `get_node`, inspect a screenshot, and remove only those test nodes. `delete_nodes` requires `confirm: true`. This documentation change does not create a Figma design or perform that write check.

Continue through the existing workflow: repository constraints → exploration → human approval → repository change specification → Astro/Tailwind implementation. Preserve accepted requirements in repository text with the reviewed frame reference; update durable contracts when approved decisions change them. A successful tool call is not design approval.

## Limitations and troubleshooting

- **Local access boundary:** in 0.0.21, the server calls `listen(port)` without an explicit loopback host and its HTTP/WebSocket endpoints do not authenticate requests. A plugin URL containing `localhost` does not establish network isolation. Use only where host/network controls restrict access to the developer machine; do not expose or forward port 1994. If this boundary cannot be ensured, do not use this bridge. See the [released listener source](https://github.com/gethopp/figma-mcp-bridge/blob/v0.0.21/server/src/leader.ts).
- **Active connection:** no files in `list_files` means there is no connected design. Check that the plugin is running in the intended Desktop file, Codex started the local server, and port 1994 is available. Do not change only the server port: the plugin connection URL and manifest must match too. Restart the session/plugin after configuration changes.
- **Editing permissions:** file edit rights and the design editor are required. Dev Mode supports inspection, not canvas mutations. An available tool does not grant access to a closed file or override permissions.
- **Limited API:** this is a named-tool interface, not hosted `use_figma` or arbitrary Plugin API execution. Upstream documents no component/instance authoring, variable/style authoring, per-segment text styling, or vector boolean operations. Inspect the actual tool schemas; do not reuse hosted scripts or assume every Figma skill operation is supported. New text defaults to Inter unless a font is supplied, so follow the UI contract deliberately.
- **Session and assets:** keep the plugin open in each file being used. Supply absolute paths for local image inputs because relative paths use the MCP process's working directory. Keep exports and temporary assets outside production folders until a later approved implementation needs them.

To stop using the integration, close its Figma plugin and remove the `figma-local` user-configuration entry, then restart Codex. Replacing it requires no website code changes.

## Repository boundary

Keep user configuration, plugin downloads, caches, and any machine-specific credentials outside the project. No bridge package, plugin source, startup script, or service infrastructure belongs in the website dependencies, build, deployment, or CI. Building and deploying must work with Figma closed and the bridge absent.

`UI.md` and repository contracts own durable rules; Tailwind/CSS owns production styling; Astro owns implementation. Figma remains replaceable exploration/review tooling. This setup adds no code generation, Code Connect, token synchronization, component synchronization, REST integration, or production Figma API use.
