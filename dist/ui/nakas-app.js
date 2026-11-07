import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { avatarSrc } from "../core/avatar.js";
import { TEAM } from "../core/team.js";
import { ConfigProvider } from "./config-context.js";
import Dock, {} from "./dock/dock.js";
import { useDismiss } from "./dock/use-dismiss.js";
import AgentPanel from "./panel/agent-panel.js";
import { PANELS } from "./panels.js";
const DOCK_HIDDEN_KEY = "nakas-gk:dock-hidden";
const THIRTEEN_MONTHS_MS = 13 * 30 * 24 * 60 * 60 * 1000;
function readDockHidden() {
    try {
        const raw = localStorage.getItem(DOCK_HIDDEN_KEY);
        if (!raw)
            return false;
        const { hidden, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > THIRTEEN_MONTHS_MS) {
            localStorage.removeItem(DOCK_HIDDEN_KEY);
            return false;
        }
        return hidden;
    }
    catch {
        return false;
    }
}
function writeDockHidden(hidden) {
    try {
        localStorage.setItem(DOCK_HIDDEN_KEY, JSON.stringify({ hidden, timestamp: Date.now() }));
    }
    catch {
        // storage indisponible — état gardé en mémoire pour la session
    }
}
export default function NakasApp({ config }) {
    const [openId, setOpenId] = useState(null);
    const [minimizedId, setMinimizedId] = useState(null);
    const [dockHidden, setDockHidden] = useState(readDockHidden);
    const root = useRef(null);
    useDismiss(openId !== null, root, () => setOpenId(null));
    useEffect(() => {
        writeDockHidden(dockHidden);
    }, [dockHidden]);
    const items = useMemo(() => TEAM.map((nakas, index) => ({
        id: nakas.id,
        label: nakas.name,
        title: `${nakas.name} - ${nakas.role}`,
        active: nakas.id === openId,
        onClick: () => setOpenId((current) => current === nakas.id ? null : nakas.id),
        img: (_jsx("img", { className: "nakas-dock-avatar", "data-active": nakas.id === openId, src: avatarSrc(nakas, index), alt: nakas.name, width: 96, height: 96 })),
    })), [openId]);
    const minimizedItem = minimizedId
        ? {
            id: minimizedId,
            label: TEAM.find((n) => n.id === minimizedId)?.name ?? "Nakas",
            title: "Restaurer le Nakas",
            active: true,
            onClick: () => {
                setOpenId(minimizedId);
                setMinimizedId(null);
            },
            img: _jsx("span", { className: "nakas-minimized-icon", children: "\u2197" }),
        }
        : undefined;
    return (_jsx(ConfigProvider, { value: config, children: _jsxs("div", { className: "nakas-root", ref: root, "data-has-open": openId !== null, children: [_jsx("div", { className: "nakas-stage", children: !dockHidden && (_jsx(Dock, { items: items, minimizedItem: minimizedItem, maxWidth: 680, imgSize: 44, onClose: () => setDockHidden(true) })) }), dockHidden && (_jsx("button", { type: "button", className: "nakas-dock-reopen", onClick: () => setDockHidden(false), "aria-label": "Afficher le Dock", title: "Afficher le Dock", children: "Nakas" })), _jsx(AgentPanel, { nakas: TEAM.find((n) => n.id === openId), panels: PANELS, onClose: () => {
                        setMinimizedId(openId);
                        setOpenId(null);
                    } })] }) }));
}
//# sourceMappingURL=nakas-app.js.map