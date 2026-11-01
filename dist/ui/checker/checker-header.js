import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusDot } from "./status-dot.js";
import { STATUS_LABEL } from "./types.js";
/** Shared header: colored title, subtitle, status legend and optional action. */
export function CheckerHeader({ headline, tone, subline, legend, action }) {
    return (_jsxs("header", { className: "nakas-checker-header", children: [_jsxs("div", { className: "nakas-checker-header-top", children: [_jsxs("div", { className: "nakas-checker-summary", children: [_jsx("p", { className: "nakas-text nakas-text-lg nakas-tone", "data-tone": tone, children: headline }), _jsx("p", { className: "nakas-text nakas-text-md", children: subline })] }), action && (_jsx("button", { type: "button", onClick: action.onClick, disabled: action.busy, children: action.busy ? action.busyLabel : action.label }))] }), _jsx("ul", { className: "nakas-legend", children: legend.map((status) => (_jsxs("li", { children: [_jsx(StatusDot, { status: status }), STATUS_LABEL[status]] }, status))) })] }));
}
//# sourceMappingURL=checker-header.js.map