import { SERVER_TOOLS } from "../agents/tools.server.js";
import { isLocalHostname } from "../core/environment.js";
import { DevkitError } from "../devkit/core/index.mjs";
import type { ApiRequest, ApiResponse, NakasServerOptions, ServerTool } from "./types.js";

const BASE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
} as const;

const STATUS_BY_CODE: Record<string, number> = {
    E_USAGE: 400,
    E_POLICY: 422,
    E_LOCK: 500,
    E_SANDBOX: 500,
    E_OUTPUT: 500,
    E_TIMEOUT: 504
};

export interface NakasApiOptions extends NakasServerOptions {
    /**
     * Rejects requests whose `Host`/`Origin` are not local (anti DNS-rebinding / CSRF).
     * Enabled by the standalone server; unnecessary behind a dev server that already does it.
     */
    restrictToLoopback?: boolean;
    /** Tests: replaces the tool registry. */
    tools?: Readonly<Record<string, ServerTool>>;
}

const reply = (status: number, body: unknown, extra: Record<string, string> = {}): ApiResponse => ({
    status,
    body,
    headers: { ...BASE_HEADERS, ...extra }
});

const hostnameOf = (hostHeader: string): string => {
    try {
        return new URL(`http://${hostHeader}`).hostname;
    } catch {
        return "";
    }
};

const originHostname = (origin: string): string => {
    try {
        return new URL(origin).hostname;
    } catch {
        return "";
    }
};

/** Last non-empty path segment, lowercased, restricted to `[a-z-]`. */
function toolName(pathname: string): string {
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return /^[a-z][a-z-]{0,39}$/.test(last) ? last : "";
}

/** API core: no framework, no `Request`, no `http`. Adapters only translate. */
export function createNakasApi(options: NakasApiOptions = {}) {
    const tools = options.tools ?? SERVER_TOOLS;

    return {
        async handle(req: ApiRequest): Promise<ApiResponse> {
            // Exposes paths and code excerpts: never in production.
            if (process.env["NODE_ENV"] === "production") {
                return reply(404, { error: "Not found" });
            }
            if (options.restrictToLoopback) {
                const hostOk = req.host === undefined || isLocalHostname(hostnameOf(req.host));
                const originOk =
                    req.origin === undefined || isLocalHostname(originHostname(req.origin));
                if (!hostOk || !originOk) return reply(403, { error: "Forbidden origin" });
            }
            if (req.method !== "GET") {
                return reply(405, { error: "Method not allowed" }, { Allow: "GET" });
            }

            const url = new URL(req.url, "http://nakas.invalid");
            const name = toolName(url.pathname);
            if (name === "health") {
                return reply(200, { ok: true, tools: Object.keys(tools) });
            }
            const tool = name && Object.hasOwn(tools, name) ? tools[name] : undefined;
            if (!tool) return reply(404, { error: `Unknown tool "${name}"` });

            try {
                const body = await tool({
                    root: options.root ?? process.cwd(),
                    options,
                    force: url.searchParams.get("force") === "1"
                });
                return reply(200, body);
            } catch (e) {
                if (e instanceof DevkitError) {
                    return reply(STATUS_BY_CODE[e.code] ?? 500, { error: e.message, code: e.code });
                }
                return reply(500, { error: e instanceof Error ? e.message : String(e) });
            }
        }
    };
}
