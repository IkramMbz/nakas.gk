import { useId, useLayoutEffect, useRef, useState } from "react";

import DockButton from "./dock-button.js";
import DockMenu from "./dock-menu.js";
import type { DockItem, DockProps } from "./types.js";
import { useDismiss } from "./use-dismiss.js";
import { useDockLayout } from "./use-dock-layout.js";
import { arrowNav } from "./utils.js";

export type { DockItem, DockProps };

export default function Dock({
    items,
    maxWidth = 680,
    imgSize = 44,
    gap = 8,
    magnification = true,
    magnificationScale = 1.12,
    label = "Nakas",
    overflowLabel = "Autres Nakas",
    searchable = true,
    searchThreshold = 5
}: DockProps) {
    const menuId = useId();
    const ref = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const { over, shown, hidden } = useDockLayout(items, maxWidth, imgSize, gap);

    useDismiss(open, ref, () => setOpen(false));

    const pick = (item: DockItem): void => {
        if (item.disabled) return;
        item.onClick?.();
        setOpen(false);
    };

    // Dynamic values only: the rest of the style lives in dock.css.
    useLayoutEffect(() => {
        const style = ref.current?.style;
        style?.setProperty("--nakas-dock-width", `${maxWidth}px`);
        style?.setProperty("--nakas-dock-size", `${imgSize}px`);
        style?.setProperty("--nakas-dock-gap", `${gap}px`);
        style?.setProperty("--nakas-dock-magnify", String(magnification ? magnificationScale : 1));
    }, [maxWidth, imgSize, gap, magnification, magnificationScale]);

    return (
        <div
            ref={ref}
            className="nakas-dock"
            role="toolbar"
            tabIndex={-1}
            aria-label={label}
            onKeyDown={arrowNav}
        >
            <div className="nakas-dock-items">
                {shown.map((item) => (
                    <DockButton key={item.id} item={item} onPick={pick} />
                ))}
            </div>

            {over && (
                <div className="nakas-dock-more">
                    <button
                        type="button"
                        className="nakas-dock-btn"
                        data-more
                        data-tip={overflowLabel}
                        aria-label={`${overflowLabel}, ${hidden.length} éléments`}
                        aria-expanded={open}
                        aria-controls={open ? menuId : undefined}
                        onClick={() => setOpen(!open)}
                    >
                        <span className="nakas-dock-plus" aria-hidden="true">
                            +
                        </span>
                        <span className="nakas-dock-badge" aria-hidden="true">
                            {hidden.length}
                        </span>
                    </button>
                    {open && (
                        <DockMenu
                            id={menuId}
                            label={overflowLabel}
                            items={hidden}
                            search={searchable && hidden.length > searchThreshold}
                            onPick={pick}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
