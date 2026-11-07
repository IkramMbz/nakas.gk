import { type ComponentType } from "react";
import type { Nakas } from "../../core/nakas.js";
import { type NakasId } from "../../core/team.js";
export interface PanelProps {
    /** The panel is visible: the only time a tool should work. */
    active: boolean;
}
export default function PanelContent({ nakas, active, Tool, onClose }: {
    nakas: Nakas<NakasId>;
    active: boolean;
    Tool: ComponentType<PanelProps> | null;
    onClose: () => void;
}): import("react").JSX.Element;
//# sourceMappingURL=panel-content.d.ts.map