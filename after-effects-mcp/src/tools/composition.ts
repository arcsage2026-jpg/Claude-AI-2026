import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { evalInAfterEffects, AeScriptError, AeBridgeError } from "../aeBridge.js";
import { buildScript, esLiteral } from "../extendscript.js";
import type { CompositionSummary, LayerSummary } from "../types.js";

function errorContent(error: unknown) {
  const text =
    error instanceof AeBridgeError || error instanceof AeScriptError
      ? `Error: ${error.message}`
      : `Error: Unexpected failure talking to After Effects: ${error instanceof Error ? error.message : String(error)}`;
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

/** Shared description text for the "which composition" parameter every comp/layer tool takes. */
const COMP_REF_DESC =
  "The composition to target: either its exact name (e.g. 'Main Sequence') or its numeric project item ID (as returned by ae_list_compositions / ae_create_composition). Name lookup requires an exact, case-sensitive match.";

export function registerCompositionTools(server: McpServer): void {
  server.registerTool(
    "ae_list_compositions",
    {
      title: "List After Effects Compositions",
      description: `Lists every composition in the currently open After Effects project.

Returns: { total: number, compositions: [{ id: number, name: string, width: number, height: number, duration: number (seconds), frameRate: number, numLayers: number }] }

Use the returned "id" or "name" as the "comp" argument to other ae_* composition/layer tools.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async () => {
      try {
        const data = await evalInAfterEffects<{ total: number; compositions: CompositionSummary[] }>(
          buildScript(`
    var comps = [];
    for (var i = 1; i <= app.project.numItems; i++) {
      var it = app.project.item(i);
      if (it instanceof CompItem) comps.push($$compSummary(it));
    }
    return $$ok({ total: comps.length, compositions: comps });`)
        );
        if (data.total === 0) {
          return { content: [{ type: "text", text: "No compositions found in the current project." }], structuredContent: data };
        }
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const CreateCompositionInput = z
    .object({
      name: z.string().min(1).max(200).describe("Name for the new composition."),
      width: z.number().int().min(4).max(30000).default(1920).describe("Width in pixels."),
      height: z.number().int().min(4).max(30000).default(1080).describe("Height in pixels."),
      duration: z.number().positive().max(36000).default(10).describe("Duration in seconds."),
      frameRate: z.number().positive().max(120).default(30).describe("Frame rate (frames per second)."),
      pixelAspect: z.number().positive().max(10).default(1).describe("Pixel aspect ratio."),
      backgroundColor: z
        .tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)])
        .default([0, 0, 0])
        .describe("Background color as [r, g, b] with each channel in 0..1. Default is black.")
    })
    .strict();

  server.registerTool(
    "ae_create_composition",
    {
      title: "Create After Effects Composition",
      description: `Creates a new composition in the current project.

Args:
  - name (string): Composition name
  - width, height (number): Frame size in pixels (default 1920x1080)
  - duration (number): Length in seconds (default 10)
  - frameRate (number): Frames per second (default 30)
  - pixelAspect (number): Pixel aspect ratio (default 1, i.e. square pixels)
  - backgroundColor ([r,g,b]): Each channel 0..1 (default black)

Returns: { id: number, name: string, width: number, height: number, duration: number, frameRate: number, numLayers: number }

Use the returned "id" to reference this composition in later ae_* calls.`,
      inputSchema: CreateCompositionInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ name, width, height, duration, frameRate, pixelAspect, backgroundColor }) => {
      try {
        const data = await evalInAfterEffects<CompositionSummary>(
          buildScript(`
    var comp = app.project.items.addComp(${esLiteral(name)}, ${width}, ${height}, ${pixelAspect}, ${duration}, ${frameRate});
    comp.bgColor = ${esLiteral(backgroundColor)};
    return $$ok($$compSummary(comp));`)
        );
        return {
          content: [{ type: "text", text: `Created composition "${data.name}" (id ${data.id}), ${data.width}x${data.height} @ ${data.frameRate}fps, ${data.duration}s.` }],
          structuredContent: data
        };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const CompRefInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC)
    })
    .strict();

  server.registerTool(
    "ae_get_composition_info",
    {
      title: "Get After Effects Composition Info",
      description: `Returns a composition's settings plus a summary of every layer it contains.

Args:
  - comp (string): ${COMP_REF_DESC}

Returns: { composition: { id, name, width, height, duration, frameRate, numLayers }, layers: [{ index, name, matchName, layerType, enabled, startTime, inPoint, outPoint }] }

Layers are listed top-to-bottom (index 1 is the topmost layer, matching AE's own layer panel).`,
      inputSchema: CompRefInput.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ comp }) => {
      try {
        const data = await evalInAfterEffects<{ composition: CompositionSummary; layers: LayerSummary[] }>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var layers = [];
    for (var i = 1; i <= c.numLayers; i++) layers.push($$layerSummary(c.layer(i), i));
    return $$ok({ composition: $$compSummary(c), layers: layers });`)
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const SetCompositionSettingsInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      name: z.string().min(1).max(200).optional().describe("New name for the composition."),
      width: z.number().int().min(4).max(30000).optional().describe("New width in pixels."),
      height: z.number().int().min(4).max(30000).optional().describe("New height in pixels."),
      duration: z.number().positive().max(36000).optional().describe("New duration in seconds."),
      frameRate: z.number().positive().max(120).optional().describe("New frame rate.")
    })
    .strict();

  server.registerTool(
    "ae_set_composition_settings",
    {
      title: "Update After Effects Composition Settings",
      description: `Updates one or more settings on an existing composition. Only fields you provide are changed.

Args:
  - comp (string): ${COMP_REF_DESC}
  - name, width, height, duration, frameRate: any subset of these to change

Returns: the composition's updated settings, same shape as ae_get_composition_info's "composition" field.

Error Handling:
  - Returns "Error: no fields provided to update" if called with only "comp"`,
      inputSchema: SetCompositionSettingsInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ comp, name, width, height, duration, frameRate }) => {
      if (name === undefined && width === undefined && height === undefined && duration === undefined && frameRate === undefined) {
        return errorContent(new Error("no fields provided to update"));
      }
      const assignments: string[] = [];
      if (name !== undefined) assignments.push(`c.name = ${esLiteral(name)};`);
      if (width !== undefined) assignments.push(`c.width = ${width};`);
      if (height !== undefined) assignments.push(`c.height = ${height};`);
      if (duration !== undefined) assignments.push(`c.duration = ${duration};`);
      if (frameRate !== undefined) assignments.push(`c.frameRate = ${frameRate};`);
      try {
        const data = await evalInAfterEffects<CompositionSummary>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    ${assignments.join("\n    ")}
    return $$ok($$compSummary(c));`)
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );
}

export { COMP_REF_DESC };
