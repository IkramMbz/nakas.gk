import type { DockItem, DockProps } from "./types.js";
export type { DockItem, DockProps };
interface Props extends DockProps {
    minimizedItem?: DockItem;
    onClose?: () => void;
}
export default function Dock({ items, minimizedItem, onClose, maxWidth, imgSize, gap, magnification, magnificationScale, label, overflowLabel, searchable, searchThreshold }: Props): import("react").JSX.Element;
//# sourceMappingURL=dock.d.ts.map