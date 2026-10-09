# After Effects MCP server

An [MCP](https://modelcontextprotocol.io) server that lets Claude (Claude Desktop, Claude Code, or any MCP client) build and edit **Adobe After Effects 2026** projects: create comps, add on-brand text, shapes and solids, animate them with keyframes and expressions, apply effects, import footage, and render.

```
Claude ──MCP/stdio──▶ aftereffects-mcp (Node) ──JSON files──▶ AE-MCP-Bridge panel (inside After Effects)
```

After Effects has no network API, so a small ScriptUI panel runs inside AE. It watches a shared folder for command files, runs each one as a single undo step, and writes the result back.

## Setup (per workstation)

**Requirements:** After Effects 2026 (works back to CC 2018) and Node.js 18+, on the same machine.

1. **Install the server**
   ```bash
   cd aftereffects-mcp
   npm install
   ```
2. **Install the panel.** Copy `ae-panel/AE-MCP-Bridge.jsx` into AE's ScriptUI Panels folder:
   - Windows: `C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\`
   - macOS: `/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels/`
3. **Allow file access.** In AE, enable **Settings → Scripting & Expressions → Allow Scripts to Write Files and Access Network**, then restart AE.
4. **Open the panel.** Choose **Window → AE-MCP-Bridge.jsx** and dock it anywhere. It starts listening at once on `~/Documents/ae-mcp-bridge`.
5. **Register the server with your MCP client.**

   Claude Desktop (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "after-effects": {
         "command": "node",
         "args": ["/absolute/path/to/aftereffects-mcp/src/index.js"],
         "env": { "AE_MCP_BRAND_FILE": "/absolute/path/to/brand.json" }
       }
     }
   }
   ```
   Claude Code:
   ```bash
   claude mcp add after-effects -- node /absolute/path/to/aftereffects-mcp/src/index.js
   ```
6. Ask Claude to **"ping After Effects"** to check the connection.

## Tools

| Area | Tools |
|---|---|
| Inspect | `ping`, `get_project_info`, `list_project_items`, `get_composition`, `inspect_layer` |
| Compositions | `create_composition`, `set_comp_settings`, `precompose`, `add_comp_to_comp` |
| Layers | `add_text_layer`, `add_solid_layer` (also adjustment layers), `add_shape_layer`, `add_null_layer`, `set_layer_properties`, `duplicate_layer`, `delete_layer` |
| Animation | `set_keyframes` (ease / strong ease / linear / hold), `set_property`, `apply_expression`, `apply_effect` |
| Project & render | `import_file`, `save_project`, `open_project`, `add_to_render_queue`, `render` |
| Advanced (off by default) | `run_script`: arbitrary ExtendScript |

Comps can be named by name or id, or left out to use the active comp. Layers can be named by name or 1-based index. Property paths can be short (`"Position"`) or full (`"Effects/Gaussian Blur/Blurriness"`), using display names or match names. Use `inspect_layer` to find effect parameter names.

Every command runs as one AE undo step (`Edit → Undo MCP: <command>`).

## Company brand kit

Edit `config/brand.json`, or point `AE_MCP_BRAND_FILE` at a shared copy, to define brand colours, fonts and comp defaults:

```json
{
  "name": "Your Company",
  "colors": { "primary": "#1E3A8A", "secondary": "#F59E0B", "text": "#FFFFFF" },
  "fonts":  { "heading": "Arial-BoldMT", "body": "ArialMT" },
  "defaults": { "width": 1920, "height": 1080, "frameRate": 30, "duration": 10 }
}
```

With the kit in place:
- Any colour argument accepts a brand name (`"primary"`) as well as `#RRGGBB` or `[r,g,b]`.
- `font` accepts a role (`"heading"`). Text uses the `body` font and `text` colour unless told otherwise.
- `create_composition` uses the brand defaults for any setting you leave out.
- Claude can read the kit as the `brand://kit` MCP resource.

Fonts must be **PostScript names** (e.g. `Montserrat-Bold`). In AE, run `app.fonts` or check the font's info to find them.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `AE_MCP_BRIDGE_DIR` | `~/Documents/ae-mcp-bridge` | Shared folder. Must match the folder set in the panel. |
| `AE_MCP_BRAND_FILE` | `config/brand.json` | Brand kit. |
| `AE_MCP_TIMEOUT_MS` | `30000` | How long to wait for AE per command. |
| `AE_MCP_RENDER_TIMEOUT_MS` | `3600000` | Timeout for `render`. |
| `AE_MCP_AUDIT_LOG` | *(off)* | Path to a JSONL file. Every changing command is appended with a timestamp, its arguments and the outcome. |
| `AE_MCP_ALLOW_RAW_SCRIPT` | *(off)* | `1` exposes `run_script`. |

### Security notes for IT

- **No network listener.** The server talks to the client over stdio and to AE through a local folder.
- **Commands are read as data.** The panel parses command files with its own JSON parser and never `eval`s them. Only the named commands listed above can run.
- **Arbitrary ExtendScript needs two opt-ins.** `run_script` stays disabled unless `AE_MCP_ALLOW_RAW_SCRIPT=1` is set on the server **and** "Allow raw ExtendScript" is ticked in the panel. Leave both off unless your team needs it.
- **Protect the bridge folder.** Anyone who can write to it can drive AE. Keep it inside the user's profile; the default location already is.
- **Audit trail.** Turn on `AE_MCP_AUDIT_LOG` to keep a record of what Claude changed.

## Troubleshooting

- **"No response from After Effects within 30s"**: AE is closed, the panel isn't open, the panel shows **Stopped**, or the panel's folder doesn't match `AE_MCP_BRIDGE_DIR`.
- **Long renders**: `render` blocks AE until the queue finishes, and the panel can't take other commands until then.
- **Modal dialogs**: an open AE dialog pauses scripting until it closes, so commands will time out.

## Development

```bash
npm test
```

The tests run the real `AE-MCP-Bridge.jsx` inside a Node VM against a small fake of the AE scripting DOM (`test/fake-ae.js`), with JSON disabled to match ExtendScript. They drive it through a real MCP client and cover the full server → folder → panel path. The fake only models what the tests use, so check new commands in a real copy of After Effects too.
