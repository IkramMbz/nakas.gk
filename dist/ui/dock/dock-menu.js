import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { hasContent } from "./utils.js";
export default function DockMenu({ id, label, items, search, onPick }) {
    const [query, setQuery] = useState("");
    const input = useRef(null);
    const needle = query.trim().toLowerCase();
    const matches = items.filter((x) => x.label.toLowerCase().includes(needle));
    useEffect(() => {
        input.current?.focus();
    }, []);
    return (_jsxs("section", { className: "nakas-dock-menu", id: id, "aria-label": label, children: [search && (_jsx("input", { ref: input, type: "search", value: query, placeholder: "Rechercher un Nakas\u2026", "aria-label": "Rechercher un Nakas", onChange: (e) => setQuery(e.target.value) })), matches.map((i) => (_jsxs("button", { type: "button", disabled: i.disabled, onClick: () => onPick(i), children: [_jsx("span", { className: "nakas-dock-ico", children: i.img }), _jsx("b", { children: i.label }), hasContent(i.badge) && _jsx("small", { children: i.badge })] }, i.id))), matches.length === 0 && (_jsx("p", { className: "nakas-text nakas-text-sm", children: "Aucun Nakas trouv\u00E9." }))] }));
}
//# sourceMappingURL=dock-menu.js.map