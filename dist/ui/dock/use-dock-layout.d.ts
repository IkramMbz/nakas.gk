import type { DockItem } from "./types.js";
/** Splits items between the dock and the "+" menu based on available width. */
export declare function useDockLayout(items: readonly DockItem[], maxWidth: number, size: number, gap: number): {
    over: boolean;
    shown: DockItem[];
    hidden: DockItem[];
};
//# sourceMappingURL=use-dock-layout.d.ts.map