# AE-MCP-Bridge 2026–2027 (ScriptUI / JSX)

This panel is a version-neutral fork of the repository's original `AE-MCP-Bridge.jsx`, retaining its **file-based JSON command protocol** and the existing Node.js MCP tool names. It is designed for After Effects **2026 and 2027**, although real-machine validation has **not** yet been completed for either release of this fork.

## Download

Use `ae-panel/AE-MCP-Bridge-2026-2027.jsx` from this branch. Do not change the extension to `.jsxbin` by renaming the file.

## Installation

1. Close After Effects.
2. Put `AE-MCP-Bridge-2026-2027.jsx` into the correct version's Scripts/ScriptUI Panels directory:
   - AE 2026 Windows: `C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\`
   - AE 2027 Windows: `C:\Program Files\Adobe\Adobe After Effects 2027\Support Files\Scripts\ScriptUI Panels\`
   - macOS: the corresponding `/Applications/Adobe After Effects <year>/Scripts/ScriptUI Panels/` directory.
3. In After Effects, enable **Settings → Scripting & Expressions → Allow Scripts to Write Files and Access Network**.
4. Restart AE, then open **Window → AE-MCP-Bridge-2026-2027.jsx**.
5. Confirm **Listening** appears in the panel.
6. Keep only **one** AE MCP bridge panel running against the same folder; stop the original panel if it is open.

## Node MCP server configuration

From the repository's `aftereffects-mcp` directory:

```powershell
npm install
npm test
```

Register the MCP server in Claude Desktop (replace the absolute path):

```json
{
  "mcpServers": {
    "after-effects": {
      "command": "node",
      "args": ["C:/YOUR/PATH/Claude-AI-2026/aftereffects-mcp/src/index.js"],
      "env": {
        "AE_MCP_BRIDGE_DIR": "C:/Users/YOUR_USER/Documents/ae-mcp-bridge"
      }
    }
  }
}
```

The folder configured in the ScriptUI panel **must exactly match** `AE_MCP_BRIDGE_DIR`. The default is the user's Documents folder followed by `ae-mcp-bridge`.

Restart Claude Desktop after changing its MCP configuration. Start AE and open the panel before testing. Ask Claude to use the `ping` tool.

## Protocol compatibility

This panel supports the original Node MCP server's `<id>.cmd.json` → `<id>.res.json` protocol, with temporary file writes and atomic rename on both sides.

The full command set is inherited from the original panel, including `ping`, project inspection, layer creation, keyframes, expressions, effects, import, saves, and render queue handling. Raw `run_script` remains disabled until explicitly enabled in both the MCP server and panel.

The 2026–2027 fork changes:
- Panel version identifier and standalone ScriptUI display title
- Distinct scheduled polling callback to avoid global callback naming collisions
- Isolated saved UI settings section
- Additional `ping` diagnostic fields: OS/platform and protocol identifier

## Security

- The bridge uses a local folder; **any local process with write access to that folder can issue commands to the panel**. Protect folder permissions.
- Never enable raw ExtendScript without a concrete need and an isolated, trusted development environment.
- The panel can mutate an open AE project. Test on a duplicate project and save snapshots.
- Do not run two separate bridge panels against one directory.

## Troubleshooting

- **Timeout**: confirm AE is running, the panel is Listening, the queue directory matches, and no modal dialog is open.
- **No permission to write**: enable file/network access in AE scripting preferences.
- **No tool execution**: restart Claude Desktop after MCP configuration changes; check `npm install`.
- **Two listeners**: stop the previous AE-MCP-Bridge panel; both can consume the same queued commands.
- **2027 differences**: any Adobe API change in that version must be validated in a real AE session. This file is not represented as certified for AE 2027.

## Runtime test checklist

1. `ping` reports the AE version.
2. `get_project_info` and `get_composition` return expected data.
3. On a disposable project, create a comp and a text layer.
4. Set opacity keyframes and apply a simple expression.
5. Undo the changes in AE; verify no collisions/errors.
6. Validate render and saving only after making backups.
