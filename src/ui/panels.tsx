import type { ComponentType } from "react";

import ImportPanel from "../agents/imports/import-panel.js";
import SeoPanel from "../agents/seo/seo-panel.js";
import type { NakasId } from "../core/team.js";
import type { PanelProps } from "./panel/agent-panel.js";

/**
 * Tool shown in each Nakas's panel. `Record<NakasId, …>`: adding a Nakas to the team
 * without choosing its tool (or `null`) does not compile.
 */
export const PANELS: Readonly<Record<NakasId, ComponentType<PanelProps> | null>> = {
    amalia: ImportPanel,
    l: SeoPanel,
    bob: null
};
