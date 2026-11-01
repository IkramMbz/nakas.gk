export const success = (message) => ({ status: "success", message });
export const warning = (message) => ({ status: "warning", message });
export const failure = (message) => ({ status: "error", message });
export const info = (message) => ({ status: "info", message });
/** Result from a list of warnings: `warning` if any, else `success`. */
export const fromWarnings = (warnings, okMessage) => warnings.length > 0 ? warning(warnings.join("; ")) : success(okMessage);
//# sourceMappingURL=result.js.map