#!/usr/bin/env node
// aftereffects-mcp — MCP server exposing Adobe After Effects 2026 to Claude.
// Commands travel to AE through the AE-MCP-Bridge panel (see ae-panel/).

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

await createServer().connect(new StdioServerTransport());
