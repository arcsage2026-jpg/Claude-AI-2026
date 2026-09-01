import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { evalInAfterEffects, AeScriptError, AeBridgeError } from "../aeBridge.js";
import { buildScript, esLiteral } from "../extendscript.js";
import type { RenderQueueItemStatus } from "../types.js";
import { COMP_REF_DESC } from "./composition.js";

function errorContent(error: unknown) {
  const text =
    error instanceof AeBridgeError || error instanceof AeScriptError
      ? `Error: ${error.message}`
      : `Error: Unexpected failure talking to After Effects: ${error instanceof Error ? error.message : String(error)}`;
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

export function registerRenderTools(server: McpServer): void {
  const AddToRenderQueueInput = z
    .object({
      comp: z.string().min(1).describe(COMP_REF_DESC),
      outputPath: z.string().min(1).describe("Absolute filesystem path for the rendered output file, including extension (e.g. '/Users/me/out/report.mp4')."),
      renderSettingsTemplate: z
        .string()
        .optional()
        .describe("Name of an existing Render Settings template (Edit > Templates > Render Settings in AE) to apply. Omit to use the queue item's default."),
      outputModuleTemplate: z
        .string()
        .optional()
        .describe("Name of an existing Output Module template (Edit > Templates > Output Module in AE) to apply. Omit to use the queue item's default — on a fresh AE install this is typically a lossless format, so for office deliverables you'll usually want to pass a template name (e.g. 'H.264') here or configure one in AE first.")
    })
    .strict();

  server.registerTool(
    "ae_add_to_render_queue",
    {
      title: "Add Composition to After Effects Render Queue",
      description: `Adds a composition to the render queue with a given output file path, without starting the render. Call ae_start_render afterward to actually render.

Args:
  - comp (string): ${COMP_REF_DESC}
  - outputPath (string): Absolute output file path, including extension
  - renderSettingsTemplate (string, optional): Named Render Settings template to apply
  - outputModuleTemplate (string, optional): Named Output Module template to apply

Returns: { index: number, compName: string, status: string, outputPath: string }

Error Handling:
  - Returns "Error: ... no template named" if a template name doesn't match one saved in AE's preferences on this machine`,
      inputSchema: AddToRenderQueueInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ comp, outputPath, renderSettingsTemplate, outputModuleTemplate }) => {
      try {
        const data = await evalInAfterEffects<RenderQueueItemStatus>(
          buildScript(`
    var c = $$requireComp(${esLiteral(comp)});
    var rqItem = app.project.renderQueue.items.add(c);
    ${renderSettingsTemplate !== undefined ? `rqItem.applyTemplate(${esLiteral(renderSettingsTemplate)});` : ""}
    var om = rqItem.outputModule(1);
    ${outputModuleTemplate !== undefined ? `om.applyTemplate(${esLiteral(outputModuleTemplate)});` : ""}
    om.file = new File(${esLiteral(outputPath)});
    return $$ok($$rqItemSummary(rqItem, app.project.renderQueue.numItems));`)
        );
        return {
          content: [{ type: "text", text: `Queued "${data.compName}" -> ${data.outputPath} (status: ${data.status}).` }],
          structuredContent: data
        };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  server.registerTool(
    "ae_get_render_queue_status",
    {
      title: "Get After Effects Render Queue Status",
      description: `Lists every item currently in the render queue and its status, without starting or changing anything.

Returns: { total: number, items: [{ index, compName, status, outputPath }] }

Status is one of: WILL_CONTINUE, NEEDS_OUTPUT, UNQUEUED, QUEUED, RENDERING, USER_STOPPED, ERR_STOPPED, DONE.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async () => {
      try {
        const data = await evalInAfterEffects<{ total: number; items: RenderQueueItemStatus[] }>(
          buildScript(`
    var items = [];
    for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
      items.push($$rqItemSummary(app.project.renderQueue.item(i), i));
    }
    return $$ok({ total: items.length, items: items });`)
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const StartRenderInput = z
    .object({
      wait: z
        .boolean()
        .default(true)
        .describe(
          "If true (default), this call blocks until the entire render queue finishes and returns final statuses — use timeoutSeconds to size the wait for your render's expected length. If false, rendering is scheduled to start just after this call returns, but note that After Effects' UI and scripting engine are fully blocked for the whole render either way (this is an AE limitation, not the bridge's) — a status check made while it's rendering will itself hang until the render completes, so with wait:false only use ae_get_render_queue_status after enough time has plausibly passed."
        ),
      timeoutSeconds: z
        .number()
        .positive()
        .max(7200)
        .default(600)
        .describe("How long to wait for the render(s) to finish before giving up, in seconds. Only relevant when wait is true. Default 600 (10 minutes); increase for long batch renders.")
    })
    .strict();

  server.registerTool(
    "ae_start_render",
    {
      title: "Start After Effects Render Queue",
      description: `Starts rendering every queued (status QUEUED) item in the render queue. After Effects itself is single-threaded for this: the whole application is unresponsive for the duration of the render regardless of the "wait" option below — "wait" only controls whether this tool call blocks until it's done or returns immediately.

Args:
  - wait (boolean): Default true — block until rendering finishes or timeoutSeconds elapses
  - timeoutSeconds (number): Default 600 — how long to wait when wait is true

Returns: { total: number, items: [{ index, compName, status, outputPath }] } — final (or last-known) status of every queue item.

Error Handling:
  - Returns "Error: render queue is empty" if nothing is queued
  - Returns a timeout error if the render is still running when timeoutSeconds elapses (the render itself keeps going in AE; call ae_get_render_queue_status later to check on it)`,
      inputSchema: StartRenderInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ wait, timeoutSeconds }) => {
      try {
        const data = await evalInAfterEffects<{ total: number; items: RenderQueueItemStatus[] }>(
          buildScript(`
    var rq = app.project.renderQueue;
    var anyQueued = false;
    for (var i = 1; i <= rq.numItems; i++) {
      if (rq.item(i).status === RQItemStatus.QUEUED) { anyQueued = true; break; }
    }
    if (!anyQueued) throw new Error("render queue is empty (nothing has status QUEUED — did you call ae_add_to_render_queue first?)");
    ${wait ? `rq.render();` : `app.scheduleTask("app.project.renderQueue.render();", 100, false);`}
    var items = [];
    for (var j = 1; j <= rq.numItems; j++) items.push($$rqItemSummary(rq.item(j), j));
    return $$ok({ total: items.length, items: items });`),
          wait ? timeoutSeconds * 1000 : undefined
        );
        return {
          content: [
            {
              type: "text",
              text: wait
                ? `Render finished. Final statuses:\n${JSON.stringify(data, null, 2)}`
                : `Render scheduled to start. After Effects will be unresponsive until it completes. Check ae_get_render_queue_status later.`
            }
          ],
          structuredContent: data
        };
      } catch (error) {
        return errorContent(error);
      }
    }
  );

  const ClearRenderQueueInput = z
    .object({
      onlyDone: z
        .boolean()
        .default(false)
        .describe("If true, only removes items with status DONE, leaving queued/pending items alone. If false (default), removes every item in the queue.")
    })
    .strict();

  server.registerTool(
    "ae_clear_render_queue",
    {
      title: "Clear After Effects Render Queue",
      description: `Removes items from the render queue. Does not delete any already-rendered output files, only the queue entries themselves.

Args:
  - onlyDone (boolean): Default false (clears everything). Set true to remove only completed (DONE) items.

Returns: { removedCount: number, remaining: number }`,
      inputSchema: ClearRenderQueueInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
    },
    async ({ onlyDone }) => {
      try {
        const data = await evalInAfterEffects<{ removedCount: number; remaining: number }>(
          buildScript(`
    var rq = app.project.renderQueue;
    var removed = 0;
    for (var i = rq.numItems; i >= 1; i--) {
      var item = rq.item(i);
      if (${onlyDone} && item.status !== RQItemStatus.DONE) continue;
      item.remove();
      removed++;
    }
    return $$ok({ removedCount: removed, remaining: rq.numItems });`)
        );
        return {
          content: [{ type: "text", text: `Removed ${data.removedCount} render queue item(s); ${data.remaining} remain.` }],
          structuredContent: data
        };
      } catch (error) {
        return errorContent(error);
      }
    }
  );
}
