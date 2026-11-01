import type { SeoCheckResult } from "../types.js";
export declare const success: (message: string) => SeoCheckResult;
export declare const warning: (message: string) => SeoCheckResult;
export declare const failure: (message: string) => SeoCheckResult;
export declare const info: (message: string) => SeoCheckResult;
/** Result from a list of warnings: `warning` if any, else `success`. */
export declare const fromWarnings: (warnings: readonly string[], okMessage: string) => SeoCheckResult;
//# sourceMappingURL=result.d.ts.map