import { type IncomingMessage, type ServerResponse } from "node:http";
import type { NakasServerOptions } from "./types.js";
type Next = (error?: unknown) => void;
export type NodeMiddleware = (req: IncomingMessage, res: ServerResponse, next?: Next) => void;
/** Node middleware (Connect, Express, `http`): `app.use("/api/nakas", createNakasMiddleware())`. */
export declare function createNakasMiddleware(options?: NakasServerOptions): NodeMiddleware;
/** Subset of the Vite server used by the plugin (avoids depending on Vite types). */
interface ViteLikeServer {
    config: {
        root: string;
    };
    middlewares: {
        use(path: string, handler: NodeMiddleware): void;
    };
}
export interface NakasPluginOptions extends NakasServerOptions {
    /** Middleware mount path. Default: `/api/nakas`. */
    endpoint?: string;
}
/**
 * Vite plugin (Vite, Astro, SvelteKit, Nuxt, TanStack Start…): `plugins: [nakas()]`.
 * Absent from production builds (`apply: "serve"`).
 */
export declare function nakas(options?: NakasPluginOptions): {
    name: string;
    apply: "serve";
    configureServer(server: ViteLikeServer): void;
};
export interface StandaloneOptions extends NakasServerOptions {
    /** Default: 4321. `0` = any free port. */
    port?: number;
    /** Loopback address only. Default: `127.0.0.1`. */
    host?: string;
}
export interface StandaloneServer {
    url: string;
    close(): Promise<void>;
}
/**
 * Standalone server for projects without server integration (Angular CLI, Vue CLI, static HTML…).
 * Listens on loopback only, checks `Host` and `Origin`, allows local CORS.
 */
export declare function startNakasServer(options?: StandaloneOptions): Promise<StandaloneServer>;
export {};
//# sourceMappingURL=node.d.ts.map