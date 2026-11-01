export const DEFAULT_ENDPOINT = "/api/nakas";
export function resolveConfig(options = {}) {
    return {
        endpoint: (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, ""),
        contentSelector: options.contentSelector
    };
}
//# sourceMappingURL=options.js.map