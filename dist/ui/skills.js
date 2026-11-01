import { SKILLS } from "../agents/skills.generated.js";
/** Content of the SKILL.md with this name (front matter `name:`), or `undefined`. */
export function getSkill(name) {
    return Object.hasOwn(SKILLS, name) ? SKILLS[name] : undefined;
}
//# sourceMappingURL=skills.js.map