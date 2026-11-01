import { CopyIcon } from "../icons.js";
import { useCopy } from "./use-copy.js";

/** Shows a Nakas's SKILL.md, with one-click copy. */
export default function SkillView({ skill }: { skill: string }) {
    const { copied, copy } = useCopy(skill);
    return (
        <section className="nakas-skill">
            <button
                type="button"
                className="nakas-button"
                aria-label={copied ? "Skill copié" : "Copier le skill"}
                title={copied ? "Copié !" : "Copier le skill"}
                onClick={() => void copy()}
            >
                <CopyIcon />
                {copied && <span>Copié !</span>}
            </button>
            <pre className="nakas-skill-text">{skill}</pre>
        </section>
    );
}
