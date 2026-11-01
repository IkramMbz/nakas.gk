import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusDot } from "./status-dot.js";
/** Shared findings list: status dot, title, then details. */
export function CheckList({ items }) {
    return (_jsx("ul", { className: "nakas-checklist", children: items.map((item) => (_jsxs("li", { className: "nakas-checklist-item", children: [_jsx(StatusDot, { status: item.status }), _jsxs("div", { children: [_jsx("p", { className: "nakas-checklist-title", children: item.title }), item.details.map((d) => (_jsxs("div", { className: "nakas-checklist-detail", children: [_jsxs("p", { className: "nakas-text nakas-text-sm", children: [d.label && _jsxs("b", { children: [d.label, " \u00B7 "] }), d.message] }), d.evidence && _jsx("code", { children: d.evidence }), d.hint && (_jsxs("p", { className: "nakas-text nakas-text-sm nakas-muted", children: ["\u2192 ", d.hint] }))] }, d.id)))] })] }, item.id))) }));
}
//# sourceMappingURL=check-list.js.map