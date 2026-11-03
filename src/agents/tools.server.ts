import type { ServerTool, WriteTool } from "../server/types.js";
import { alfredTool, alfredWriteTool } from "./manifest/server.js";
import { importsTool } from "./imports/server.js";

/**
 * Server tool registry: one agent = one entry. Adding a server-side agent only touches
 * this table (transport, production guard and adapters are shared).
 */
export const SERVER_TOOLS: Readonly<Record<string, ServerTool>> = {
    imports: importsTool,
    manifest: alfredTool
};

/**
 * Write routes (`POST`): kept apart from the read tools on purpose. Each one goes through
 * `checkWriteRequest` (Host, Origin, Content-Type, session token) before it runs.
 */
export const WRITE_TOOLS: Readonly<Record<string, WriteTool>> = {
    manifest: alfredWriteTool
};
