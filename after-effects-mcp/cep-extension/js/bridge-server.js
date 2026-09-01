/**
 * Runs inside the "MCP Bridge" CEP panel. Requires the panel to be loaded
 * with CEP's mixed-context mode (see ../CSXS/manifest.xml's --mixed-context
 * and --enable-nodejs CEFCommandLine parameters), which merges a Node.js
 * global (require, process) into the same context as the browser globals
 * (window, CSInterface) — that's what lets this one file both host an HTTP
 * server with Node's `http` module and call csInterface.evalScript().
 *
 * Protocol (localhost only):
 *   GET  /health -> { appName, appVersion }
 *   POST /eval   { script: string } -> { result: string }
 *     "result" is whatever the ExtendScript engine's eval of `script`
 *     resolved to — the after-effects-mcp-server Node package always sends
 *     scripts that resolve to a JSON string, so it can JSON.parse "result"
 *     directly. This file does not interpret script content at all.
 */

(function () {
  var http = require("http");

  var DEFAULT_PORT = 39843;
  var csInterface = new CSInterface();

  function readBody(req, cb) {
    var chunks = [];
    req.on("data", function (chunk) {
      chunks.push(chunk);
    });
    req.on("end", function () {
      cb(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", function (err) {
      cb(null, err);
    });
  }

  function sendJson(res, statusCode, body) {
    var text = JSON.stringify(body);
    res.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(text, "utf8")
    });
    res.end(text);
  }

  function handleHealth(req, res) {
    // hostEnvironment.appVersion is a plain string on the ExtendScript side;
    // fetching it via evalScript keeps this file from hardcoding a version.
    csInterface.evalScript("app.version", function (version) {
      sendJson(res, 200, { appName: "After Effects", appVersion: version });
    });
  }

  function handleEval(req, res) {
    readBody(req, function (raw, err) {
      if (err) {
        sendJson(res, 400, { error: "Failed to read request body: " + err.message });
        return;
      }
      var payload;
      try {
        payload = JSON.parse(raw);
      } catch (parseErr) {
        sendJson(res, 400, { error: "Request body must be JSON with a 'script' field." });
        return;
      }
      if (!payload || typeof payload.script !== "string" || payload.script.length === 0) {
        sendJson(res, 400, { error: "Missing required 'script' string field." });
        return;
      }
      csInterface.evalScript(payload.script, function (result) {
        sendJson(res, 200, { result: result });
      });
    });
  }

  function requestListener(req, res) {
    if (req.method === "GET" && req.url === "/health") {
      handleHealth(req, res);
    } else if (req.method === "POST" && req.url === "/eval") {
      handleEval(req, res);
    } else {
      sendJson(res, 404, { error: "Not found. Available: GET /health, POST /eval" });
    }
  }

  function start(port) {
    var server = http.createServer(requestListener);
    server.on("error", function (err) {
      if (err.code === "EADDRINUSE") {
        window.mcpBridgeStatus = {
          running: false,
          port: port,
          error: "Port " + port + " is already in use (another MCP Bridge panel instance open?)."
        };
      } else {
        window.mcpBridgeStatus = { running: false, port: port, error: err.message };
      }
      if (typeof window.onMcpBridgeStatusChange === "function") window.onMcpBridgeStatusChange();
    });
    server.listen(port, "127.0.0.1", function () {
      window.mcpBridgeStatus = { running: true, port: port, error: null };
      if (typeof window.onMcpBridgeStatusChange === "function") window.onMcpBridgeStatusChange();
    });
    return server;
  }

  window.mcpBridgeServer = start(DEFAULT_PORT);
})();
