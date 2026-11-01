import ImportPanel from "../agents/imports/import-panel.js";
import SeoPanel from "../agents/seo/seo-panel.js";
/**
 * Tool shown in each Nakas's panel. `Record<NakasId, …>`: adding a Nakas to the team
 * without choosing its tool (or `null`) does not compile.
 */
export const PANELS = {
    amalia: ImportPanel,
    l: SeoPanel,
    bob: null
};
//# sourceMappingURL=panels.js.map