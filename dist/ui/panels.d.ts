import type { ComponentType } from "react";
import type { NakasId } from "../core/team.js";
import type { PanelProps } from "./panel/agent-panel.js";
/**
 * Tool shown in each Nakas's panel. `Record<NakasId, …>`: adding a Nakas to the team
 * without choosing its tool (or `null`) does not compile.
 */
export declare const PANELS: Readonly<Record<NakasId, ComponentType<PanelProps> | null>>;
//# sourceMappingURL=panels.d.ts.map