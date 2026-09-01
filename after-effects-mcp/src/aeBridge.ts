import { getBridgeBaseUrl, DEFAULT_EVAL_TIMEOUT_MS } from "./constants.js";
import type { AeResult } from "./types.js";

/**
 * Thin HTTP client for the companion CEP panel's local bridge server.
 *
 * After Effects has no first-class remote API, so this project follows the
 * standard CEP pattern: a small panel (cep-extension/) runs inside AE, hosts
 * a localhost HTTP server via CEP's embedded Node engine, and forwards
 * incoming scripts to AE's ExtendScript engine via CSInterface.evalScript.
 * This module is the Node-side half of that bridge.
 */

export class AeBridgeError extends Error {}
export class AeScriptError extends Error {}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getBridgeBaseUrl()}${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AeBridgeError(
        `Bridge panel responded with HTTP ${response.status}: ${text || response.statusText}`
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof AeBridgeError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AeBridgeError(
        `Timed out after ${timeoutMs}ms waiting for the After Effects bridge panel to respond. ` +
          `Long renders should be started with ae_start_render's "wait: false" option and polled with ae_get_render_queue_status.`
      );
    }
    const cause = error instanceof Error ? error.message : String(error);
    throw new AeBridgeError(
      `Could not reach the After Effects bridge panel at ${getBridgeBaseUrl()} (${cause}). ` +
        `Make sure After Effects is running, the "MCP Bridge" CEP panel (Window > Extensions) is open, ` +
        `and AE_BRIDGE_PORT matches the port shown in that panel.`
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Checks whether the bridge panel is reachable and returns its reported AE version. */
export async function pingBridge(): Promise<{ appVersion: string; appName: string }> {
  return request<{ appVersion: string; appName: string }>("GET", "/health", undefined, 5_000);
}

/**
 * Sends an ExtendScript snippet to the bridge panel for evaluation inside After Effects.
 *
 * `body` must be an *expression or statement block* that ultimately returns a JSON
 * string via the shared `$$ok` / `$$err` helpers injected by `wrapScript` in
 * extendscript.ts. Callers should build scripts with `buildScript`, not call this
 * directly with hand-rolled ExtendScript.
 */
export async function evalInAfterEffects<T>(
  script: string,
  timeoutMs: number = DEFAULT_EVAL_TIMEOUT_MS
): Promise<T> {
  const { result } = await request<{ result: string }>("POST", "/eval", { script }, timeoutMs);

  let parsed: AeResult<T>;
  try {
    parsed = JSON.parse(result) as AeResult<T>;
  } catch {
    throw new AeScriptError(
      `After Effects returned a non-JSON response, which usually means the script threw ` +
        `before reaching its own try/catch, or evalScript itself failed. Raw response: ${result.slice(0, 500)}`
    );
  }

  if (!parsed.ok) {
    throw new AeScriptError(
      parsed.line !== undefined ? `${parsed.error} (line ${parsed.line})` : parsed.error
    );
  }
  return parsed.data;
}
