import type { ApiRequest, NakasServerOptions } from "./types.js";
/** Header carrying the session token on write routes (custom header => CORS preflight). */
export declare const TOKEN_HEADER = "x-nakas-token";
/** Write routes receive a tiny JSON object; anything bigger is refused. */
export declare const MAX_WRITE_BODY_BYTES = 4096;
/**
 * Random token generated once per dev-server process (shared across route modules and
 * hot reloads through `globalThis`). Never written to disk, never logged.
 */
export declare function sessionToken(): string;
/** Loopback only (stricter than `isLocalHostname`: no private network, no `.local`). */
export declare function isLoopbackHostname(hostname: string): boolean;
/** `origin` is exactly one of `allowedOrigins`. */
export declare function isListedOrigin(origin: string, options: NakasServerOptions): boolean;
/** Anti DNS-rebinding: `Host` must be loopback (or the host of an explicitly listed origin). */
export declare function isAllowedHost(host: string | undefined, options: NakasServerOptions): boolean;
/**
 * Whether the session token may be handed to this GET request. A browser page that is not
 * the app itself must never be able to read it (cross-origin reads only succeed when CORS
 * echoes the origin, so a foreign `Origin` => no token).
 */
export declare function canIssueToken(req: ApiRequest, options: NakasServerOptions): boolean;
export interface Denied {
    status: number;
    error: string;
}
/**
 * Every condition a WRITE (POST) request must meet, in order. Returns `null` when allowed.
 *  1. `Host` is loopback             (DNS rebinding)
 *  2. `Origin` present, same origin or listed (CSRF from another site or another local port)
 *  3. `Sec-Fetch-Site: same-origin`  (when not a listed origin)
 *  4. `Content-Type: application/json` (no form post, forces preflight cross-origin)
 *  5. session token                  (constant-time comparison)
 */
export declare function checkWriteRequest(req: ApiRequest, options: NakasServerOptions): Denied | null;
//# sourceMappingURL=security.d.ts.map