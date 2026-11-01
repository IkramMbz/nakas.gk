import type { KeyboardEvent, ReactNode } from "react";

export const hasContent = (node: ReactNode): boolean => node != null && node !== false;

/** Left/right arrows: move focus between dock buttons (not in the menu). */
export function arrowNav(e: KeyboardEvent<HTMLElement>): void {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step || (e.target instanceof Element && e.target.closest(".nakas-dock-menu"))) return;
    const root = e.currentTarget;
    const buttons = [...root.querySelectorAll<HTMLButtonElement>(".nakas-dock-btn:not(:disabled)")];
    // `document.activeElement` stops at the shadow host: read focus from our own root.
    const rootNode = root.getRootNode();
    const focused =
        rootNode instanceof ShadowRoot || rootNode instanceof Document
            ? rootNode.activeElement
            : null;
    const index = buttons.findIndex((el) => el === focused);
    if (index < 0) return;
    e.preventDefault();
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
}
