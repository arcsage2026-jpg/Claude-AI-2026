/*
 * AE-MCP-Bridge — runs inside After Effects and executes commands sent by the
 * aftereffects-mcp server through a shared folder.
 *
 * Install: copy this file into
 *   Windows: C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Scripts\ScriptUI Panels\
 *   macOS:   /Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels/
 * then enable Settings > Scripting & Expressions > "Allow Scripts to Write Files and
 * Access Network", restart AE and open Window > AE-MCP-Bridge.jsx.
 *
 * ExtendScript is ES3: no JSON object, no Array.indexOf/forEach, no let/const.
 */

(function (thisObj) {
    var VERSION = "1.0.0";
    var SETTINGS_SECTION = "AE-MCP-Bridge";
    var POLL_MS = 250;

    // ------------------------------------------------------------------ JSON (ES3)

    var Json = {};

    Json.stringify = function (v) {
        if (v === null || v === undefined) return "null";
        var t = typeof v;
        if (t === "number") return isFinite(v) ? String(v) : "null";
        if (t === "boolean") return v ? "true" : "false";
        if (t === "string") return quote(v);
        if (v instanceof Array) {
            var a = [];
            for (var i = 0; i < v.length; i++) a.push(Json.stringify(v[i]));
            return "[" + a.join(",") + "]";
        }
        if (t === "object") {
            var parts = [];
            for (var k in v) {
                if (!v.hasOwnProperty(k) || v[k] === undefined || typeof v[k] === "function") continue;
                parts.push(quote(k) + ":" + Json.stringify(v[k]));
            }
            return "{" + parts.join(",") + "}";
        }
        return "null";
    };

    function quote(s) {
        var out = "\"";
        for (var i = 0; i < s.length; i++) {
            var c = s.charAt(i), code = s.charCodeAt(i);
            if (c === "\"") out += "\\\"";
            else if (c === "\\") out += "\\\\";
            else if (c === "\n") out += "\\n";
            else if (c === "\r") out += "\\r";
            else if (c === "\t") out += "\\t";
            else if (code < 0x20) out += "\\u" + ("0000" + code.toString(16)).slice(-4);
            else out += c;
        }
        return out + "\"";
    }

    // Recursive-descent parser: the bridge folder is just a folder on disk, so commands
    // are parsed as data and never eval'd.
    Json.parse = function (text) {
        var at = 0, ch = " ";
        function error(m) { throw new Error("JSON parse error: " + m + " at " + at); }
        function next() { ch = text.charAt(at); at += 1; return ch; }
        function white() { while (ch && ch <= " ") next(); }
        function number() {
            var s = "";
            if (ch === "-") { s = "-"; next(); }
            while (ch >= "0" && ch <= "9") { s += ch; next(); }
            if (ch === ".") { s += "."; while (next() && ch >= "0" && ch <= "9") s += ch; }
            if (ch === "e" || ch === "E") {
                s += ch; next();
                if (ch === "-" || ch === "+") { s += ch; next(); }
                while (ch >= "0" && ch <= "9") { s += ch; next(); }
            }
            var n = +s;
            if (isNaN(n)) error("bad number");
            return n;
        }
        function string() {
            var s = "", esc = { "\"": "\"", "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
            if (ch !== "\"") error("expected string");
            while (next()) {
                if (ch === "\"") { next(); return s; }
                if (ch === "\\") {
                    next();
                    if (ch === "u") {
                        var hex = text.substr(at, 4);
                        if (!/^[0-9a-fA-F]{4}$/.test(hex)) error("bad unicode escape");
                        s += String.fromCharCode(parseInt(hex, 16));
                        at += 4;
                    } else if (esc.hasOwnProperty(ch)) s += esc[ch];
                    else error("bad escape");
                } else s += ch;
            }
            error("unterminated string");
        }
        function word() {
            var words = { t: ["true", true], f: ["false", false], n: ["null", null] };
            var w = words[ch];
            if (!w || text.substr(at - 1, w[0].length) !== w[0]) error("unexpected '" + ch + "'");
            at += w[0].length - 1; next();
            return w[1];
        }
        function array() {
            var a = [];
            next(); white();
            if (ch === "]") { next(); return a; }
            while (ch) {
                a.push(value()); white();
                if (ch === "]") { next(); return a; }
                if (ch !== ",") error("expected ,");
                next(); white();
            }
            error("unterminated array");
        }
        function object() {
            var o = {};
            next(); white();
            if (ch === "}") { next(); return o; }
            while (ch) {
                var k = string(); white();
                if (ch !== ":") error("expected :");
                next();
                o[k] = value(); white();
                if (ch === "}") { next(); return o; }
                if (ch !== ",") error("expected ,");
                next(); white();
            }
            error("unterminated object");
        }
        function value() {
            white();
            if (ch === "{") return object();
            if (ch === "[") return array();
            if (ch === "\"") return string();
            if (ch === "-" || (ch >= "0" && ch <= "9")) return number();
            return word();
        }
        var result = value();
        white();
        if (ch) error("trailing characters");
        return result;
    };

    // ------------------------------------------------------------------ helpers

    function fail(msg) { throw new Error(msg); }

    function findComp(ref) {
        var proj = app.project, i, item;
        if (ref === undefined || ref === null || ref === "") {
            if (proj.activeItem instanceof CompItem) return proj.activeItem;
            fail("No composition given and no active composition. Pass `comp` (name or id).");
        }
        for (i = 1; i <= proj.numItems; i++) {
            item = proj.item(i);
            if (!(item instanceof CompItem)) continue;
            if ((typeof ref === "number" && item.id === ref) || item.name === ref) return item;
        }
        fail("Composition not found: " + ref);
    }

    function findLayer(comp, ref) {
        if (typeof ref === "number") {
            if (ref < 1 || ref > comp.numLayers) fail("Layer index " + ref + " out of range (1-" + comp.numLayers + ") in '" + comp.name + "'");
            return comp.layer(ref);
        }
        var layer = comp.layer(ref);
        if (!layer) fail("Layer not found: '" + ref + "' in '" + comp.name + "'");
        return layer;
    }

    // "Transform/Position", "Effects/Gaussian Blur/Blurriness", or match names.
    function findProperty(layer, path) {
        var aliases = { "Transform": "ADBE Transform Group", "Effects": "ADBE Effect Parade", "Masks": "ADBE Mask Parade", "Contents": "ADBE Root Vectors Group", "Text": "ADBE Text Properties" };
        var parts = path.split("/"), prop = layer;
        // Bare "Position", "Opacity" etc. resolve under Transform.
        if (parts.length === 1 && !layer.property(parts[0])) parts.unshift("Transform");
        for (var i = 0; i < parts.length; i++) {
            var next = prop.property(parts[i]);
            if (!next && aliases[parts[i]]) next = prop.property(aliases[parts[i]]);
            if (!next) fail("Property '" + parts[i] + "' not found (path '" + path + "') on layer '" + layer.name + "'");
            prop = next;
        }
        if (prop.propertyType !== PropertyType.PROPERTY) fail("'" + path + "' is a property group, not a property");
        return prop;
    }

    function layerType(layer) {
        if (layer instanceof TextLayer) return "text";
        if (layer instanceof ShapeLayer) return "shape";
        if (layer instanceof CameraLayer) return "camera";
        if (layer instanceof LightLayer) return "light";
        if (layer.nullLayer) return "null";
        if (layer.adjustmentLayer) return "adjustment";
        if (layer.source instanceof FootageItem && layer.source.mainSource instanceof SolidSource) return "solid";
        if (layer.source instanceof CompItem) return "precomp";
        return "footage";
    }

    function transformValue(layer, name) {
        try { return layer.property("ADBE Transform Group").property(name).value; } catch (e) { return null; }
    }

    function describeLayer(layer) {
        var effects = [], parade = layer.property("ADBE Effect Parade");
        if (parade) for (var i = 1; i <= parade.numProperties; i++) effects.push(parade.property(i).name);
        return {
            index: layer.index,
            name: layer.name,
            type: layerType(layer),
            enabled: layer.enabled,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            startTime: layer.startTime,
            parent: layer.parent ? layer.parent.index : null,
            threeD: layer.threeDLayer === true,
            position: transformValue(layer, "ADBE Position"),
            scale: transformValue(layer, "ADBE Scale"),
            rotation: transformValue(layer, "ADBE Rotate Z"),
            opacity: transformValue(layer, "ADBE Opacity"),
            anchorPoint: transformValue(layer, "ADBE Anchor Point"),
            effects: effects,
            text: layer instanceof TextLayer ? layer.property("ADBE Text Properties").property("ADBE Text Document").value.text : undefined
        };
    }

    function describeComp(comp) {
        return {
            id: comp.id, name: comp.name, width: comp.width, height: comp.height,
            pixelAspect: comp.pixelAspect, duration: comp.duration, frameRate: comp.frameRate,
            numLayers: comp.numLayers, bgColor: comp.bgColor
        };
    }

    function dumpProperties(group, depth) {
        var out = [];
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i), entry = { name: p.name, matchName: p.matchName };
            if (p.propertyType === PropertyType.PROPERTY) {
                try { if (p.propertyValueType !== PropertyValueType.NO_VALUE && p.propertyValueType !== PropertyValueType.CUSTOM_VALUE) entry.value = p.value; } catch (e) {}
                entry.numKeys = p.numKeys;
                if (p.canSetExpression && p.expression) entry.expression = p.expression;
            } else if (depth > 1) {
                entry.properties = dumpProperties(p, depth - 1);
            }
            out.push(entry);
        }
        return out;
    }

    function easeDimensions(prop) {
        var t = prop.propertyValueType;
        if (t === PropertyValueType.TwoD) return 2;
        if (t === PropertyValueType.ThreeD) return 3;
        return 1;
    }

    function applyTransform(layer, a) {
        var tg = layer.property("ADBE Transform Group"), map = {
            position: "ADBE Position", scale: "ADBE Scale", rotation: "ADBE Rotate Z",
            opacity: "ADBE Opacity", anchorPoint: "ADBE Anchor Point"
        };
        for (var key in map) {
            if (!map.hasOwnProperty(key) || a[key] === undefined || a[key] === null) continue;
            var prop = tg.property(map[key]);
            if (key === "position" && prop.dimensionsSeparated) fail("Position has separated dimensions; set 'Transform/X Position' via set_property instead");
            if (prop.numKeys > 0) prop.setValueAtTime(layer.containingComp.time, a[key]);
            else prop.setValue(a[key]);
        }
    }

    // ------------------------------------------------------------------ commands

    var commands = {};

    commands.ping = function () {
        return { bridgeVersion: VERSION, aeVersion: app.version, project: app.project.file ? app.project.file.fsName : null };
    };

    commands.get_project_info = function () {
        var p = app.project, comps = 0, footage = 0, folders = 0;
        for (var i = 1; i <= p.numItems; i++) {
            var it = p.item(i);
            if (it instanceof CompItem) comps++;
            else if (it instanceof FolderItem) folders++;
            else footage++;
        }
        return {
            path: p.file ? p.file.fsName : null,
            numItems: p.numItems, compositions: comps, footage: footage, folders: folders,
            activeComp: p.activeItem instanceof CompItem ? p.activeItem.name : null,
            bitsPerChannel: p.bitsPerChannel,
            renderQueueItems: p.renderQueue.numItems
        };
    };

    commands.list_project_items = function (a) {
        var out = [], p = app.project;
        for (var i = 1; i <= p.numItems; i++) {
            var it = p.item(i), type = it instanceof CompItem ? "composition" : it instanceof FolderItem ? "folder" : "footage";
            if (a.type && a.type !== type) continue;
            var entry = { id: it.id, name: it.name, type: type, folder: it.parentFolder ? it.parentFolder.name : null };
            if (type === "composition") { entry.width = it.width; entry.height = it.height; entry.duration = it.duration; entry.frameRate = it.frameRate; entry.numLayers = it.numLayers; }
            if (type === "footage") { entry.file = it.file ? it.file.fsName : null; entry.duration = it.duration; }
            out.push(entry);
        }
        return out;
    };

    commands.get_composition = function (a) {
        var comp = findComp(a.comp), info = describeComp(comp), layers = [];
        for (var i = 1; i <= comp.numLayers; i++) layers.push(describeLayer(comp.layer(i)));
        info.layers = layers;
        info.workAreaStart = comp.workAreaStart;
        info.workAreaDuration = comp.workAreaDuration;
        return info;
    };

    commands.create_composition = function (a) {
        var comp = app.project.items.addComp(a.name, a.width, a.height, a.pixelAspect, a.duration, a.frameRate);
        if (a.bgColor) comp.bgColor = a.bgColor;
        if (a.open !== false) comp.openInViewer();
        return describeComp(comp);
    };

    commands.add_text_layer = function (a) {
        var comp = findComp(a.comp), layer = comp.layers.addText(a.text);
        var prop = layer.property("ADBE Text Properties").property("ADBE Text Document"), doc = prop.value;
        if (a.font) doc.font = a.font;
        if (a.fontSize) doc.fontSize = a.fontSize;
        if (a.color) { doc.applyFill = true; doc.fillColor = a.color; }
        if (a.tracking !== undefined) doc.tracking = a.tracking;
        if (a.justification) doc.justification = { left: ParagraphJustification.LEFT_JUSTIFY, center: ParagraphJustification.CENTER_JUSTIFY, right: ParagraphJustification.RIGHT_JUSTIFY }[a.justification];
        prop.setValue(doc);
        if (a.name) layer.name = a.name;
        applyTransform(layer, a);
        return describeLayer(layer);
    };

    commands.add_solid_layer = function (a) {
        var comp = findComp(a.comp);
        var layer = comp.layers.addSolid(a.color || [0, 0, 0], a.name || "Solid", a.width || comp.width, a.height || comp.height, comp.pixelAspect);
        if (a.adjustment) layer.adjustmentLayer = true;
        applyTransform(layer, a);
        return describeLayer(layer);
    };

    commands.add_null_layer = function (a) {
        var comp = findComp(a.comp), layer = comp.layers.addNull();
        if (a.name) layer.name = a.name;
        applyTransform(layer, a);
        return describeLayer(layer);
    };

    commands.add_shape_layer = function (a) {
        var comp = findComp(a.comp), layer = comp.layers.addShape();
        layer.name = a.name || (a.shape === "ellipse" ? "Ellipse" : "Rectangle");
        var size = a.size || [400, 400];
        // AE invalidates property references after addProperty, so re-resolve by path each step.
        function contents() { return layer.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); }
        layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        if (a.shape === "ellipse") {
            contents().addProperty("ADBE Vector Shape - Ellipse");
            contents().property(1).property("ADBE Vector Ellipse Size").setValue(size);
        } else {
            contents().addProperty("ADBE Vector Shape - Rect");
            contents().property(1).property("ADBE Vector Rect Size").setValue(size);
            if (a.roundness) contents().property(1).property("ADBE Vector Rect Roundness").setValue(a.roundness);
        }
        if (a.strokeColor) {
            contents().addProperty("ADBE Vector Graphic - Stroke");
            var stroke = contents().property("ADBE Vector Graphic - Stroke");
            stroke.property("ADBE Vector Stroke Color").setValue(a.strokeColor);
            stroke.property("ADBE Vector Stroke Width").setValue(a.strokeWidth || 4);
        }
        if (a.color || !a.strokeColor) {
            contents().addProperty("ADBE Vector Graphic - Fill");
            contents().property("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(a.color || [1, 1, 1]);
        }
        applyTransform(layer, a);
        return describeLayer(layer);
    };

    commands.set_layer_properties = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer);
        if (a.name !== undefined) layer.name = a.name;
        if (a.enabled !== undefined) layer.enabled = a.enabled;
        if (a.threeD !== undefined) layer.threeDLayer = a.threeD;
        if (a.startTime !== undefined) layer.startTime = a.startTime;
        if (a.inPoint !== undefined) layer.inPoint = a.inPoint;
        if (a.outPoint !== undefined) layer.outPoint = a.outPoint;
        if (a.parent !== undefined) layer.parent = a.parent === null ? null : findLayer(comp, a.parent);
        applyTransform(layer, a);
        return describeLayer(layer);
    };

    commands.set_property = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer), prop = findProperty(layer, a.property);
        if (prop.numKeys > 0 && a.time === undefined) fail("'" + a.property + "' has keyframes; pass `time` to set a value at a time");
        if (a.time !== undefined) prop.setValueAtTime(a.time, a.value);
        else prop.setValue(a.value);
        return { layer: layer.name, property: a.property, value: prop.value };
    };

    commands.set_keyframes = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer), prop = findProperty(layer, a.property);
        if (!prop.canVaryOverTime) fail("'" + a.property + "' cannot be animated");
        if (a.replace) while (prop.numKeys > 0) prop.removeKey(prop.numKeys);
        var dims = easeDimensions(prop), added = [];
        for (var i = 0; i < a.keyframes.length; i++) {
            var k = a.keyframes[i], idx = prop.addKey(k.time);
            prop.setValueAtKey(idx, k.value);
            var easing = k.easing || a.easing || "ease";
            if (easing === "hold") {
                prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
            } else if (easing === "linear") {
                prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
            } else {
                var influence = easing === "ease_strong" ? 75 : 33.33, ease = [];
                for (var d = 0; d < dims; d++) ease.push(new KeyframeEase(0, influence));
                prop.setInterpolationTypeAtKey(idx, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                prop.setTemporalEaseAtKey(idx, ease, ease);
            }
            added.push({ time: k.time, value: k.value, easing: easing });
        }
        return { layer: layer.name, property: a.property, numKeys: prop.numKeys, keyframes: added };
    };

    commands.apply_expression = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer), prop = findProperty(layer, a.property);
        if (!prop.canSetExpression) fail("'" + a.property + "' does not accept expressions");
        prop.expression = a.expression;
        return { layer: layer.name, property: a.property, expressionEnabled: prop.expressionEnabled, expressionError: prop.expressionError || null };
    };

    commands.apply_effect = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer), parade = layer.property("ADBE Effect Parade");
        if (!parade.canAddProperty(a.effect)) fail("Unknown effect '" + a.effect + "'. Use the display name (e.g. 'Gaussian Blur') or match name (e.g. 'ADBE Gaussian Blur 2').");
        var effect = parade.addProperty(a.effect), effectIndex = effect.propertyIndex, set = [];
        if (a.name) { effect.name = a.name; }
        if (a.properties) {
            for (var key in a.properties) {
                if (!a.properties.hasOwnProperty(key)) continue;
                var p = parade.property(effectIndex).property(key);
                if (!p) {
                    // Don't leave a half-configured effect behind.
                    parade.property(effectIndex).remove();
                    fail("Effect '" + a.effect + "' has no parameter '" + key + "'. Use inspect_layer to list parameters.");
                }
                p.setValue(a.properties[key]);
                set.push(key);
            }
        }
        var fx = parade.property(effectIndex);
        return { layer: layer.name, effect: fx.name, matchName: fx.matchName, set: set, parameters: dumpProperties(fx, 1) };
    };

    commands.inspect_layer = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer), info = describeLayer(layer);
        info.properties = dumpProperties(layer, a.depth || 3);
        return info;
    };

    commands.delete_layer = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer), name = layer.name;
        layer.remove();
        return { deleted: name, comp: comp.name };
    };

    commands.duplicate_layer = function (a) {
        var comp = findComp(a.comp), layer = findLayer(comp, a.layer).duplicate();
        if (a.name) layer.name = a.name;
        return describeLayer(layer);
    };

    commands.precompose = function (a) {
        var comp = findComp(a.comp), indices = [];
        for (var i = 0; i < a.layers.length; i++) indices.push(findLayer(comp, a.layers[i]).index);
        var newComp = comp.layers.precompose(indices, a.name, a.moveAttributes !== false);
        return describeComp(newComp);
    };

    commands.import_file = function (a) {
        var f = new File(a.path);
        if (!f.exists) fail("File not found: " + a.path);
        var opts = new ImportOptions(f);
        if (a.sequence) opts.sequence = true;
        var item = app.project.importFile(opts), result = { id: item.id, name: item.name };
        if (a.name) item.name = a.name;
        if (a.addToComp !== undefined) {
            var layer = findComp(a.addToComp).layers.add(item);
            result.layer = describeLayer(layer);
        }
        return result;
    };

    commands.add_comp_to_comp = function (a) {
        var target = findComp(a.comp), source = findComp(a.source);
        if (source === target) fail("Cannot nest a composition inside itself");
        var layer = target.layers.add(source);
        applyTransform(layer, a);
        return describeLayer(layer);
    };

    commands.set_comp_settings = function (a) {
        var comp = findComp(a.comp);
        if (a.name !== undefined) comp.name = a.name;
        if (a.width !== undefined) comp.width = a.width;
        if (a.height !== undefined) comp.height = a.height;
        if (a.duration !== undefined) comp.duration = a.duration;
        if (a.frameRate !== undefined) comp.frameRate = a.frameRate;
        if (a.bgColor !== undefined) comp.bgColor = a.bgColor;
        if (a.workAreaStart !== undefined) comp.workAreaStart = a.workAreaStart;
        if (a.workAreaDuration !== undefined) comp.workAreaDuration = a.workAreaDuration;
        return describeComp(comp);
    };

    commands.add_to_render_queue = function (a) {
        var comp = findComp(a.comp), rq = app.project.renderQueue.items.add(comp);
        if (a.renderSettingsTemplate) rq.applyTemplate(a.renderSettingsTemplate);
        var om = rq.outputModule(1);
        if (a.outputModuleTemplate) om.applyTemplate(a.outputModuleTemplate);
        if (a.outputPath) om.file = new File(a.outputPath);
        return {
            index: app.project.renderQueue.numItems, comp: comp.name,
            outputPath: om.file ? om.file.fsName : null,
            outputModuleTemplates: om.templates, renderSettingsTemplates: rq.templates
        };
    };

    commands.render = function () {
        var rq = app.project.renderQueue;
        if (rq.numItems === 0) fail("Render queue is empty");
        rq.render(); // blocks AE until the queue finishes
        var items = [];
        for (var i = 1; i <= rq.numItems; i++) {
            var it = rq.item(i), om = it.outputModule(1);
            items.push({ index: i, comp: it.comp.name, status: String(it.status), output: om.file ? om.file.fsName : null });
        }
        return { items: items };
    };

    commands.save_project = function (a) {
        if (a.path) app.project.save(new File(a.path));
        else if (app.project.file) app.project.save();
        else fail("Project has never been saved; pass `path`");
        return { path: app.project.file.fsName };
    };

    commands.open_project = function (a) {
        var f = new File(a.path);
        if (!f.exists) fail("File not found: " + a.path);
        if (app.project.dirty && !a.discardChanges) fail("Current project has unsaved changes. Save it first or pass discardChanges: true.");
        app.open(f);
        return commands.get_project_info({});
    };

    commands.run_script = function (a) {
        if (!state.allowRawScript) fail("Raw ExtendScript is disabled in the AE-MCP-Bridge panel. Tick 'Allow raw ExtendScript' to enable it.");
        // Wrapped in a function so `return` works; the script's return value is sent back.
        var fn = new Function("Json", a.code);
        return fn(Json);
    };

    // ------------------------------------------------------------------ bridge loop

    var state = {
        folder: app.settings.haveSetting(SETTINGS_SECTION, "folder") ? app.settings.getSetting(SETTINGS_SECTION, "folder") : Folder.myDocuments.fsName + "/ae-mcp-bridge",
        allowRawScript: app.settings.haveSetting(SETTINGS_SECTION, "allowRawScript") && app.settings.getSetting(SETTINGS_SECTION, "allowRawScript") === "true",
        running: false, taskId: null, ui: null
    };

    function log(msg) {
        if (!state.ui) return;
        var t = new Date(), stamp = ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2) + ":" + ("0" + t.getSeconds()).slice(-2);
        var list = state.ui.log;
        list.add("item", stamp + "  " + msg, 0);
        while (list.items.length > 200) list.remove(list.items.length - 1);
    }

    function readText(file) {
        file.encoding = "UTF-8";
        if (!file.open("r")) fail("Cannot read " + file.fsName);
        var s = file.read();
        file.close();
        return s;
    }

    function writeAtomic(folder, name, text) {
        var tmp = new File(folder.fsName + "/" + name + ".tmp");
        tmp.encoding = "UTF-8";
        tmp.lineFeed = "Unix";
        if (!tmp.open("w")) fail("Cannot write " + tmp.fsName + " — enable 'Allow Scripts to Write Files and Access Network'");
        tmp.write(text);
        tmp.close();
        var dest = new File(folder.fsName + "/" + name);
        if (dest.exists) dest.remove();
        tmp.rename(name);
    }

    function handle(file, folder) {
        var id = file.name.replace(/\.cmd\.json$/, ""), response;
        var raw = readText(file);
        file.remove(); // consume before running so a crash can't replay it
        try {
            var req = Json.parse(raw), fn = commands.hasOwnProperty(req.command) ? commands[req.command] : null;
            if (!fn) fail("Unknown command: " + req.command);
            app.beginUndoGroup("MCP: " + req.command);
            try { response = { id: id, ok: true, result: fn(req.args || {}) }; }
            finally { app.endUndoGroup(); }
            log("ok   " + req.command);
        } catch (e) {
            response = { id: id, ok: false, error: String(e.message || e) + (e.line ? " (line " + e.line + ")" : "") };
            log("ERR  " + response.error);
        }
        writeAtomic(folder, id + ".res.json", Json.stringify(response));
    }

    $.global.AEMCP_poll = function () {
        if (!state.running) return;
        var folder = new Folder(state.folder);
        if (!folder.exists) folder.create();
        var files = folder.getFiles("*.cmd.json");
        files.sort(function (x, y) { return x.name < y.name ? -1 : 1; });
        for (var i = 0; i < files.length; i++) {
            try { handle(files[i], folder); } catch (e) { log("ERR  " + e.message); }
        }
    };

    function start() {
        if (state.running) return;
        state.running = true;
        state.taskId = app.scheduleTask("AEMCP_poll()", POLL_MS, true);
        log("Listening on " + state.folder);
        if (state.ui) { state.ui.status.text = "● Listening"; state.ui.toggle.text = "Stop"; }
    }

    function stop() {
        if (!state.running) return;
        state.running = false;
        if (state.taskId !== null) app.cancelTask(state.taskId);
        state.taskId = null;
        log("Stopped");
        if (state.ui) { state.ui.status.text = "○ Stopped"; state.ui.toggle.text = "Start"; }
    }

    // ------------------------------------------------------------------ UI

    function buildUI(host) {
        var win = host instanceof Panel ? host : new Window("palette", "AE-MCP-Bridge", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];

        var head = win.add("group");
        var status = head.add("statictext", undefined, "○ Stopped");
        status.preferredSize.width = 110;
        var toggle = head.add("button", undefined, "Start");
        head.add("statictext", undefined, "v" + VERSION);

        var folderRow = win.add("group");
        folderRow.add("statictext", undefined, "Folder:");
        var folderText = folderRow.add("edittext", undefined, state.folder);
        folderText.alignment = ["fill", "center"];
        folderText.preferredSize.width = 220;
        var browse = folderRow.add("button", undefined, "…");
        browse.preferredSize.width = 30;

        var allow = win.add("checkbox", undefined, "Allow raw ExtendScript (run_script)");
        allow.value = state.allowRawScript;

        var list = win.add("listbox", undefined, [], { multiselect: false });
        list.preferredSize.height = 160;
        list.alignment = ["fill", "fill"];

        state.ui = { status: status, toggle: toggle, log: list };

        toggle.onClick = function () { if (state.running) stop(); else start(); };
        function setFolder(path) {
            state.folder = path;
            folderText.text = path;
            app.settings.saveSetting(SETTINGS_SECTION, "folder", path);
            if (state.running) { stop(); start(); }
        }
        folderText.onChange = function () { setFolder(folderText.text); };
        browse.onClick = function () { var f = Folder.selectDialog("Bridge folder"); if (f) setFolder(f.fsName); };
        allow.onClick = function () {
            state.allowRawScript = allow.value;
            app.settings.saveSetting(SETTINGS_SECTION, "allowRawScript", String(allow.value));
            log("Raw ExtendScript " + (allow.value ? "ENABLED" : "disabled"));
        };

        win.onResizing = win.onResize = function () { this.layout.resize(); };
        win.layout.layout(true);
        if (win instanceof Window) { win.center(); win.show(); }
        return win;
    }

    if (!app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY")) {
        alert("AE-MCP-Bridge needs Settings > Scripting & Expressions > 'Allow Scripts to Write Files and Access Network' enabled.");
    }

    buildUI(thisObj);
    start();
}(this));
