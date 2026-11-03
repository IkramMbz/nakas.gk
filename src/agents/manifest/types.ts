/** Response of `GET {endpoint}/alfred`. */
export interface AlfredStatus {
    /** Source folder, relative to the project root (e.g. `public`). */
    dir: string;
    exists: boolean;
    /** Why the folder is unusable (missing, symlink…), or `null`. */
    problem: string | null;
    images: { name: string; bytes: number }[];
    /** Write routes usable from THIS page. */
    canWrite: boolean;
    /** Session token for the POST (absent when `canWrite` is false). */
    token: string | null;
    manifest: { name: string; shortName: string; iconsBasePath: string };
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

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");

export function isAlfredStatus(value: unknown): value is AlfredStatus {
    if (!isRecord(value) || !isRecord(value["manifest"])) return false;
    const images = value["images"];
    return (
        typeof value["dir"] === "string" &&
        typeof value["exists"] === "boolean" &&
        (value["problem"] === null || typeof value["problem"] === "string") &&
        typeof value["canWrite"] === "boolean" &&
        (value["token"] === null || typeof value["token"] === "string") &&
        Array.isArray(images) &&
        images.every(
            (i) => isRecord(i) && typeof i["name"] === "string" && typeof i["bytes"] === "number"
        ) &&
        typeof value["manifest"]["name"] === "string"
    );
}

export function isAlfredResult(value: unknown): value is AlfredResult {
    return (
        isRecord(value) &&
        value["ok"] === true &&
        typeof value["folder"] === "string" &&
        isStringArray(value["files"]) &&
        typeof value["durationMs"] === "number" &&
        (value["isolation"] === "netns" || value["isolation"] === "best-effort")
    );
}
