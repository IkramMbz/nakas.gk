import { useEffect, useRef, type RefObject } from "react";

/**
 * Closes on outside click or Escape, then returns focus to the "+" button.
 * Uses `composedPath()`: in a shadow DOM, `event.target` is retargeted to the host.
 */
export function useDismiss(
    open: boolean,
    ref: RefObject<HTMLElement | null>,
    onClose: () => void
): void {
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return undefined;
        const down = (e: PointerEvent): void => {
            const inside = ref.current !== null && e.composedPath().includes(ref.current);
            if (!inside) onCloseRef.current();
        };
        const esc = (e: KeyboardEvent): void => {
            if (e.key !== "Escape") return;
            onCloseRef.current();
            ref.current?.querySelector<HTMLElement>("[data-more]")?.focus();
        };
        document.addEventListener("pointerdown", down);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("pointerdown", down);
            document.removeEventListener("keydown", esc);
        };
    }, [open, ref]);
}
