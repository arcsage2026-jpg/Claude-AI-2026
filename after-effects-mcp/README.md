# After Effects MCP Server

An MCP server that lets Claude (or any MCP client) drive Adobe After Effects
directly: create and configure compositions, add and edit text/solid/footage
layers, and manage the render queue. It's built for office motion-graphics
workflows — batch-rendering a title-card or lower-third template with new
text each time, assembling a comp from footage, queuing a set of renders for
a report or internal video — without hand-driving the AE UI for each one.

## How it works

After Effects has no built-in remote/HTTP API, so this follows the standard
CEP (Common Extensibility Platform) pattern:

```
Claude / MCP client
   │  stdio (MCP protocol)
   ▼
after-effects-mcp-server (this Node package, src/)
   │  HTTP, localhost only
   ▼
"MCP Bridge" CEP panel running inside After Effects (cep-extension/)
   │  CSInterface.evalScript(...)
   ▼
After Effects' ExtendScript engine (the AE scripting DOM)
```

Two things have to be running at once:
1. **After Effects**, with the **MCP Bridge** panel open (`Window > Extensions
   > MCP Bridge`). The panel hosts a tiny HTTP server on `127.0.0.1:39843`
   using CEP's Node integration, and forwards whatever it receives to AE's
   ExtendScript engine.
2. **This MCP server** (`after-effects-mcp-server`), which your MCP client
   (Claude Code, Claude Desktop, etc.) launches as a subprocess over stdio,
   and which talks to the panel above over that local HTTP connection.

Every ExtendScript snippet this server sends wraps itself in its own
try/catch and always resolves to a JSON envelope (`{ok:true,data}` or
`{ok:false,error}`), so failures come back as readable tool errors instead of
AE's generic `"EvalScript error."` string.

## One-time setup

1. **Install the CEP panel** into After Effects and enable CEP's debug mode
   (required to load an unsigned, unpackaged extension):
   - macOS: `./scripts/install-mac.sh`
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1`

   This symlinks (or copies, on Windows if a junction isn't permitted)
   `cep-extension/` into AE's extensions folder and sets the
   `PlayerDebugMode` preference for CSXS versions 6–12, covering AE CC 2018
   through current releases.

2. **Restart After Effects**, then open `Window > Extensions > MCP Bridge`.
   The panel should show "Running on port 39843" — leave it open for the
   whole session; closing it stops the bridge.

3. **Build this server**:
   ```bash
   cd after-effects-mcp
   npm install
   npm run build
   ```

   `npm test` runs a smoke test against a stubbed-out After Effects DOM
   (`test/mock-ae-smoke-test.mjs`) that exercises every tool end-to-end. It's
   the regression check for this project when there's no licensed AE install
   to test against — run it after changing anything under `src/`.

4. **Point your MCP client at it.** For a stdio-based client, run
   `node <absolute-path>/after-effects-mcp/dist/index.js`. Example
   `mcpServers` config entry:
   ```json
   {
     "mcpServers": {
       "after-effects": {
         "command": "node",
         "args": ["/absolute/path/to/after-effects-mcp/dist/index.js"]
       }
     }
   }
   ```

Call `ae_ping` first in any new session — it confirms the bridge panel is
reachable and reports the AE version, and every other tool will fail with
the same connectivity error if it can't.

### Changing the port

The bridge defaults to port `39843`. To use a different one, edit
`DEFAULT_PORT` in `cep-extension/js/bridge-server.js` and set the matching
`AE_BRIDGE_PORT` environment variable when launching this server (also
`AE_BRIDGE_HOST` if the panel isn't on `127.0.0.1`, which is only relevant if
you've deliberately changed the panel's bind address).

## Tools

| Tool | What it does |
|---|---|
| `ae_ping` | Checks the bridge connection and reports the AE version |
| `ae_get_project_info` | Current project's path, bit depth, item count, dirty flag |
| `ae_open_project` | Opens an `.aep` file, discarding unsaved changes |
| `ae_save_project` | Saves the project, in place or to a new path |
| `ae_list_compositions` | Lists every composition in the project |
| `ae_create_composition` | Creates a new composition |
| `ae_get_composition_info` | A composition's settings plus its layer list |
| `ae_set_composition_settings` | Renames/resizes/retimes an existing composition |
| `ae_list_layers` | Lists a composition's layers |
| `ae_add_text_layer` | Adds a text layer (the main tool for title cards/lower thirds) |
| `ae_add_solid_layer` | Adds a solid-color layer |
| `ae_import_footage` | Imports a media file into the project |
| `ae_add_footage_layer` | Places an imported item (or another comp) into a composition |
| `ae_set_layer_text` | Updates a text layer's content in place — re-run one template with new data |
| `ae_set_layer_transform` | Sets position/scale/rotation/opacity on a layer |
| `ae_remove_layer` | Deletes a layer |
| `ae_add_to_render_queue` | Queues a composition for render with an output path |
| `ae_get_render_queue_status` | Lists render queue items and their status |
| `ae_start_render` | Starts rendering everything queued |
| `ae_clear_render_queue` | Removes render queue items |
| `ae_run_extendscript` | Escape hatch: runs arbitrary ExtendScript for anything not covered above |

Full argument/return documentation is in each tool's description (visible to
the MCP client) and in `src/tools/*.ts`.

### A note on rendering

After Effects is single-threaded for rendering: the whole application is
unresponsive for the duration of a render, regardless of how `ae_start_render`
is called. Its `wait` option only controls whether the *tool call* blocks
until the render finishes (`wait: true`, the default — use `timeoutSeconds`
to size the wait) or returns immediately while the render runs
(`wait: false`) — either way, AE itself won't respond to a new
`ae_get_render_queue_status` call until it comes back from rendering.

## Project layout

```
after-effects-mcp/
├── src/                    # The MCP server (Node/TypeScript, stdio transport)
│   ├── index.ts            # Entry point: registers all tools, connects stdio
│   ├── aeBridge.ts         # HTTP client to the CEP panel's bridge server
│   ├── extendscript.ts     # ExtendScript snippet builder + shared DOM helpers
│   ├── types.ts
│   ├── constants.ts
│   └── tools/              # One file per tool domain
├── cep-extension/          # The CEP panel that runs inside After Effects
│   ├── CSXS/manifest.xml
│   ├── index.html          # Panel UI (status indicator)
│   └── js/
│       ├── CSInterface.js  # Adobe's official CEP JS client (redistributed under Adobe's CEP license)
│       ├── bridge-server.js # Node http server + evalScript bridge (mixed-context CEP)
│       └── hostscript.jsx  # Required by CEP's manifest; intentionally empty
└── scripts/                # install-mac.sh / install-windows.ps1
```

## Limitations / not yet covered

- No masks, effects/property control graphs, expressions, markers, or shape
  layer path data as first-class tools — use `ae_run_extendscript` for these
  against the [AE scripting DOM](https://ae-scripting.docsforadobe.dev/).
- `ae_run_extendscript` is a genuine escape hatch: it runs whatever
  ExtendScript it's given, so treat it the way you'd treat shell access —
  fine for a trusted local workflow, not something to expose to untrusted
  input.
- This has been built and type-checked (`npm run build`) but not exercised
  against a real, licensed After Effects install in this environment — there
  is no AE available here to test against. Validate the one-time setup steps
  and a few tool calls against your own AE install before relying on it.
