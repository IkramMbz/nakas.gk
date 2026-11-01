import type { SeoCheckResult } from "../types.js";

export const success = (message: string): SeoCheckResult => ({ status: "success", message });
export const warning = (message: string): SeoCheckResult => ({ status: "warning", message });
export const failure = (message: string): SeoCheckResult => ({ status: "error", message });
export const info = (message: string): SeoCheckResult => ({ status: "info", message });

/** Result from a list of warnings: `warning` if any, else `success`. */
export const fromWarnings = (warnings: readonly string[], okMessage: string): SeoCheckResult =>
    warnings.length > 0 ? warning(warnings.join("; ")) : success(okMessage);
