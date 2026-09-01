import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { evalInAfterEffects, AeScriptError, AeBridgeError } from "../aeBridge.js";
import { buildScript, esLiteral } from "../extendscript.js";
import type { LayerSummary } from "../types.js";
import { COMP_REF_DESC } from "./composition.js";

function errorContent(error: unknown) {
  const text =
    error instanceof AeBridgeError || error instanceof AeScriptError
      ? `Error: ${error.message}`
      : `Error: Unexpected failure talking to After Effects: ${error instanceof Error ? error.message : String(error)}`;
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

const LAYER_REF_DESC =
  "The layer to target within that composition: either its exact name or its 1-based layer index (top layer is 1), as returned by ae_get_composition_info / ae_list_layers.";

const RGB = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]);

export function registerLayerTools(server: McpServer): void {
  const CompRefInput = z.object({ comp: z.string().min(1).describe(COMP_REF_DESC) }).strict();

  server.registerTool(
    "ae_list_layers",
    {
      title: "List Layers in an After Effects Composition",
      description: `Lists the layers in a composition, top-to-bottom (index 1 is topmost, matching AE's layer panel).

Args:
  - comp (string): ${COMP_REF_DESC}

Returns: { total: number, layers: [{ index, name, matchName, layerType, enabled, startTime, inPoint, outPoint }] }`,
      inputSchema: CompRefInput.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ comp }) => {
      try {
        const data = await evalInAfterEffects<{ total: number; layers: LayerSummary[] }>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var layers = [];
    for (var i = 1; i <= c.numLayers; i++) layers.push($$layerSummary(c.layer(i), i));
    return $$ok({ total: layers.length, layers: layers });`)
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const AddTextLayerInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      text: z.string().max(5000).describe("The text content for the layer."),
      name: z.string().max(200).optional().describe("Layer name. Defaults to the text content, truncated, like AE does."),
      position: z.tuple([z.number(), z.number()]).optional().describe("[x, y] position in pixels. Defaults to the composition's center."),
      fontSize: z.number().positive().max(2000).default(72).describe("Font size in pixels."),
      fillColor: RGB.default([1, 1, 1]).describe("Text color as [r, g, b], each channel 0..1. Default white."),
      fontFamily: z.string().max(200).optional().describe("Font PostScript/family name (e.g. 'Arial-BoldMT'). Omit to use AE's default font."),
      startTime: z.number().min(0).default(0).describe("Layer start time in seconds within the composition."),
      duration: z.number().positive().optional().describe("Layer duration in seconds. Defaults to the remainder of the composition from startTime.")
    })
    .strict();

  server.registerTool(
    "ae_add_text_layer",
    {
      title: "Add Text Layer to After Effects Composition",
      description: `Adds a new text layer to a composition — the primary building block for data-driven title cards, lower thirds, and templated office/report videos.

Args:
  - comp (string): ${COMP_REF_DESC}
  - text (string): Text content
  - name (string, optional): Layer name (defaults to AE's own auto-name from the text)
  - position ([x,y], optional): Pixel position, default is composition center
  - fontSize (number): Default 72
  - fillColor ([r,g,b], optional): Default white
  - fontFamily (string, optional): PostScript name; omitted means AE's default font
  - startTime (number): Seconds into the comp where the layer starts, default 0
  - duration (number, optional): Layer length in seconds; default is comp end minus startTime

Returns: layer summary — { index, name, matchName, layerType: "text", enabled, startTime, inPoint, outPoint }

Use ae_set_layer_text later to update the text content in place (e.g. re-rendering the same template with new data), and ae_set_layer_transform to animate/reposition it.`,
      inputSchema: AddTextLayerInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ comp, text, name, position, fontSize, fillColor, fontFamily, startTime, duration }) => {
      try {
        const data = await evalInAfterEffects<LayerSummary>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var layer = c.layers.addText(${esLiteral(text)});
    var textProp = layer.property("Source Text");
    var doc = textProp.value;
    doc.fontSize = ${fontSize};
    doc.fillColor = ${esLiteral(fillColor)};
    ${fontFamily !== undefined ? `doc.font = ${esLiteral(fontFamily)};` : ""}
    textProp.setValue(doc);
    ${name !== undefined ? `layer.name = ${esLiteral(name)};` : ""}
    ${position !== undefined ? `layer.transform.position.setValue(${esLiteral(position)});` : `layer.transform.position.setValue([c.width / 2, c.height / 2]);`}
    layer.startTime = ${startTime};
    ${duration !== undefined ? `layer.outPoint = layer.startTime + ${duration};` : ""}
    return $$ok($$layerSummary(layer, layer.index));`)
        );
        return { content: [{ type: "text", text: `Added text layer "${data.name}" at index ${data.index}.` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const AddSolidLayerInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      name: z.string().min(1).max(200).default("Solid").describe("Layer/footage-item name."),
      color: RGB.default([0, 0, 0]).describe("Solid color as [r, g, b], each channel 0..1."),
      width: z.number().int().positive().optional().describe("Solid width in pixels. Defaults to the composition width."),
      height: z.number().int().positive().optional().describe("Solid height in pixels. Defaults to the composition height."),
      startTime: z.number().min(0).default(0).describe("Layer start time in seconds within the composition."),
      duration: z.number().positive().optional().describe("Layer duration in seconds. Defaults to the remainder of the composition from startTime.")
    })
    .strict();

  server.registerTool(
    "ae_add_solid_layer",
    {
      title: "Add Solid Layer to After Effects Composition",
      description: `Adds a solid-color layer to a composition — useful as a background panel, color block, or matte for office title cards and lower thirds.

Args:
  - comp (string): ${COMP_REF_DESC}
  - name (string): Default "Solid"
  - color ([r,g,b]): Default black
  - width, height (number, optional): Default to the composition's size
  - startTime (number): Default 0
  - duration (number, optional): Default is comp end minus startTime

Returns: layer summary — { index, name, matchName, layerType: "solid", enabled, startTime, inPoint, outPoint }`,
      inputSchema: AddSolidLayerInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ comp, name, color, width, height, startTime, duration }) => {
      try {
        const data = await evalInAfterEffects<LayerSummary>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var w = ${width !== undefined ? width : "c.width"};
    var h = ${height !== undefined ? height : "c.height"};
    var layer = c.layers.addSolid(${esLiteral(color)}, ${esLiteral(name)}, w, h, c.pixelAspect, c.duration);
    layer.startTime = ${startTime};
    ${duration !== undefined ? `layer.outPoint = layer.startTime + ${duration};` : ""}
    return $$ok($$layerSummary(layer, layer.index));`)
        );
        return { content: [{ type: "text", text: `Added solid layer "${data.name}" at index ${data.index}.` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const ImportFootageInput = z
    .object({
      path: z.string().min(1).describe("Absolute filesystem path to an image, video, or audio file to import.")
    })
    .strict();

  server.registerTool(
    "ae_import_footage",
    {
      title: "Import Footage into After Effects Project",
      description: `Imports a media file (image, video, or audio) into the project's item panel, without placing it into any composition yet. Use ae_add_footage_layer afterward to place it into a comp.

Args:
  - path (string): Absolute path to the file to import

Returns: { id: number, name: string }

Error Handling:
  - Returns "Error: ... file not found" if the path doesn't exist
  - Returns "Error: ... could not be imported" if AE doesn't recognize the file format`,
      inputSchema: ImportFootageInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ path }) => {
      try {
        const data = await evalInAfterEffects<{ id: number; name: string }>(
          buildScript(`
    var f = new File(${esLiteral(path)});
    if (!f.exists) throw new Error("File not found: " + ${esLiteral(path)});
    var item;
    try {
      item = app.project.importFile(new ImportOptions(f));
    } catch (e) {
      throw new Error("File could not be imported (unsupported format or codec?): " + e.toString());
    }
    return $$ok({ id: item.id, name: item.name });`)
        );
        return { content: [{ type: "text", text: `Imported "${data.name}" (item id ${data.id}).` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const AddFootageLayerInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      footage: z.string().min(1).describe("The project item to place: either its exact name or numeric item ID, as returned by ae_import_footage."),
      startTime: z.number().min(0).default(0).describe("Layer start time in seconds within the composition.")
    })
    .strict();

  server.registerTool(
    "ae_add_footage_layer",
    {
      title: "Add Footage or Composition Layer",
      description: `Places an already-imported footage item (or another composition, for nesting) into a composition as a new layer.

Args:
  - comp (string): ${COMP_REF_DESC}
  - footage (string): Name or item ID of the footage/composition to place (from ae_import_footage or ae_list_compositions)
  - startTime (number): Default 0

Returns: layer summary — { index, name, matchName, layerType, enabled, startTime, inPoint, outPoint }`,
      inputSchema: AddFootageLayerInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ comp, footage, startTime }) => {
      try {
        const data = await evalInAfterEffects<LayerSummary>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var item = $$requireItem(${esLiteral(footage)});
    var layer = c.layers.add(item);
    layer.startTime = ${startTime};
    return $$ok($$layerSummary(layer, layer.index));`)
        );
        return { content: [{ type: "text", text: `Added layer "${data.name}" at index ${data.index}.` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const SetLayerTextInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      layer: z.string().min(1).describe(LAYER_REF_DESC),
      text: z.string().max(5000).describe("New text content for the layer's Source Text property.")
    })
    .strict();

  server.registerTool(
    "ae_set_layer_text",
    {
      title: "Update After Effects Text Layer Content",
      description: `Updates the text content of an existing text layer in place, preserving its font/size/color/position. This is the key tool for re-using one AE template composition with different data (e.g. rendering the same title-card comp once per office report with a different heading each time).

Args:
  - comp (string): ${COMP_REF_DESC}
  - layer (string): ${LAYER_REF_DESC}
  - text (string): New text content

Returns: layer summary — { index, name, matchName, layerType: "text", enabled, startTime, inPoint, outPoint }

Error Handling:
  - Returns "Error: ... is not a text layer" if the targeted layer has no Source Text property`,
      inputSchema: SetLayerTextInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ comp, layer, text }) => {
      try {
        const data = await evalInAfterEffects<LayerSummary>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var l = $$requireLayer(c, ${esLiteral(layer)});
    if (!(l instanceof TextLayer)) throw new Error("Layer '" + l.name + "' is not a text layer");
    var textProp = l.property("Source Text");
    var doc = textProp.value;
    doc.text = ${esLiteral(text)};
    textProp.setValue(doc);
    return $$ok($$layerSummary(l, l.index));`)
        );
        return { content: [{ type: "text", text: `Updated text on layer "${data.name}".` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const SetLayerTransformInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      layer: z.string().min(1).describe(LAYER_REF_DESC),
      position: z.tuple([z.number(), z.number()]).optional().describe("[x, y] position in pixels."),
      scale: z.tuple([z.number(), z.number()]).optional().describe("[x, y] scale as percentages (100 = original size)."),
      rotation: z.number().optional().describe("Rotation in degrees."),
      opacity: z.number().min(0).max(100).optional().describe("Opacity percentage, 0..100.")
    })
    .strict();

  server.registerTool(
    "ae_set_layer_transform",
    {
      title: "Set After Effects Layer Transform",
      description: `Sets static (non-keyframed) transform values on a layer. Only the fields you provide are changed; this overwrites the current value of that property at the layer's default/current time — it does not add a keyframe.

Args:
  - comp (string): ${COMP_REF_DESC}
  - layer (string): ${LAYER_REF_DESC}
  - position ([x,y], optional): Pixel position
  - scale ([x,y], optional): Percent scale, 100 = original size
  - rotation (number, optional): Degrees
  - opacity (number, optional): 0..100

Returns: layer summary — { index, name, matchName, layerType, enabled, startTime, inPoint, outPoint }

Error Handling:
  - Returns "Error: no fields provided to update" if called with only "comp" and "layer"`,
      inputSchema: SetLayerTransformInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ comp, layer, position, scale, rotation, opacity }) => {
      if (position === undefined && scale === undefined && rotation === undefined && opacity === undefined) {
        return errorContent(new Error("no fields provided to update"));
      }
      const assignments: string[] = [];
      if (position !== undefined) assignments.push(`l.transform.position.setValue(${esLiteral(position)});`);
      if (scale !== undefined) assignments.push(`l.transform.scale.setValue(${esLiteral(scale)});`);
      if (rotation !== undefined) assignments.push(`l.transform.rotation.setValue(${rotation});`);
      if (opacity !== undefined) assignments.push(`l.transform.opacity.setValue(${opacity});`);
      try {
        const data = await evalInAfterEffects<LayerSummary>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var l = $$requireLayer(c, ${esLiteral(layer)});
    ${assignments.join("\n    ")}
    return $$ok($$layerSummary(l, l.index));`)
        );
        return { content: [{ type: "text", text: `Updated transform on layer "${data.name}".` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const RemoveLayerInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      layer: z.string().min(1).describe(LAYER_REF_DESC)
    })
    .strict();

  server.registerTool(
    "ae_remove_layer",
    {
      title: "Remove Layer from After Effects Composition",
      description: `Deletes a layer from a composition. This cannot be undone through this tool (though AE's own Edit > Undo still works if the user is at the keyboard).

Args:
  - comp (string): ${COMP_REF_DESC}
  - layer (string): ${LAYER_REF_DESC}

Returns: { removed: string, remainingLayers: number }`,
      inputSchema: RemoveLayerInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async ({ comp, layer }) => {
      try {
        const data = await evalInAfterEffects<{ removed: string; remainingLayers: number }>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var l = $$requireLayer(c, ${esLiteral(layer)});
    var removedName = l.name;
    l.remove();
    return $$ok({ removed: removedName, remainingLayers: c.numLayers });`)
        );
        return { content: [{ type: "text", text: `Removed layer "${data.removed}". ${data.remainingLayers} layer(s) remain.` }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );
}
