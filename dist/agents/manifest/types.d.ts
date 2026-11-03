/** Response of `GET {endpoint}/alfred`. */
export interface AlfredStatus {
    /** Source folder, relative to the project root (e.g. `public`). */
    dir: string;
    exists: boolean;
    /** Why the folder is unusable (missing, symlink…), or `null`. */
    problem: string | null;
    images: {
        name: string;
        bytes: number;
    }[];
    /** Write routes usable from THIS page. */
    canWrite: boolean;
    /** Session token for the POST (absent when `canWrite` is false). */
    token: string | null;
    manifest: {
        name: string;
        shortName: string;
        iconsBasePath: string;
    };
}
/** Response of `POST {endpoint}/alfred`. */
export interface AlfredResult {
    ok: true;
    /** New folder, relative to the project root. */
    folder: string;
    files: string[];
    durationMs: number;
    isolation: "netns" | "best-effort";
}
export declare function isAlfredStatus(value: unknown): value is AlfredStatus;
export declare function isAlfredResult(value: unknown): value is AlfredResult;
//# sourceMappingURL=types.d.ts.map