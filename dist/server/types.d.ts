export interface NakasServerOptions {
    /** Root of the analyzed project. Default: dev server working directory. */
    root?: string;
    /** Refuses to run agents without strong network isolation (Linux + `unshare`). */
    strict?: boolean;
    imports?: {
        /** Folders to analyze, relative to `root`. Default: `["src"]` if it exists, else everything. */
        dirs?: readonly string[];
    };
    /** Alfred Pennyworth: `manifest.json` content and icon paths. All optional. */
    manifest?: ManifestOptions;
    /**
     * Exact origins (`"http://localhost:4200"`) allowed to call WRITE routes from another
     * origin. Needed only with the standalone server (`nakas serve`), where the app and the
     * API live on different ports. Empty by default: write routes are same-origin only.
     */
    allowedOrigins?: readonly string[];
}
export interface ManifestOptions {
    /** Folder holding the source PNGs, relative to `root`. Default: `"public"`. */
    publicDir?: string;
    /** Default: name of the project folder. */
    name?: string;
    /** Default: `name`. */
    shortName?: string;
    description?: string;
    /** BCP 47 tag. Default: `"fr-FR"`. */
    lang?: string;
    dir?: "ltr" | "rtl" | "auto";
    startUrl?: string;
    scope?: string;
    display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
    orientation?: "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";
    /** `#rgb`, `#rrggbb` or `#rrggbbaa`. Default: `"#ffffff"`. */
    themeColor?: string;
    backgroundColor?: string;
    /** URL prefix of the icons in `manifest.json`. Default: `"/manifest"`. */
    iconsBasePath?: string;
}
export interface ToolContext {
    root: string;
    options: NakasServerOptions;
    /** Bypasses the cache ("Rescan" button). */
    force: boolean;
    /**
     * Session token for write routes. Only present when THIS request may use them
     * (allowed host, same origin or listed origin); `undefined` otherwise.
     */
    token?: string | undefined;
}
export interface WriteToolContext {
    root: string;
    options: NakasServerOptions;
    /** Parsed JSON body (unknown shape: the tool validates it strictly). */
    body: unknown;
}
/** A write tool = a `POST {endpoint}/<name>` route. Guarded by `checkWriteRequest`. */
export type WriteTool = (context: WriteToolContext) => Promise<unknown>;
/** A server tool = a `GET {endpoint}/<name>` route returning JSON. */
export type ServerTool = (context: ToolContext) => Promise<unknown>;
export interface ApiRequest {
    method: string;
    /** Path + query (`/api/nakas/imports?force=1`) or absolute URL. */
    url: string;
    host?: string | undefined;
    origin?: string | undefined;
    /** `Sec-Fetch-Site` header (sent by browsers). */
    fetchSite?: string | undefined;
    /** `Content-Type` header. */
    contentType?: string | undefined;
    /** `X-Nakas-Token` header. */
    token?: string | undefined;
    /** Raw body (POST), already capped by the adapter. */
    body?: string | undefined;
    /** The adapter stopped reading: the body exceeds `MAX_WRITE_BODY_BYTES`. */
    bodyTooLarge?: boolean | undefined;
}
export interface ApiResponse {
    status: number;
    body: unknown;
    headers: Record<string, string>;
}
//# sourceMappingURL=types.d.ts.map