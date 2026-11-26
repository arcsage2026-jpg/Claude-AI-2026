// File-based bridge to the AE-MCP-Bridge ScriptUI panel running inside After Effects.
//
// Protocol: for each call we write `<id>.cmd.json` into the bridge directory. The panel
// polls that directory, runs the command and writes `<id>.res.json`. Both sides write to
// a `.tmp` file first and rename it, so neither ever reads a half-written file.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export const DEFAULT_BRIDGE_DIR = path.join(homedir(), 'Documents', 'ae-mcp-bridge');

const POLL_MS = 100;

export class BridgeError extends Error {}

export class AEBridge {
  constructor({ dir = DEFAULT_BRIDGE_DIR, timeoutMs = 30000 } = {}) {
    this.dir = dir;
    this.timeoutMs = timeoutMs;
  }

  async send(command, args = {}, { timeoutMs = this.timeoutMs } = {}) {
    await mkdir(this.dir, { recursive: true });
    const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const cmdPath = path.join(this.dir, `${id}.cmd.json`);
    const resPath = path.join(this.dir, `${id}.res.json`);

    await writeFile(`${cmdPath}.tmp`, JSON.stringify({ id, command, args }), 'utf8');
    await rename(`${cmdPath}.tmp`, cmdPath);

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      let raw;
      try {
        raw = await readFile(resPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }
      await rm(resPath, { force: true });
      // ExtendScript writes files with a BOM on some platforms.
      const res = JSON.parse(raw.replace(/^﻿/, ''));
      if (!res.ok) throw new BridgeError(res.error || 'After Effects reported an unknown error');
      return res.result;
    }

    // Withdraw the command so AE doesn't run it later, after we've told the caller it failed.
    await rm(cmdPath, { force: true });
    throw new BridgeError(
      `No response from After Effects within ${Math.round(timeoutMs / 1000)}s. ` +
        'Check that After Effects is open, the "AE-MCP-Bridge" panel is open (Window > AE-MCP-Bridge.jsx) ' +
        `and its bridge folder matches ${this.dir}.`,
    );
  }
}
