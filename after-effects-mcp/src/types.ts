/** Envelope every ExtendScript snippet resolves to. The .jsx side always
 * catches its own errors and returns one of these two shapes as a JSON string,
 * so the Node side never has to parse "EvalScript error." or a raw stack trace. */
export interface AeOk<T> {
  ok: true;
  data: T;
}

export interface AeErr {
  ok: false;
  error: string;
  line?: number;
}

export type AeResult<T> = AeOk<T> | AeErr;

// Each of these carries `[key: string]: unknown` solely so it can be handed
// to the MCP SDK's `structuredContent` field, which is typed as an index
// signature — the named fields below are still what callers actually get.

export interface CompositionSummary {
  [key: string]: unknown;
  id: number;
  name: string;
  width: number;
  height: number;
  duration: number;
  frameRate: number;
  numLayers: number;
}

export interface LayerSummary {
  [key: string]: unknown;
  index: number;
  name: string;
  matchName: string;
  layerType: "text" | "solid" | "footage" | "shape" | "camera" | "light" | "null" | "other";
  enabled: boolean;
  startTime: number;
  inPoint: number;
  outPoint: number;
}

export interface ProjectInfo {
  [key: string]: unknown;
  path: string | null;
  file: string | null;
  bitsPerChannel: 8 | 16 | 32;
  numItems: number;
  activeCompName: string | null;
  dirty: boolean;
}

export interface RenderQueueItemStatus {
  [key: string]: unknown;
  index: number;
  compName: string;
  status: string;
  outputPath: string | null;
}
