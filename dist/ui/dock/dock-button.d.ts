import type { DockItem } from "./types.js";
interface Props {
    item: DockItem;
    onPick: (item: DockItem) => void;
}
export default function DockButton({ item, onPick }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=dock-button.d.ts.map