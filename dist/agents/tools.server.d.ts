import type { ServerTool, WriteTool } from "../server/types.js";
/**
 * Server tool registry: one agent = one entry. Adding a server-side agent only touches
 * this table (transport, production guard and adapters are shared).
 */
export declare const SERVER_TOOLS: Readonly<Record<string, ServerTool>>;
/**
 * Write routes (`POST`): kept apart from the read tools on purpose. Each one goes through
 * `checkWriteRequest` (Host, Origin, Content-Type, session token) before it runs.
 */
export declare const WRITE_TOOLS: Readonly<Record<string, WriteTool>>;
//# sourceMappingURL=tools.server.d.ts.map