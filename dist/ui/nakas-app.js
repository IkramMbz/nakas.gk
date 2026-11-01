import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import { avatarSrc } from "../core/avatar.js";
import { TEAM } from "../core/team.js";
import { ConfigProvider } from "./config-context.js";
import Dock, {} from "./dock/dock.js";
import { useDismiss } from "./dock/use-dismiss.js";
import AgentPanel from "./panel/agent-panel.js";
import { PANELS } from "./panels.js";
/** UI root: the Nakas dock and the open Nakas's panel. */
export default function NakasApp({ config }) {
    const [openId, setOpenId] = useState(null);
    const root = useRef(null);
    useDismiss(openId !== null, root, () => setOpenId(null));
    const items = useMemo(() => TEAM.map((nakas, index) => ({
        id: nakas.id,
        label: nakas.name,
        title: `${nakas.name} - ${nakas.role}`,
        active: nakas.id === openId,
        onClick: () => setOpenId((current) => (current === nakas.id ? null : nakas.id)),
        img: (_jsx("img", { className: "nakas-dock-avatar", "data-active": nakas.id === openId, src: avatarSrc(nakas, index), alt: nakas.name, width: 96, height: 96 }))
    })), [openId]);
    return (_jsx(ConfigProvider, { value: config, children: _jsxs("div", { className: "nakas-root", ref: root, "data-has-open": openId !== null, children: [_jsx("div", { className: "nakas-stage", children: _jsx(Dock, { items: items, maxWidth: 680, imgSize: 44 }) }), _jsx(AgentPanel, { nakas: TEAM.find((n) => n.id === openId), panels: PANELS, onClose: () => setOpenId(null) })] }) }));
}
//# sourceMappingURL=nakas-app.js.map