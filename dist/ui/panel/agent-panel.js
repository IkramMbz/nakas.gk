import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { avatarSrc } from "../../core/avatar.js";
import { TEAM } from "../../core/team.js";
import { EyeIcon } from "../icons.js";
import { getSkill } from "../skills.js";
import SkillView from "./skill-view.js";
/** Keeps the last open Nakas so content stays visible during the closing animation. */
function useRetained(value) {
    const [kept, setKept] = useState(value);
    if (value !== undefined && value !== kept)
        setKept(value);
    return kept;
}
function PanelContent({ nakas, active, Tool, onClose }) {
    const [showSkill, setShowSkill] = useState(false);
    const skill = nakas.skill ? getSkill(nakas.skill) : undefined;
    const index = TEAM.findIndex((t) => t.id === nakas.id);
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "nakas-panel-head", children: [_jsx("img", { src: avatarSrc(nakas, index), alt: "", width: 56, height: 56 }), _jsxs("div", { className: "nakas-panel-info", children: [_jsxs("div", { className: "nakas-panel-title", children: [_jsx("b", { className: "nakas-text nakas-text-xl", children: nakas.name }), _jsx("small", { className: "nakas-text nakas-text-sm", children: nakas.role })] }), skill && (_jsxs("button", { type: "button", className: "nakas-button", "data-active": showSkill ? "true" : undefined, "aria-pressed": showSkill, onClick: () => setShowSkill((v) => !v), children: [_jsx(EyeIcon, {}), "Skills"] }))] }), _jsx("button", { type: "button", className: "nakas-close", "aria-label": "Fermer", onClick: onClose, children: "\u2715" })] }), _jsx("div", { className: "nakas-panel-body", children: showSkill && skill ? (_jsx(SkillView, { skill: skill })) : Tool ? (_jsx(Tool, { active: active })) : (_jsx("p", { className: "nakas-text nakas-text-md", children: "Ce Nakas ne dispose pas encore d'outils." })) }, showSkill ? "skill" : "tool")] }));
}
export default function AgentPanel({ nakas, panels, onClose }) {
    const shown = useRetained(nakas);
    return (_jsx("aside", { className: "nakas-panel", "data-open": nakas ? "true" : "false", inert: !nakas, "aria-label": shown?.name ?? "Nakas", children: shown && (_jsx(PanelContent, { nakas: shown, active: nakas !== undefined, Tool: panels[shown.id], onClose: onClose }, shown.id)) }));
}
//# sourceMappingURL=agent-panel.js.map