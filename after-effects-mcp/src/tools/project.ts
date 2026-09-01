import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { evalInAfterEffects, pingBridge, AeScriptError, AeBridgeError } from "../aeBridge.js";
import { buildScript, esLiteral } from "../extendscript.js";
import type { ProjectInfo } from "../types.js";

function errorContent(error: unknown) {
  const text =
    error instanceof AeBridgeError || error instanceof AeScriptError
      ? `Error: ${error.message}`
      : `Error: Unexpected failure talking to After Effects: ${error instanceof Error ? error.message : String(error)}`;
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

export function registerProjectTools(server: McpServer): void {
  server.registerTool(
    "ae_ping",
    {
      title: "Ping After Effects Bridge",
      description: `Checks whether the After Effects bridge panel is reachable and reports the running AE version.

Use this FIRST before any other ae_* tool to confirm the connection is set up: After Effects must be running with the "MCP Bridge" CEP panel open (Window > Extensions > MCP Bridge). If this fails, every other tool will also fail with the same connectivity error.

Returns: { connected: boolean, appName?: string, appVersion?: string, error?: string }`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async () => {
      try {
        const { appName, appVersion } = await pingBridge();
        const output = { connected: true, appName, appVersion };
        return {
          content: [{ type: "text", text: `Connected to ${appName} ${appVersion} via the MCP bridge panel.` }],
          structuredContent: output
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Not connected: ${message}` }],
          structuredContent: { connected: false, error: message }
        };
      }
    }
  );

  server.registerTool(
    "ae_get_project_info",
    {
      title: "Get After Effects Project Info",
      description: `Returns metadata about the project currently open in After Effects: its file path, bit depth, item count, whether it has unsaved changes, and the name of the composition open in the active viewer (if any).

Returns: { path: string|null, file: string|null, bitsPerChannel: 8|16|32, numItems: number, activeCompName: string|null, dirty: boolean }`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async () => {
      try {
        const data = await evalInAfterEffects<ProjectInfo>(
          buildScript(`
    var proj = app.project;
    var activeComp = null;
    if (proj.activeItem && proj.activeItem instanceof CompItem) activeComp = proj.activeItem.name;
    return $$ok({
      path: proj.file ? proj.file.fsName : null,
      file: proj.file ? proj.file.name : null,
      bitsPerChannel: proj.bitsPerChannel,
      numItems: proj.numItems,
      activeCompName: activeComp,
      dirty: proj.dirty
    });`)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const OpenProjectInput = z
    .object({
      path: z.string().min(1).describe("Absolute filesystem path to an .aep project file to open.")
    })
    .strict();

  server.registerTool(
    "ae_open_project",
    {
      title: "Open After Effects Project",
      description: `Opens an .aep project file, replacing whatever project is currently open in After Effects. Any unsaved changes in the current project are discarded without prompting.

Args:
  - path (string): Absolute path to the .aep file to open

Returns: { path: string, numItems: number }

Error Handling:
  - Returns "Error: ... file not found" if the path doesn't exist or isn't a valid .aep file`,
      inputSchema: OpenProjectInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async ({ path }) => {
      try {
        const data = await evalInAfterEffects<{ path: string; numItems: number }>(
          buildScript(`
    var f = new File(${esLiteral(path)});
    if (!f.exists) throw new Error("Project file not found: " + ${esLiteral(path)});
    app.open(f);
    return $$ok({ path: app.project.file ? app.project.file.fsName : null, numItems: app.project.numItems });`)
        );
        return { content: [{ type: "text", text: `Opened project: ${data.path}` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const SaveProjectInput = z
    .object({
      path: z
        .string()
        .min(1)
        .optional()
        .describe("Absolute path to save the project as. Omit to save the current project in place.")
    })
    .strict();

  server.registerTool(
    "ae_save_project",
    {
      title: "Save After Effects Project",
      description: `Saves the current After Effects project, either in place or to a new path ("Save As").

Args:
  - path (string, optional): Absolute path (must end in .aep) to save as. Omit to save the currently open project in place; the project must already have a file path in that case.

Returns: { path: string }

Error Handling:
  - Returns "Error: ... project has never been saved" if no path is given and the project has no file yet`,
      inputSchema: SaveProjectInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ path }) => {
      try {
        const data = await evalInAfterEffects<{ path: string }>(
          buildScript(
            path
              ? `
    app.project.save(new File(${esLiteral(path)}));
    return $$ok({ path: app.project.file.fsName });`
              : `
    if (!app.project.file) throw new Error("This project has never been saved; pass 'path' to Save As.");
    app.project.save();
    return $$ok({ path: app.project.file.fsName });`
          )
        );
        return { content: [{ type: "text", text: `Saved project to: ${data.path}` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );
}
