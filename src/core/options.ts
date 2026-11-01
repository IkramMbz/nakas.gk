export const DEFAULT_ENDPOINT = "/api/nakas";

/** Options shared by vanilla mounting (`mountNakas`) and the React component. */
export interface NakasOptions {
    /**
     * Forces display (`true`) or disables it (`false`).
     * Default: shown only on a local host (localhost, private network).
     */
    enabled?: boolean;
    /** Base URL of the development API. Default: `/api/nakas`. */
    endpoint?: string;
    /**
     * CSS selector of the content area for the SEO audit.
     * Default: first match among `main`, `[role="main"]`, `article`, then `body`.
     */
    contentSelector?: string;
}

/** Options actually used by the UI. */
export interface NakasConfig {
    endpoint: string;
    contentSelector: string | undefined;
}

export function resolveConfig(options: NakasOptions = {}): NakasConfig {
    return {
        endpoint: (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, ""),
        contentSelector: options.contentSelector
    };
}
