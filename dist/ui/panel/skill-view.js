import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CopyIcon } from "../icons.js";
import { useCopy } from "./use-copy.js";
/** Shows a Nakas's SKILL.md, with one-click copy. */
export default function SkillView({ skill }) {
    const { copied, copy } = useCopy(skill);
    return (_jsxs("section", { className: "nakas-skill", children: [_jsxs("button", { type: "button", className: "nakas-button", "aria-label": copied ? "Skill copié" : "Copier le skill", title: copied ? "Copié !" : "Copier le skill", onClick: () => void copy(), children: [_jsx(CopyIcon, {}), copied && _jsx("span", { children: "Copi\u00E9 !" })] }), _jsx("pre", { className: "nakas-skill-text", children: skill })] }));
}
//# sourceMappingURL=skill-view.js.map