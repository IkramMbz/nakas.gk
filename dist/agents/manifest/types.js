const isRecord = (v) => typeof v === "object" && v !== null;
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
export function isAlfredStatus(value) {
    if (!isRecord(value) || !isRecord(value["manifest"]))
        return false;
    const images = value["images"];
    return (typeof value["dir"] === "string" &&
        typeof value["exists"] === "boolean" &&
        (value["problem"] === null || typeof value["problem"] === "string") &&
        typeof value["canWrite"] === "boolean" &&
        (value["token"] === null || typeof value["token"] === "string") &&
        Array.isArray(images) &&
        images.every((i) => isRecord(i) && typeof i["name"] === "string" && typeof i["bytes"] === "number") &&
        typeof value["manifest"]["name"] === "string");
}
export function isAlfredResult(value) {
    return (isRecord(value) &&
        value["ok"] === true &&
        typeof value["folder"] === "string" &&
        isStringArray(value["files"]) &&
        typeof value["durationMs"] === "number" &&
        (value["isolation"] === "netns" || value["isolation"] === "best-effort"));
}
//# sourceMappingURL=types.js.map