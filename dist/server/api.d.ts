import type { ApiRequest, ApiResponse, NakasServerOptions, ServerTool, WriteTool } from "./types.js";
export interface NakasApiOptions extends NakasServerOptions {
    /**
     * Rejects requests whose `Host`/`Origin` are not local (anti DNS-rebinding / CSRF).
     * Enabled by the standalone server; unnecessary behind a dev server that already does it.
     */
    restrictToLoopback?: boolean;
    /** Tests: replaces the tool registry. */
    tools?: Readonly<Record<string, ServerTool>>;
    /** Tests: replaces the write-tool registry. */
    writeTools?: Readonly<Record<string, WriteTool>>;
}
/** API core: no framework, no `Request`, no `http`. Adapters only translate. */
export declare function createNakasApi(options?: NakasApiOptions): {
    handle(req: ApiRequest): Promise<ApiResponse>;
};
//# sourceMappingURL=api.d.ts.map