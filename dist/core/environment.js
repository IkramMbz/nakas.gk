/**
 * Environment detection WITHOUT a build tool: no `process.env`, no `import.meta.env`.
 * Only the page hostname matters.
 */
const PRIVATE_V4 = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./];
/** True for localhost, loopback, `*.localhost`, `*.local` and private networks (mobile testing). */
export function isLocalHostname(hostname) {
    const host = hostname
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, "");
    if (host === "")
        return false;
    if (host === "localhost" || host === "::1")
        return true;
    if (host.endsWith(".localhost") || host.endsWith(".local"))
        return true;
    return PRIVATE_V4.some((re) => re.test(host));
}
/** `true`/`false` force; `undefined` = automatic (local host only). */
export function resolveEnabled(enabled, hostname) {
    return enabled ?? isLocalHostname(hostname);
}
//# sourceMappingURL=environment.js.map