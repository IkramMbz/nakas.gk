import { useCallback, useEffect, useRef, useState } from "react";

/** Copies to the clipboard and exposes a short-lived "copied" state. */
export function useCopy(text: string | undefined, resetMs = 1500) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const copy = useCallback(async (): Promise<void> => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            return; // clipboard unavailable (insecure context, permission denied)
        }
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
    }, [text, resetMs]);

    return { copied, copy };
}
