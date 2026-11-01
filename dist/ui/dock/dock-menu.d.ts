import type { DockItem } from "./types.js";
interface Props {
    id: string;
    label: string;
    items: readonly DockItem[];
    search: boolean;
    onPick: (item: DockItem) => void;
}
export default function DockMenu({ id, label, items, search, onPick }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=dock-menu.d.ts.map