// Simulates just enough of the After Effects ExtendScript DOM to actually
// *run* every generated script end-to-end against a real MCP client/server
// connection, rather than only checking it parses. There is no After Effects
// install to test against in most CI/dev environments, so this is the
// regression check for the script-builder code in src/extendscript.ts and
// src/tools/*.ts — run it with `npm test` after any change to those files.
import vm from "node:vm";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.join(__dirname, "..", "dist", "index.js");

function makeAeSandbox() {
  let nextItemId = 1;
  const items = []; // 1-indexed via helpers below

  class PropertyValue {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    get value() { return this.v; }
  }

  class Layer {
    constructor(name, kind) {
      this.name = name;
      this.matchName = "ADBE " + kind + " Layer";
      this._kind = kind;
      this.enabled = true;
      this.startTime = 0;
      this.inPoint = 0;
      this.outPoint = 10;
      this.index = 0;
      this.nullLayer = kind === "null";
      this.transform = {
        position: new PropertyValue([0, 0]),
        scale: new PropertyValue([100, 100]),
        rotation: new PropertyValue(0),
        opacity: new PropertyValue(100)
      };
      this._removed = false;
    }
    property(name) {
      if (name === "Source Text") {
        if (!this._sourceText) this._sourceText = new PropertyValue({ text: this._initialText || "", fontSize: 72, fillColor: [1, 1, 1], font: "" });
        return this._sourceText;
      }
      throw new Error("Unknown property: " + name);
    }
    remove() { this._removed = true; }
  }

  class TextLayer extends Layer {
    constructor(text) { super(text.slice(0, 30), "text"); this._initialText = text; }
  }
  class ShapeLayer extends Layer { constructor(name) { super(name, "shape"); } }
  class CameraLayer extends Layer { constructor(name) { super(name, "camera"); } }
  class LightLayer extends Layer { constructor(name) { super(name, "light"); } }

  class SolidSource {}
  class FootageItem {
    constructor(name, isSolid) {
      this.id = nextItemId++;
      this.name = name;
      this.mainSource = isSolid ? new SolidSource() : {};
    }
  }

  class OutputModule {
    constructor() { this.file = null; }
    applyTemplate(name) { this._template = name; }
  }
  class RenderQueueItem {
    constructor(comp) {
      this.comp = comp;
      this.status = "QUEUED";
      this._modules = [new OutputModule()];
      this.numOutputModules = 1;
    }
    outputModule(i) { return this._modules[i - 1]; }
    applyTemplate(name) { this._rsTemplate = name; }
    remove() { this._removed = true; }
  }
  class RenderQueue {
    constructor() { this._items = []; }
    get numItems() { return this._items.filter((i) => !i._removed).length; }
    item(i) { return this._items.filter((x) => !x._removed)[i - 1]; }
    items = {
      add: (comp) => {
        const rq = this;
        const item = new RenderQueueItem(comp);
        rq._items.push(item);
        return item;
      }
    };
    render() {
      for (const i of this._items) if (i.status === "QUEUED") i.status = "DONE";
    }
  }

  class CompItem {
    constructor(name, width, height, pixelAspect, duration, frameRate) {
      this.id = nextItemId++;
      this.name = name;
      this.width = width;
      this.height = height;
      this.pixelAspect = pixelAspect;
      this.duration = duration;
      this.frameRate = frameRate;
      this.bgColor = [0, 0, 0];
      this._layers = [];
    }
    get numLayers() { return this._layers.length; }
    layer(i) { return this._layers[i - 1]; }
    layers = {
      addText: (text) => {
        const l = new TextLayer(text);
        this._layers.unshift(l);
        this._reindex();
        return l;
      },
      addSolid: (color, name, w, h) => {
        const item = new FootageItem(name, true);
        const l = new Layer(name, "solid");
        l.source = item;
        this._layers.unshift(l);
        this._reindex();
        return l;
      },
      add: (item) => {
        const l = new Layer(item.name, "footage");
        l.source = item;
        this._layers.unshift(l);
        this._reindex();
        return l;
      }
    };
    _reindex() { this._layers.forEach((l, idx) => (l.index = idx + 1)); }
  }

  const project = {
    file: null,
    dirty: false,
    bitsPerChannel: 8,
    activeItem: null,
    renderQueue: new RenderQueue(),
    _items: [],
    get numItems() { return this._items.length; },
    item(i) { return this._items[i - 1]; },
    itemByID(id) { return this._items.find((it) => it.id === id) || null; },
    items: {
      addComp: (name, w, h, pa, dur, fr) => {
        const c = new CompItem(name, w, h, pa, dur, fr);
        project._items.push(c);
        return c;
      }
    },
    importFile: (opts) => {
      const item = new FootageItem(opts.file.name, false);
      project._items.push(item);
      return item;
    },
    save: (file) => { if (file) project.file = file; }
  };

  class File {
    constructor(path) {
      this.fsName = path;
      this.name = path.split("/").pop();
      this.exists = true;
    }
  }
  class ImportOptions {
    constructor(file) { this.file = file; }
  }

  const RQItemStatus = {
    WILL_CONTINUE: "s0", NEEDS_OUTPUT: "s1", UNQUEUED: "s2", QUEUED: "QUEUED",
    RENDERING: "s4", USER_STOPPED: "s5", ERR_STOPPED: "s6", DONE: "DONE"
  };

  const app = { project, version: "99.9 (Mock)" };

  const sandbox = { app, CompItem, TextLayer, ShapeLayer, CameraLayer, LightLayer, FootageItem, SolidSource, File, ImportOptions, RQItemStatus, console };
  return vm.createContext(sandbox);
}

