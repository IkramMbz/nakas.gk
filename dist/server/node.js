import { createServer } from "node:http";
import { isLocalHostname } from "../core/environment.js";
import { DEFAULT_ENDPOINT } from "../core/options.js";
import { createNakasApi } from "./api.js";
import { isListedOrigin, MAX_WRITE_BODY_BYTES, TOKEN_HEADER } from "./security.js";
function headerOf(req, name) {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
}
/** Reads a small body: stops keeping data past the cap (the rest is drained, not stored). */
function readBody(req) {
    return new Promise((resolve) => {
        const declared = Number(headerOf(req, "content-length") ?? "0");
        const chunks = [];
        let size = 0;
        let tooLarge = Number.isFinite(declared) && declared > MAX_WRITE_BODY_BYTES;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_WRITE_BODY_BYTES)
                tooLarge = true;
            if (!tooLarge)
                chunks.push(chunk);
        });
        req.on("end", () => resolve({ text: Buffer.concat(chunks).toString("utf8"), tooLarge }));
        req.on("error", () => resolve({ text: "", tooLarge: true }));
    });
}
function hostnameOfOrigin(origin) {
    try {
        return new URL(origin).hostname;
    }
    catch {
        return "";
    }
}
async function respondWith(api, req, res, corsHeaders, origin) {
    try {
        const isPost = req.method === "POST";
        const posted = isPost ? await readBody(req) : undefined;
        const { status, body, headers } = await api.handle({
            method: req.method ?? "GET",
            url: req.url ?? "/",
            host: headerOf(req, "host"),
            origin,
            fetchSite: headerOf(req, "sec-fetch-site"),
            contentType: headerOf(req, "content-type"),
            token: headerOf(req, TOKEN_HEADER),
            body: posted?.text,
            bodyTooLarge: posted?.tooLarge
        });
        res.writeHead(status, { ...headers, ...corsHeaders });
        res.end(JSON.stringify(body));
    }
    catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erreur interne" }));
    }
}
function createMiddleware(options, cors) {
    const api = createNakasApi(options);
    return (req, res) => {
        const origin = headerOf(req, "origin");
        // Write routes: only for origins listed in `allowedOrigins` (exact match).
        const listed = origin !== undefined && isListedOrigin(origin, options);
        const corsHeaders = cors && origin && (listed || isLocalHostname(hostnameOfOrigin(origin)))
            ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
            : {};
        if (cors && req.method === "OPTIONS") {
            res.writeHead(204, {
                ...corsHeaders,
                "Access-Control-Allow-Methods": listed ? "GET, POST" : "GET",
                ...(listed
                    ? {
                        "Access-Control-Allow-Headers": `Content-Type, ${TOKEN_HEADER}`,
                        "Access-Control-Max-Age": "600"
                    }
                    : {})
            });
            res.end();
            return;
        }
        void respondWith(api, req, res, corsHeaders, origin);
    };
}
/** Node middleware (Connect, Express, `http`): `app.use("/api/nakas", createNakasMiddleware())`. */
export function createNakasMiddleware(options = {}) {
    return createMiddleware(options, false);
}
/**
 * Vite plugin (Vite, Astro, SvelteKit, Nuxt, TanStack Start…): `plugins: [nakas()]`.
 * Absent from production builds (`apply: "serve"`).
 */
export function nakas(options = {}) {
    return {
        name: "nakas-gk",
        apply: "serve",
        configureServer(server) {
            server.middlewares.use(options.endpoint ?? DEFAULT_ENDPOINT, createMiddleware({ root: server.config.root, ...options }, false));
        }
    };
}
/**
 * Standalone server for projects without server integration (Angular CLI, Vue CLI, static HTML…).
 * Listens on loopback only, checks `Host` and `Origin`, allows local CORS.
 */
export function startNakasServer(options = {}) {
    const host = options.host ?? "127.0.0.1";
    if (!["127.0.0.1", "::1", "localhost"].includes(host)) {
        return Promise.reject(new Error(`Hôte refusé : « ${host} » (boucle locale uniquement).`));
    }
    const middleware = createMiddleware({ ...options, restrictToLoopback: true }, true);
    const server = createServer((req, res) => middleware(req, res));
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port ?? 4321, host, () => {
            const address = server.address();
            if (address === null || typeof address === "string") {
                reject(new Error("Adresse d'écoute indisponible"));
                return;
            }
            const { port } = address;
            resolve({
                url: `http://${host.includes(":") ? `[${host}]` : host}:${port}`,
                close: () => new Promise((done) => {
                    server.closeAllConnections();
                    server.close(() => done());
                })
            });
        });
    });
}
//# sourceMappingURL=node.js.map