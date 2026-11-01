import { useEffect, useMemo, useState } from "react";

import type { DockItem } from "./types.js";

const VIEWPORT_MARGIN = 24;
const DOCK_PADDING = 20;

/** Splits items between the dock and the "+" menu based on available width. */
export function useDockLayout(
    items: readonly DockItem[],
    maxWidth: number,
    size: number,
    gap: number
) {
    const [viewport, setViewport] = useState(() =>
        typeof window === "undefined" ? maxWidth + VIEWPORT_MARGIN : window.innerWidth
    );

    useEffect(() => {
        const onResize = (): void => setViewport(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return useMemo(() => {
        const unique = items.filter((x, i) => x.id && items.findIndex((y) => y.id === x.id) === i);
        const available = Math.min(maxWidth, viewport - VIEWPORT_MARGIN) - DOCK_PADDING + gap;
        const slots = Math.max(1, Math.floor(available / (size + gap)));
        const over = unique.length > slots;
        return {
            over,
            shown: over ? unique.slice(0, slots - 1) : unique,
            hidden: over ? unique.slice(slots - 1) : []
        };
    }, [items, maxWidth, viewport, size, gap]);
}
