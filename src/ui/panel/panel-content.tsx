import { useState, type ComponentType } from "react";

import { avatarSrc } from "../../core/avatar.js";
import type { Nakas } from "../../core/nakas.js";
import { TEAM, type NakasId } from "../../core/team.js";
import { EyeIcon } from "../icons.js";
import { getSkill } from "../skills.js";
import SkillView from "./skill-view.js";

export interface PanelProps {
    /** The panel is visible: the only time a tool should work. */
    active: boolean;
}

export default function PanelContent({
    nakas,
    active,
    Tool,
    onClose
}: {
    nakas: Nakas<NakasId>;
    active: boolean;
    Tool: ComponentType<PanelProps> | null;
    onClose: () => void;
}) {
    const [showSkill, setShowSkill] = useState(false);
    const skill = nakas.skill ? getSkill(nakas.skill) : undefined;
    const index = TEAM.findIndex((t) => t.id === nakas.id);

    return (
        <>
            <header className="nakas-panel-head">
                <img src={avatarSrc(nakas, index)} alt="" width={56} height={56} />
                <div className="nakas-panel-info">
                    <div className="nakas-panel-title">
                        <b className="nakas-text nakas-text-xl">{nakas.name}</b>
                        <small className="nakas-text nakas-text-sm">{nakas.role}</small>
                    </div>
                    {skill && (
                        <button
                            type="button"
                            className="nakas-button"
                            data-active={showSkill ? "true" : undefined}
                            aria-pressed={showSkill}
                            onClick={() => setShowSkill((v) => !v)}
                        >
                            <EyeIcon />
                            Skills
                        </button>
                    )}
                </div>
                <button type="button" className="nakas-close" aria-label="Fermer" onClick={onClose}>
                    ✕
                </button>
            </header>

            <div className="nakas-panel-body" key={showSkill ? "skill" : "tool"}>
                {showSkill && skill ? (
                    <SkillView skill={skill} />
                ) : Tool ? (
                    <Tool active={active} />
                ) : (
                    <p className="nakas-text nakas-text-md">
                        Ce Nakas ne dispose pas encore d'outils.
                    </p>
                )}
            </div>
        </>
    );
}
