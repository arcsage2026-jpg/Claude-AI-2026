/** Default host:port for the CEP bridge panel running inside After Effects. */
export const DEFAULT_BRIDGE_HOST = "127.0.0.1";
export const DEFAULT_BRIDGE_PORT = 39843;

export function getBridgeBaseUrl(): string {
  const host = process.env.AE_BRIDGE_HOST || DEFAULT_BRIDGE_HOST;
  const port = process.env.AE_BRIDGE_PORT || String(DEFAULT_BRIDGE_PORT);
  return `http://${host}:${port}`;
}

/** Timeout for a single ExtendScript round-trip. Renders can legitimately run long,
 * so render-triggering tools pass their own longer timeout; everything else uses this. */
export const DEFAULT_EVAL_TIMEOUT_MS = 20_000;

/** Maximum characters returned in a single tool response before truncation. */
export const CHARACTER_LIMIT = 25_000;
