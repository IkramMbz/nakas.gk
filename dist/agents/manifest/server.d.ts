import type { ServerTool, WriteTool } from "../../server/types.js";
/** Folder name of the locked agent in `devkit/agents/`. */
export declare const ICON_AGENT = "manifest";
/** `GET /alfred`: source images + session token (only when this page may write). */
export declare const alfredTool: ServerTool;
/**
 * `POST /alfred`: runs `icon-forge` on ONE image of the source folder and writes the result
 * in a NEW `nakas-manifest-<date>` folder. The request carries only an image name, checked
 * against the server's own listing; paths, folder name and options never come from it.
 */
export declare const alfredWriteTool: WriteTool;
//# sourceMappingURL=server.d.ts.map