export interface NakasServerOptions {
    /** Root of the analyzed project. Default: dev server working directory. */
    root?: string;
    /** Refuses to run agents without strong network isolation (Linux + `unshare`). */
    strict?: boolean;
    imports?: {
        /** Folders to analyze, relative to `root`. Default: `["src"]` if it exists, else everything. */
        dirs?: readonly string[];
    };
}

export interface ToolContext {
    root: string;
    options: NakasServerOptions;
    /** Bypasses the cache ("Rescan" button). */
    force: boolean;
}

/** A server tool = a `GET {endpoint}/<name>` route returning JSON. */
export type ServerTool = (context: ToolContext) => Promise<unknown>;

export interface ApiRequest {
    method: string;
    /** Path + query (`/api/nakas/imports?force=1`) or absolute URL. */
    url: string;
    host?: string | undefined;
    origin?: string | undefined;
}

export interface ApiResponse {
    status: number;
    body: unknown;
    headers: Record<string, string>;
}
