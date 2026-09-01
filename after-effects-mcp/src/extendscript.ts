/**
 * Helpers for building the ExtendScript (.jsx) snippets sent to After Effects
 * over the bridge. ExtendScript is an ES3 dialect embedded in AE, so every
 * snippet is assembled as plain text rather than compiled/typechecked.
 *
 * Every script built with `buildScript` is self-contained: it defines its own
 * `$$ok`/`$$err`/lookup helpers and always resolves to a JSON string, so a
 * thrown ExtendScript exception never surfaces to Node as the opaque
 * "EvalScript error." string that bare `evalScript` calls produce.
 */

/** Shared helper functions available to every script body. */
export const PRELUDE = `
function $$ok(data) { return JSON.stringify({ ok: true, data: data }); }
function $$err(e) {
  var msg = (e && e.toString) ? e.toString() : String(e);
  var line = (e && typeof e.line === "number") ? e.line : undefined;
  return JSON.stringify({ ok: false, error: msg, line: line });
}
function $$findComp(ref) {
  var asNum = Number(ref);
  if (!isNaN(asNum) && String(asNum) === String(ref)) {
    var byId = app.project.itemByID(asNum);
    if (byId && byId instanceof CompItem) return byId;
  }
  for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it instanceof CompItem && it.name === ref) return it;
  }
  return null;
}
function $$requireComp(ref) {
  var comp = $$findComp(ref);
  if (!comp) throw new Error("No composition found matching '" + ref + "' (checked by item ID and by exact name)");
  return comp;
}
function $$findItem(ref) {
  var asNum = Number(ref);
  if (!isNaN(asNum) && String(asNum) === String(ref)) {
    var byId = app.project.itemByID(asNum);
    if (byId) return byId;
  }
  for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it.name === ref) return it;
  }
  return null;
}
function $$requireItem(ref) {
  var item = $$findItem(ref);
  if (!item) throw new Error("No project item found matching '" + ref + "' (checked by item ID and by exact name)");
  return item;
}
function $$findLayer(comp, ref) {
  var asNum = Number(ref);
  if (!isNaN(asNum) && String(asNum) === String(ref)) {
    if (asNum >= 1 && asNum <= comp.numLayers) return comp.layer(asNum);
  }
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === ref) return comp.layer(i);
  }
  return null;
}
function $$requireLayer(comp, ref) {
  var layer = $$findLayer(comp, ref);
  if (!layer) throw new Error("No layer found matching '" + ref + "' in composition '" + comp.name + "' (checked by index and by exact name)");
  return layer;
}
function $$layerTypeOf(layer) {
  if (layer instanceof TextLayer) return "text";
  if (layer instanceof CameraLayer) return "camera";
  if (layer instanceof LightLayer) return "light";
  if (layer instanceof ShapeLayer) return "shape";
  if (layer.nullLayer) return "null";
  if (layer.source && layer.source instanceof CompItem) return "footage";
  if (layer.source && layer.source instanceof FootageItem) {
    return (layer.source.mainSource && layer.source.mainSource instanceof SolidSource) ? "solid" : "footage";
  }
  return "other";
}
function $$compSummary(comp) {
  return {
    id: comp.id,
    name: comp.name,
    width: comp.width,
    height: comp.height,
    duration: comp.duration,
    frameRate: comp.frameRate,
    numLayers: comp.numLayers
  };
}
function $$rqStatusName(status) {
  if (status === RQItemStatus.WILL_CONTINUE) return "WILL_CONTINUE";
  if (status === RQItemStatus.NEEDS_OUTPUT) return "NEEDS_OUTPUT";
  if (status === RQItemStatus.UNQUEUED) return "UNQUEUED";
  if (status === RQItemStatus.QUEUED) return "QUEUED";
  if (status === RQItemStatus.RENDERING) return "RENDERING";
  if (status === RQItemStatus.USER_STOPPED) return "USER_STOPPED";
  if (status === RQItemStatus.ERR_STOPPED) return "ERR_STOPPED";
  if (status === RQItemStatus.DONE) return "DONE";
  return String(status);
}
function $$rqItemSummary(item, index) {
  var outPath = null;
  if (item.numOutputModules >= 1) {
    var om = item.outputModule(1);
    if (om.file) outPath = om.file.fsName;
  }
  return {
    index: index,
    compName: item.comp.name,
    status: $$rqStatusName(item.status),
    outputPath: outPath
  };
}
function $$layerSummary(layer, index) {
  return {
    index: index,
    name: layer.name,
    matchName: layer.matchName,
    layerType: $$layerTypeOf(layer),
    enabled: layer.enabled,
    startTime: layer.startTime,
    inPoint: layer.inPoint,
    outPoint: layer.outPoint
  };
}
`;

/** Wraps a script body in the shared prelude plus a top-level try/catch that
 * guarantees a JSON envelope comes back no matter what the body does. The
 * body must end with `return $$ok(...)`. */
export function buildScript(body: string): string {
  return `${PRELUDE}\n(function () {\n  try {\n${body}\n  } catch (e) {\n    return $$err(e);\n  }\n})();`;
}

/** Safely embeds an arbitrary JS value as an ExtendScript (ES3) literal.
 * Relies on JSON.stringify producing syntax that is also valid ES3 for the
 * value shapes this project embeds (strings, numbers, booleans, plain
 * arrays/objects of those) — in particular this is what prevents a file path
 * or text-layer string containing quotes/backslashes from breaking out of
 * the generated script. */
export function esLiteral(value: unknown): string {
  return JSON.stringify(value);
}
