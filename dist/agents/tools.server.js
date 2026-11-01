import { importsTool } from "./imports/server.js";
/**
 * Server tool registry: one agent = one entry. Adding a server-side agent only touches
 * this table (transport, production guard and adapters are shared).
 */
export const SERVER_TOOLS = {
    imports: importsTool
};
//# sourceMappingURL=tools.server.js.map