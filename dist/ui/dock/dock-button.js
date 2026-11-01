import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { hasContent } from "./utils.js";
export default function DockButton({ item, onPick }) {
    return (_jsxs("button", { type: "button", className: "nakas-dock-btn", "data-on": item.active ? "true" : undefined, "aria-label": item.label, "aria-pressed": item.active, title: item.title, disabled: item.disabled, "data-tip": item.label, onClick: () => onPick(item), children: [_jsx("span", { className: "nakas-dock-ico", children: item.img }), hasContent(item.badge) && _jsx("span", { className: "nakas-dock-badge", children: item.badge })] }));
}
//# sourceMappingURL=dock-button.js.map