import { useEffect, useRef } from "react";
/**
 * Closes on outside click or Escape, then returns focus to the "+" button.
 * Uses `composedPath()`: in a shadow DOM, `event.target` is retargeted to the host.
 */
export function useDismiss(open, ref, onClose) {
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });
    useEffect(() => {
        if (!open)
            return undefined;
        const down = (e) => {
            const inside = ref.current !== null && e.composedPath().includes(ref.current);
            if (!inside)
                onCloseRef.current();
        };
        const esc = (e) => {
            if (e.key !== "Escape")
                return;
            onCloseRef.current();
            ref.current?.querySelector("[data-more]")?.focus();
        };
        document.addEventListener("pointerdown", down);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("pointerdown", down);
            document.removeEventListener("keydown", esc);
        };
    }, [open, ref]);
}
//# sourceMappingURL=use-dismiss.js.map