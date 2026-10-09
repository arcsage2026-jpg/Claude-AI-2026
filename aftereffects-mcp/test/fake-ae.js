// A small fake of the After Effects scripting DOM, just enough to run the real
// AE-MCP-Bridge.jsx inside a Node vm and exercise it end to end.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const PANEL = new URL('../ae-panel/AE-MCP-Bridge.jsx', import.meta.url);

export function loadPanel({ bridgeDir, allowRawScript = false }) {
  let nextId = 1;
  const tasks = [];

  const PropertyType = { PROPERTY: 1, INDEXED_GROUP: 2, NAMED_GROUP: 3 };
  const PropertyValueType = { NO_VALUE: 0, OneD: 1, TwoD: 2, ThreeD: 3, TwoD_SPATIAL: 4, ThreeD_SPATIAL: 5, COLOR: 6, CUSTOM_VALUE: 7, TEXT_DOCUMENT: 8 };
  const KeyframeInterpolationType = { LINEAR: 1, BEZIER: 2, HOLD: 3 };
  const ParagraphJustification = { LEFT_JUSTIFY: 1, CENTER_JUSTIFY: 2, RIGHT_JUSTIFY: 3 };
  function KeyframeEase(speed, influence) { this.speed = speed; this.influence = influence; }

  class Property {
    constructor(name, matchName, value, valueType = PropertyValueType.OneD) {
      Object.assign(this, { name, matchName, value, propertyValueType: valueType, propertyType: PropertyType.PROPERTY });
      this.keys = [];
      this.canVaryOverTime = true;
      this.canSetExpression = true;
      this.expression = '';
      this.expressionEnabled = false;
      this.expressionError = '';
      this.dimensionsSeparated = false;
    }
    get numKeys() { return this.keys.length; }
    setValue(v) { this.value = v; }
    setValueAtTime(t, v) { this.value = v; }
    addKey(t) { this.keys.push({ time: t }); this.keys.sort((a, b) => a.time - b.time); return this.keys.findIndex((k) => k.time === t) + 1; }
    removeKey(i) { this.keys.splice(i - 1, 1); }
    setValueAtKey(i, v) { this.keys[i - 1].value = v; }
    setInterpolationTypeAtKey(i, inT, outT) { this.keys[i - 1].interp = [inT, outT]; }
    setTemporalEaseAtKey(i, inE, outE) {
      const dims = this.propertyValueType === PropertyValueType.TwoD ? 2 : this.propertyValueType === PropertyValueType.ThreeD ? 3 : 1;
      if (inE.length !== dims) throw new Error(`ease array must have ${dims} entries`);
      this.keys[i - 1].ease = [inE, outE];
    }
  }

  class Group {
    constructor(name, matchName, children = [], addable = {}) {
      Object.assign(this, { name, matchName, propertyType: PropertyType.NAMED_GROUP, children, addable });
    }
    get numProperties() { return this.children.length; }
    property(ref) {
      if (typeof ref === 'number') return this.children[ref - 1] || null;
      return this.children.find((c) => c.name === ref || c.matchName === ref) || null;
    }
    canAddProperty(n) { return n in this.addable; }
    addProperty(n) {
      if (!this.canAddProperty(n)) throw new Error(`cannot add ${n}`);
      const child = this.addable[n]();
      child.propertyIndex = this.children.length + 1;
      child.remove = () => this.children.splice(this.children.indexOf(child), 1);
      this.children.push(child);
      return child;
    }
  }

  const effects = {
    'Gaussian Blur': () => new Group('Gaussian Blur', 'ADBE Gaussian Blur 2', [new Property('Blurriness', 'ADBE Gaussian Blur 2-0001', 0)]),
  };
  effects['ADBE Gaussian Blur 2'] = effects['Gaussian Blur'];

  const shapeItems = {
    'ADBE Vector Shape - Rect': () => new Group('Rectangle Path 1', 'ADBE Vector Shape - Rect', [
      new Property('Size', 'ADBE Vector Rect Size', [100, 100], PropertyValueType.TwoD),
      new Property('Roundness', 'ADBE Vector Rect Roundness', 0),
    ]),
    'ADBE Vector Shape - Ellipse': () => new Group('Ellipse Path 1', 'ADBE Vector Shape - Ellipse', [
      new Property('Size', 'ADBE Vector Ellipse Size', [100, 100], PropertyValueType.TwoD),
    ]),
    'ADBE Vector Graphic - Fill': () => new Group('Fill 1', 'ADBE Vector Graphic - Fill', [new Property('Color', 'ADBE Vector Fill Color', [1, 0, 0], PropertyValueType.COLOR)]),
    'ADBE Vector Graphic - Stroke': () => new Group('Stroke 1', 'ADBE Vector Graphic - Stroke', [
      new Property('Color', 'ADBE Vector Stroke Color', [1, 1, 1], PropertyValueType.COLOR),
      new Property('Stroke Width', 'ADBE Vector Stroke Width', 2),
    ]),
  };

  class Layer {
    constructor(comp, name, extra = []) {
      this.containingComp = comp;
      this.name = name;
      this.enabled = true;
      this.inPoint = 0;
      this.outPoint = comp.duration;
      this.startTime = 0;
      this.parent = null;
      this.threeDLayer = false;
      this.children = [
        new Group('Transform', 'ADBE Transform Group', [
          new Property('Anchor Point', 'ADBE Anchor Point', [0, 0, 0], PropertyValueType.ThreeD_SPATIAL),
          new Property('Position', 'ADBE Position', [comp.width / 2, comp.height / 2, 0], PropertyValueType.ThreeD_SPATIAL),
          new Property('Scale', 'ADBE Scale', [100, 100, 100], PropertyValueType.ThreeD),
          new Property('Rotation', 'ADBE Rotate Z', 0),
          new Property('Opacity', 'ADBE Opacity', 100),
        ]),
        new Group('Effects', 'ADBE Effect Parade', [], effects),
        ...extra,
      ];
    }
    get index() { return this.containingComp._layers.indexOf(this) + 1; }
    property(ref) { return Group.prototype.property.call(this, ref); }
    get numProperties() { return this.children.length; }
    remove() { this.containingComp._layers.splice(this.index - 1, 1); }
    duplicate() { const l = new this.constructor(this.containingComp, this.name); this.containingComp._layers.unshift(l); return l; }
  }
  class AVLayer extends Layer {}
  class TextLayer extends AVLayer {
    constructor(comp, text) {
      super(comp, text, [new Group('Text', 'ADBE Text Properties', [
        new Property('Source Text', 'ADBE Text Document', { text, font: 'ArialMT', fontSize: 36 }, PropertyValueType.TEXT_DOCUMENT),
      ])]);
    }
  }
  class ShapeLayer extends AVLayer {
    constructor(comp) {
      super(comp, 'Shape Layer 1', [new Group('Contents', 'ADBE Root Vectors Group', [], {
        'ADBE Vector Group': () => new Group('Group 1', 'ADBE Vector Group', [new Group('Contents', 'ADBE Vectors Group', [], shapeItems)]),
      })]);
    }
  }
  class CameraLayer extends Layer {}
  class LightLayer extends Layer {}
  class FootageItem {}
  class SolidSource {}
  class FolderItem {}

  class CompItem {
    constructor(name, width, height, pixelAspect, duration, frameRate) {
      Object.assign(this, { id: nextId++, name, width, height, pixelAspect, duration, frameRate, bgColor: [0, 0, 0], time: 0, workAreaStart: 0, workAreaDuration: duration });
      this._layers = [];
      const comp = this;
      const add = (l) => { comp._layers.unshift(l); return l; };
      this.layers = {
        addText: (t) => add(new TextLayer(comp, t)),
        addShape: () => add(new ShapeLayer(comp)),
        addNull: () => { const l = add(new AVLayer(comp, 'Null 1')); l.nullLayer = true; return l; },
        addSolid: (color, name) => {
          const l = add(new AVLayer(comp, name));
          l.source = Object.assign(new FootageItem(), { mainSource: Object.assign(new SolidSource(), { color }) });
          return l;
        },
        add: (item) => { const l = add(new AVLayer(comp, item.name)); l.source = item; return l; },
      };
    }
    get numLayers() { return this._layers.length; }
    layer(ref) { return typeof ref === 'number' ? this._layers[ref - 1] : this._layers.find((l) => l.name === ref); }
    openInViewer() { project.activeItem = this; }
  }

  const project = {
    items: [],
    activeItem: null,
    file: null,
    dirty: false,
    bitsPerChannel: 8,
    renderQueue: { numItems: 0 },
    get numItems() { return this.items.length; },
    item(i) { return this.items[i - 1]; },
  };
  project.items.addComp = (...a) => { const c = new CompItem(...a); project.items.push(c); return c; };

  const settings = new Map(allowRawScript ? [['AE-MCP-Bridge/allowRawScript', 'true']] : []);
  settings.set('AE-MCP-Bridge/folder', bridgeDir);

  const undo = [];
  const app = {
    version: '26.0.0',
    project,
    undo,
    settings: {
      haveSetting: (s, k) => settings.has(`${s}/${k}`),
      getSetting: (s, k) => settings.get(`${s}/${k}`),
      saveSetting: (s, k, v) => settings.set(`${s}/${k}`, v),
    },
    preferences: { getPrefAsLong: () => 1 },
    scheduleTask: (code) => { tasks.push(code); return tasks.length; },
    cancelTask: () => {},
    beginUndoGroup: (n) => undo.push(n),
    endUndoGroup: () => {},
  };

  // ExtendScript File/Folder over the real filesystem.
  class File {
    constructor(p) { this.fsName = p; this.name = path.basename(p); this.encoding = 'UTF-8'; this._buf = null; }
    get exists() { return fs.existsSync(this.fsName); }
    open(mode) { this._mode = mode; this._buf = mode === 'r' ? fs.readFileSync(this.fsName, 'utf8') : ''; return true; }
    read() { return this._buf; }
    write(s) { this._buf += s; }
    close() { if (this._mode === 'w') fs.writeFileSync(this.fsName, this._buf); }
    remove() { fs.rmSync(this.fsName, { force: true }); return true; }
    rename(n) { fs.renameSync(this.fsName, path.join(path.dirname(this.fsName), n)); return true; }
  }
  class Folder {
    constructor(p) { this.fsName = p; }
    get exists() { return fs.existsSync(this.fsName); }
    create() { fs.mkdirSync(this.fsName, { recursive: true }); }
    getFiles(mask) {
      const re = new RegExp('^' + mask.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return fs.readdirSync(this.fsName).filter((f) => re.test(f)).map((f) => new File(path.join(this.fsName, f)));
    }
  }
  Folder.myDocuments = { fsName: bridgeDir };

  const uiStub = () => new Proxy(function () {}, {
    get: (t, k) => (k === 'items' ? [] : k in t ? t[k] : uiStub()),
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => uiStub(),
  });
  class Panel {}
  const Window = function () { return uiStub(); };

  const context = vm.createContext({
    app, File, Folder, Panel, Window, CompItem, FolderItem, FootageItem, SolidSource,
    TextLayer, ShapeLayer, CameraLayer, LightLayer, AVLayer, KeyframeEase, ImportOptions: function () {},
    PropertyType, PropertyValueType, KeyframeInterpolationType, ParagraphJustification,
    alert: (m) => { throw new Error(`alert: ${m}`); },
    JSON: undefined, // ExtendScript has no JSON — the panel must bring its own
  });
  context.$ = { global: context };
  vm.runInContext(fs.readFileSync(PANEL, 'utf8'), context, { filename: 'AE-MCP-Bridge.jsx' });

  return {
    app,
    poll: () => vm.runInContext(tasks[0], context),
  };
}
