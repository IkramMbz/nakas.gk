import type { ServerTool } from "../server/types.js";
/**
 * Server tool registry: one agent = one entry. Adding a server-side agent only touches
 * this table (transport, production guard and adapters are shared).
 */
export declare const SERVER_TOOLS: Readonly<Record<string, ServerTool>>;
//# sourceMappingURL=tools.server.d.ts.map