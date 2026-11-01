import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useLayoutEffect, useRef, useState } from "react";
import DockButton from "./dock-button.js";
import DockMenu from "./dock-menu.js";
import { useDismiss } from "./use-dismiss.js";
import { useDockLayout } from "./use-dock-layout.js";
import { arrowNav } from "./utils.js";
export default function Dock({ items, maxWidth = 680, imgSize = 44, gap = 8, magnification = true, magnificationScale = 1.12, label = "Nakas", overflowLabel = "Autres Nakas", searchable = true, searchThreshold = 5 }) {
    const menuId = useId();
    const ref = useRef(null);
    const [open, setOpen] = useState(false);
    const { over, shown, hidden } = useDockLayout(items, maxWidth, imgSize, gap);
    useDismiss(open, ref, () => setOpen(false));
    const pick = (item) => {
        if (item.disabled)
            return;
        item.onClick?.();
        setOpen(false);
    };
    // Dynamic values only: the rest of the style lives in dock.css.
    useLayoutEffect(() => {
        const style = ref.current?.style;
        style?.setProperty("--nakas-dock-width", `${maxWidth}px`);
        style?.setProperty("--nakas-dock-size", `${imgSize}px`);
        style?.setProperty("--nakas-dock-gap", `${gap}px`);
        style?.setProperty("--nakas-dock-magnify", String(magnification ? magnificationScale : 1));
    }, [maxWidth, imgSize, gap, magnification, magnificationScale]);
    return (_jsxs("div", { ref: ref, className: "nakas-dock", role: "toolbar", tabIndex: -1, "aria-label": label, onKeyDown: arrowNav, children: [_jsx("div", { className: "nakas-dock-items", children: shown.map((item) => (_jsx(DockButton, { item: item, onPick: pick }, item.id))) }), over && (_jsxs("div", { className: "nakas-dock-more", children: [_jsxs("button", { type: "button", className: "nakas-dock-btn", "data-more": true, "data-tip": overflowLabel, "aria-label": `${overflowLabel}, ${hidden.length} éléments`, "aria-expanded": open, "aria-controls": open ? menuId : undefined, onClick: () => setOpen(!open), children: [_jsx("span", { className: "nakas-dock-plus", "aria-hidden": "true", children: "+" }), _jsx("span", { className: "nakas-dock-badge", "aria-hidden": "true", children: hidden.length })] }), open && (_jsx(DockMenu, { id: menuId, label: overflowLabel, items: hidden, search: searchable && hidden.length > searchThreshold, onPick: pick }))] }))] }));
}
//# sourceMappingURL=dock.js.map