const sandbox = makeAeSandbox();

// --- Mock CEP bridge HTTP server ---
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const body = JSON.stringify({ appName: "Mock After Effects", appVersion: "99.9" });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
    return;
  }
  if (req.method === "POST" && req.url === "/eval") {
    let chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const { script } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      let result;
      try {
        result = String(vm.runInContext(script, sandbox));
      } catch (e) {
        // Mirrors what a real evalScript failure that escapes AE's own
        // try/catch would look like, to make sure our tools surface it well.
        result = "EvalScript error.";
        console.error("SCRIPT THREW OUTSIDE ITS OWN TRY/CATCH:", e.message, "\n", script);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

await new Promise((resolve) => server.listen(39843, "127.0.0.1", resolve));
console.log("Mock AE bridge listening on 39843\n");

const transport = new StdioClientTransport({ command: "node", args: [serverEntry] });
const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(transport);

let failures = 0;
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.[0]?.text ?? "";
  const failed = result.isError === true || text.startsWith("Error:") || text.startsWith("Not connected");
  console.log(`${failed ? "FAIL" : "ok  "} ${name}(${JSON.stringify(args)})`);
  if (failed) {
    failures++;
    console.log("     ->", text.split("\n")[0]);
  }
  return result;
}

await call("ae_ping", {});
await call("ae_get_project_info", {});
await call("ae_create_composition", { name: "Main Comp", width: 1920, height: 1080, duration: 10, frameRate: 30, pixelAspect: 1, backgroundColor: [0.05, 0.05, 0.05] });
await call("ae_list_compositions", {});
await call("ae_get_composition_info", { comp: "Main Comp" });
await call("ae_add_text_layer", { comp: "Main Comp", text: "Q3 Office Report", fontSize: 96, fillColor: [1, 1, 1], startTime: 0, duration: 5, position: [960, 200] });
await call("ae_add_solid_layer", { comp: "Main Comp", name: "BG Panel", color: [0.1, 0.1, 0.2], startTime: 0 });
await call("ae_list_layers", { comp: "Main Comp" });
await call("ae_set_layer_text", { comp: "Main Comp", layer: "Q3 Office Report", text: "Q4 Office Report (updated)" });
await call("ae_set_layer_transform", { comp: "Main Comp", layer: "Q3 Office Report", opacity: 80, rotation: 2 });
await call("ae_set_composition_settings", { comp: "Main Comp", frameRate: 24 });
await call("ae_import_footage", { path: "/tmp/logo.png" });
await call("ae_add_footage_layer", { comp: "Main Comp", footage: "logo.png", startTime: 1 });
await call("ae_add_to_render_queue", { comp: "Main Comp", outputPath: "/tmp/out.mp4", outputModuleTemplate: "H.264" });
await call("ae_get_render_queue_status", {});
await call("ae_start_render", { wait: true, timeoutSeconds: 30 });
await call("ae_clear_render_queue", { onlyDone: true });
await call("ae_remove_layer", { comp: "Main Comp", layer: "BG Panel" });
await call("ae_run_extendscript", { script: "var c = $$requireComp('Main Comp'); return {name: c.name, layers: c.numLayers};" });
await call("ae_save_project", { path: "/tmp/mock.aep" });

console.log(`\n${failures === 0 ? "ALL TOOLS OK" : failures + " TOOL(S) FAILED"}`);
await client.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
