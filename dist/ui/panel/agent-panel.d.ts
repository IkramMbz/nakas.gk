import { type ComponentType } from "react";
import type { Nakas } from "../../core/nakas.js";
import { type NakasId } from "../../core/team.js";
export interface PanelProps {
    /** The panel is visible: the only time a tool should work. */
    active: boolean;
}
interface Props {
    nakas: Nakas<NakasId> | undefined;
    panels: Readonly<Record<NakasId, ComponentType<PanelProps> | null>>;
    onClose: () => void;
}
export default function AgentPanel({ nakas, panels, onClose }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=agent-panel.d.ts.map