import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { evalInAfterEffects, AeScriptError, AeBridgeError } from "../aeBridge.js";
import { PRELUDE } from "../extendscript.js";

function errorContent(error: unknown) {
  const text =
    error instanceof AeBridgeError || error instanceof AeScriptError
      ? `Error: ${error.message}`
      : `Error: Unexpected failure talking to After Effects: ${error instanceof Error ? error.message : String(error)}`;
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

export function registerRawTools(server: McpServer): void {
  const RunExtendScriptInput = z
    .object({
      script: z
        .string()
        .min(1)
        .max(20000)
        .describe(
          "Raw ExtendScript (ES3, After Effects scripting DOM) statements to run inside After Effects. This is an expression/statement sequence, not a full self-contained script — write it as you would the body of a function that should end by returning a JSON-serializable value, e.g. `var c = app.project.activeItem; return c.name;`."
        ),
      timeoutSeconds: z.number().positive().max(600).default(20).describe("How long to wait for the script to finish, in seconds.")
    })
    .strict();

  server.registerTool(
    "ae_run_extendscript",
    {
      title: "Run Raw ExtendScript in After Effects",
      description: `Escape hatch for anything the other ae_* tools don't cover: runs arbitrary ExtendScript against the After Effects scripting DOM (https://ae-scripting.docsforadobe.dev/) and returns whatever your script returns, JSON-encoded.

Prefer the specific ae_* tools (ae_create_composition, ae_add_text_layer, etc.) when one exists — they validate their inputs and give clearer errors. Use this tool for expression controllers, effects/properties not otherwise exposed, masks, markers, or any DOM feature this server doesn't wrap yet.

The shared lookup helpers used by every other ae_* tool are available to your script too: $$findComp(ref)/$$requireComp(ref), $$findLayer(comp, ref)/$$requireLayer(comp, ref), $$findItem(ref)/$$requireItem(ref) (any project item, not just comps), $$layerTypeOf(layer), $$compSummary(comp), $$layerSummary(layer, index), and $$rqItemSummary(item, index) — each "ref" matches by exact name or numeric ID, same as the "comp"/"layer" arguments elsewhere.

Args:
  - script (string): ExtendScript statements; end with a "return <value>" of whatever you want back (must be JSON-serializable — numbers, strings, booleans, plain arrays/objects; not AE objects like Layer or CompItem directly)
  - timeoutSeconds (number): Default 20

Returns: whatever your script returned, as JSON.

Error Handling:
  - Returns "Error: <message> (line N)" if the script throws — the line number is relative to your script text, useful for debugging
  - A script that runs but returns something non-JSON-serializable (like a raw AE object) throws a message saying so; pull out the specific fields you need instead`,
      inputSchema: RunExtendScriptInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true }
    },
    async ({ script, timeoutSeconds }) => {
      try {
        const data = await evalInAfterEffects<unknown>(buildRawScript(script), timeoutSeconds * 1000);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { result: data } };
      } catch (error) {
        return errorContent(error);
      }
    }
  );
}

function buildRawScript(userScript: string): string {
  return `${PRELUDE}
(function () {
  try {
    var $$userResult = (function () {
${userScript}
    })();
    return $$ok($$userResult);
  } catch (e) {
    return $$err(e);
  }
})();`;
}
