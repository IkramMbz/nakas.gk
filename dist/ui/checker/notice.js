import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Status message (error, lost connection, partial results) with optional retry. */
export function Notice({ message, tone = "warning", onRetry }) {
    return (_jsxs("div", { className: "nakas-notice", "data-tone": tone, role: tone === "error" ? "alert" : "status", children: [_jsx("p", { className: "nakas-text nakas-text-sm", children: message }), onRetry && (_jsx("button", { type: "button", onClick: onRetry, children: "R\u00E9essayer" }))] }));
}
//# sourceMappingURL=notice.js.map