import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
/** Header carrying the session token on write routes (custom header => CORS preflight). */
export const TOKEN_HEADER = "x-nakas-token";
/** Write routes receive a tiny JSON object; anything bigger is refused. */
export const MAX_WRITE_BODY_BYTES = 4096;
const SESSION_KEY = Symbol.for("nakas-gk.session-token");
const IPV4_LOOPBACK = /^127(?:\.\d{1,3}){3}$/;
const IPV6_BRACKETS = /^\[|\]$/g;
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
/**
 * Random token generated once per dev-server process (shared across route modules and
 * hot reloads through `globalThis`). Never written to disk, never logged.
 */
export function sessionToken() {
    const g = globalThis;
    g[SESSION_KEY] ??= randomBytes(32).toString("hex");
    return g[SESSION_KEY];
}
const digest = (value) => createHash("sha256").update(value).digest();
/** Constant-time comparison (both sides hashed first, so lengths always match). */
function tokenMatches(candidate) {
    return candidate !== undefined && timingSafeEqual(digest(candidate), digest(sessionToken()));
}
/** Loopback only (stricter than `isLocalHostname`: no private network, no `.local`). */
export function isLoopbackHostname(hostname) {
    const h = hostname.trim().toLowerCase().replace(IPV6_BRACKETS, "");
    return h === "localhost" || h === "::1" || h.endsWith(".localhost") || IPV4_LOOPBACK.test(h);
}
function parseUrl(value) {
    try {
        return new URL(value);
    }
    catch {
        return null;
    }
}
/** `allowedOrigins`, parsed once per request; invalid or non-http entries are dropped. */
function trustedOrigins(options) {
    return (options.allowedOrigins ?? []).flatMap((value) => {
        const url = parseUrl(value);
        return url && HTTP_PROTOCOLS.has(url.protocol) ? [url] : [];
    });
}
const isTrusted = (origin, trusted) => trusted.some((entry) => entry.origin === origin.origin);
/** `Host` is loopback, or the host of an explicitly trusted origin (anti DNS-rebinding). */
function hostAllowed(host, trusted) {
    if (!host)
        return false;
    const lower = host.toLowerCase();
    const url = parseUrl(`http://${lower}`);
    if (!url)
        return false;
    return isLoopbackHostname(url.hostname) || trusted.some((entry) => entry.host === lower);
}
/** `origin` is exactly one of `allowedOrigins`. */
export function isListedOrigin(origin, options) {
    const url = parseUrl(origin);
    return url !== null && isTrusted(url, trustedOrigins(options));
}
/** Anti DNS-rebinding: `Host` must be loopback (or the host of an explicitly listed origin). */
export function isAllowedHost(host, options) {
    return hostAllowed(host, trustedOrigins(options));
}
/**
 * Whether the session token may be handed to this GET request. A browser page that is not
 * the app itself must never be able to read it (cross-origin reads only succeed when CORS
 * echoes the origin, so a foreign `Origin` => no token).
 */
export function canIssueToken(req, options) {
    const trusted = trustedOrigins(options);
    if (!hostAllowed(req.host, trusted))
        return false;
    if (req.origin === undefined)
        return req.fetchSite !== "cross-site";
    const origin = parseUrl(req.origin);
    return origin !== null && isTrusted(origin, trusted);
}
const deny = (status, error) => ({ status, error });
/**
 * Every condition a WRITE (POST) request must meet, in order. Returns `null` when allowed.
 *  1. `Host` is loopback             (DNS rebinding)
 *  2. `Origin` present, same origin or listed (CSRF from another site or another local port)
 *  3. `Sec-Fetch-Site: same-origin`  (when not a listed origin)
 *  4. `Content-Type: application/json` (no form post, forces preflight cross-origin)
 *  5. session token                  (constant-time comparison)
 */
export function checkWriteRequest(req, options) {
    const trusted = trustedOrigins(options);
    if (!hostAllowed(req.host, trusted))
        return deny(403, "Host non autorisé");
    if (!req.origin)
        return deny(403, "En-tête Origin requis");
    const origin = parseUrl(req.origin);
    if (!origin || !HTTP_PROTOCOLS.has(origin.protocol))
        return deny(403, "Origin invalide");
    if (!isTrusted(origin, trusted)) {
        if (origin.host !== (req.host ?? "").toLowerCase()) {
            return deny(403, "Origin non autorisée");
        }
        if (req.fetchSite !== undefined && req.fetchSite !== "same-origin") {
            return deny(403, "Requête inter-sites refusée");
        }
    }
    const type = (req.contentType ?? "").split(";")[0]?.trim().toLowerCase();
    if (type !== "application/json")
        return deny(415, "Content-Type application/json requis");
    if (!tokenMatches(req.token))
        return deny(403, "Jeton de session invalide");
    return null;
}
//# sourceMappingURL=security.js.map