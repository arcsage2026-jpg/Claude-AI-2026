#!/usr/bin/env node
/**
 * MCP server for driving Adobe After Effects.
 *
 * After Effects has no built-in remote API, so this server talks to a
 * companion CEP panel (see ../cep-extension) that must be running inside AE.
 * The panel hosts a small localhost HTTP server and forwards scripts to AE's
 * ExtendScript engine; see aeBridge.ts and README.md for the full picture.
 *
 * Transport: stdio, since this drives a local desktop application and is
 * meant to run as a subprocess of a local MCP client.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerProjectTools } from "./tools/project.js";
import { registerCompositionTools } from "./tools/composition.js";
import { registerLayerTools } from "./tools/layer.js";
import { registerRenderTools } from "./tools/render.js";
import { registerRawTools } from "./tools/raw.js";

const server = new McpServer({
  name: "after-effects-mcp-server",
  version: "1.0.0"
});

registerProjectTools(server);
registerCompositionTools(server);
registerLayerTools(server);
registerRenderTools(server);
registerRawTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("after-effects-mcp-server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting after-effects-mcp-server:", error);
  process.exit(1);
});
