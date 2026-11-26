// Tool definitions for the After Effects MCP server.

import { appendFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AEBridge, DEFAULT_BRIDGE_DIR } from './bridge.js';
import { loadBrand, resolveColor, resolveFont } from './brand.js';

export function createServer({
  bridge = new AEBridge({
    dir: process.env.AE_MCP_BRIDGE_DIR || DEFAULT_BRIDGE_DIR,
    timeoutMs: Number(process.env.AE_MCP_TIMEOUT_MS) || 30000,
  }),
  brand = loadBrand(),
  allowRawScript = process.env.AE_MCP_ALLOW_RAW_SCRIPT === '1',
  auditLog = process.env.AE_MCP_AUDIT_LOG,
} = {}) {
  const server = new McpServer({ name: 'aftereffects-mcp', version: '1.0.0' });

  const comp = z.union([z.string(), z.number().int()]).optional()
    .describe('Composition name or numeric id. Omit to use the active composition.');
  const layer = z.union([z.string(), z.number().int()])
    .describe('Layer name or 1-based layer index.');
  const color = z.union([z.string(), z.array(z.number()).length(3)])
    .describe(`"#RRGGBB", [r,g,b] in 0–1, or a brand colour name${Object.keys(brand.colors).length ? ` (${Object.keys(brand.colors).join(', ')})` : ''}.`);
  const vec = z.array(z.number()).min(2).max(3);
  const transform = {
    position: vec.optional().describe('[x, y] or [x, y, z] in comp pixels'),
    scale: vec.optional().describe('[x%, y%] e.g. [100, 100]'),
    rotation: z.number().optional().describe('Degrees'),
    opacity: z.number().min(0).max(100).optional(),
    anchorPoint: vec.optional(),
  };
  const property = z.string().describe(
    'Property path: "Position", "Transform/Opacity", "Effects/Gaussian Blur/Blurriness", "Text/Source Text". Display or match names.',
  );

  async function audit(command, args, outcome) {
    if (!auditLog) return;
    const line = JSON.stringify({ at: new Date().toISOString(), command, args, outcome });
    await appendFile(auditLog, line + '\n').catch(() => {});
  }

  // Registers a tool that forwards (optionally transformed) args to the AE panel.
  function tool(name, description, inputSchema, { map = (a) => a, timeoutMs, readOnly = false } = {}) {
    server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint: readOnly } }, async (args) => {
      try {
        const payload = map(args);
        const result = await bridge.send(name, payload, timeoutMs ? { timeoutMs } : undefined);
        if (!readOnly) await audit(name, payload, 'ok');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        if (!readOnly) await audit(name, args, `error: ${err.message}`);
        return { isError: true, content: [{ type: 'text', text: err.message }] };
      }
    });
  }

  const colors = (a, ...keys) => {
    const out = { ...a };
    for (const k of keys) if (a[k] !== undefined) out[k] = resolveColor(brand, a[k]);
    return out;
  };

  // ---- inspection

  tool('ping', 'Check that After Effects and the AE-MCP-Bridge panel are reachable. Returns AE version and open project.', {}, { readOnly: true, timeoutMs: 5000 });

  tool('get_project_info', 'Summary of the open project: path, item counts, active comp, bit depth, render queue size.', {}, { readOnly: true });

  tool('list_project_items', 'List project panel items (compositions, footage, folders) with ids and basic settings.', {
    type: z.enum(['composition', 'footage', 'folder']).optional(),
  }, { readOnly: true });

  tool('get_composition', 'Get a composition\'s settings and every layer (type, timing, transform, effects, text).', { comp }, { readOnly: true });

  tool('inspect_layer', 'Dump a layer\'s full property tree (names, match names, values, keyframe counts, expressions). Use this to discover effect parameter names.', {
    comp, layer, depth: z.number().int().min(1).max(6).optional().describe('Tree depth, default 3'),
  }, { readOnly: true });

  // ---- compositions

  tool('create_composition', 'Create a new composition. Unspecified settings fall back to the company brand defaults.', {
    name: z.string(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    duration: z.number().positive().optional().describe('Seconds'),
    frameRate: z.number().positive().optional(),
    pixelAspect: z.number().positive().optional(),
    bgColor: color.optional(),
    open: z.boolean().optional().describe('Open in the viewer (default true)'),
  }, {
    map: (a) => {
      const d = { width: 1920, height: 1080, duration: 10, frameRate: 30, pixelAspect: 1, ...brand.defaults };
      return colors({ width: d.width, height: d.height, duration: d.duration, frameRate: d.frameRate, pixelAspect: d.pixelAspect, ...a }, 'bgColor');
    },
  });

  tool('set_comp_settings', 'Change a composition\'s name, size, duration, frame rate, background colour or work area.', {
    comp,
    name: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    duration: z.number().positive().optional(),
    frameRate: z.number().positive().optional(),
    bgColor: color.optional(),
    workAreaStart: z.number().min(0).optional(),
    workAreaDuration: z.number().positive().optional(),
  }, { map: (a) => colors(a, 'bgColor') });

  tool('precompose', 'Precompose the given layers into a new composition.', {
    comp, layers: z.array(layer).min(1), name: z.string(),
    moveAttributes: z.boolean().optional().describe('Move all attributes into the new comp (default true)'),
  });

  tool('add_comp_to_comp', 'Nest one composition inside another as a layer.', { comp, source: z.union([z.string(), z.number().int()]), ...transform });

  // ---- layers

  tool('add_text_layer', 'Add a text layer. `font` accepts a brand font role ("heading", "body") or a PostScript font name.', {
    comp,
    text: z.string(),
    name: z.string().optional(),
    font: z.string().optional(),
    fontSize: z.number().positive().optional(),
    color: color.optional(),
    tracking: z.number().optional(),
    justification: z.enum(['left', 'center', 'right']).optional(),
    ...transform,
  }, {
    map: (a) => colors({ ...a, font: resolveFont(brand, a.font), color: a.color ?? (brand.colors.text ? 'text' : undefined) }, 'color'),
  });

  tool('add_solid_layer', 'Add a solid (or adjustment) layer. Size defaults to the comp size.', {
    comp,
    name: z.string().optional(),
    color: color.optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    adjustment: z.boolean().optional().describe('Make it an adjustment layer'),
    ...transform,
  }, { map: (a) => colors(a, 'color') });

  tool('add_shape_layer', 'Add a rectangle or ellipse shape layer with fill and/or stroke.', {
    comp,
    shape: z.enum(['rectangle', 'ellipse']),
    name: z.string().optional(),
    size: z.array(z.number().positive()).length(2).optional().describe('[width, height], default [400, 400]'),
    color: color.optional().describe('Fill colour'),
    strokeColor: color.optional(),
    strokeWidth: z.number().positive().optional(),
    roundness: z.number().min(0).optional().describe('Rectangle corner radius'),
    ...transform,
  }, { map: (a) => colors(a, 'color', 'strokeColor') });

  tool('add_null_layer', 'Add a null object (handy as an animation parent).', { comp, name: z.string().optional(), ...transform });

  tool('set_layer_properties', 'Rename, retime, parent, toggle or transform a layer. Transform values are set at the current time when the property is keyframed.', {
    comp, layer,
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    threeD: z.boolean().optional(),
    startTime: z.number().optional(),
    inPoint: z.number().optional(),
    outPoint: z.number().optional(),
    parent: z.union([z.string(), z.number().int(), z.null()]).optional().describe('Parent layer, or null to unparent'),
    ...transform,
  });

  tool('set_property', 'Set any property by path (e.g. an effect parameter). For keyframed properties pass `time`.', {
    comp, layer, property,
    value: z.any().describe('Number, array, boolean or string matching the property type'),
    time: z.number().optional(),
  });

  tool('set_keyframes', 'Animate a property with keyframes. Easing: "ease" (default, easy-ease), "ease_strong", "linear" or "hold".', {
    comp, layer, property,
    keyframes: z.array(z.object({
      time: z.number().min(0).describe('Seconds'),
      value: z.any(),
      easing: z.enum(['ease', 'ease_strong', 'linear', 'hold']).optional(),
    })).min(1),
    easing: z.enum(['ease', 'ease_strong', 'linear', 'hold']).optional().describe('Default easing for all keys'),
    replace: z.boolean().optional().describe('Remove existing keyframes first'),
  });

  tool('apply_expression', 'Set an expression on a property (empty string removes it). Returns any expression error AE reports.', {
    comp, layer, property, expression: z.string(),
  });

  tool('apply_effect', 'Add an effect to a layer and optionally set its parameters by name, e.g. {"Blurriness": 20}.', {
    comp, layer,
    effect: z.string().describe('Display name ("Gaussian Blur") or match name ("ADBE Gaussian Blur 2")'),
    name: z.string().optional().describe('Rename the effect instance'),
    properties: z.record(z.any()).optional(),
  });

  tool('duplicate_layer', 'Duplicate a layer.', { comp, layer, name: z.string().optional() });

  tool('delete_layer', 'Delete a layer. Undoable in AE with Ctrl/Cmd+Z.', { comp, layer });

  // ---- footage, project, render

  tool('import_file', 'Import footage, images, audio or an AE/PSD/AI file from disk, optionally adding it to a comp.', {
    path: z.string().describe('Absolute path on the machine running After Effects'),
    name: z.string().optional(),
    sequence: z.boolean().optional().describe('Import as an image sequence'),
    addToComp: z.union([z.string(), z.number().int()]).optional(),
  });

  tool('add_to_render_queue', 'Queue a composition for render. Returns the available template names.', {
    comp,
    outputPath: z.string().optional().describe('Absolute output file path'),
    outputModuleTemplate: z.string().optional().describe('e.g. "H.264 - Match Render Settings - 15 Mbps"'),
    renderSettingsTemplate: z.string().optional().describe('e.g. "Best Settings"'),
  });

  tool('render', 'Render everything in the render queue. Blocks After Effects until finished.', {}, {
    timeoutMs: Number(process.env.AE_MCP_RENDER_TIMEOUT_MS) || 60 * 60 * 1000,
  });

  tool('save_project', 'Save the project, or save it to a new path.', { path: z.string().optional() });

  tool('open_project', 'Open an .aep project. Refuses if the current project has unsaved changes unless discardChanges is true.', {
    path: z.string(), discardChanges: z.boolean().optional(),
  }, { timeoutMs: 120000 });

  if (allowRawScript) {
    tool('run_script', 'Run arbitrary ExtendScript in After Effects and return its `return` value. A `Json` helper (stringify/parse) is in scope. Also requires "Allow raw ExtendScript" in the AE panel.', {
      code: z.string().describe('Function body, e.g. "return app.project.numItems;"'),
    });
  }

  server.registerResource('brand-kit', 'brand://kit', {
    description: `${brand.name} brand colours, fonts and comp defaults used by the After Effects tools`,
    mimeType: 'application/json',
  }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(brand, null, 2) }] }));

  return server;
}
