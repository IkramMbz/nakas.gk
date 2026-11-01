import { useCallback, useEffect, useRef, useState } from "react";
/** Copies to the clipboard and exposes a short-lived "copied" state. */
export function useCopy(text, resetMs = 1500) {
    const [copied, setCopied] = useState(false);
    const timer = useRef(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const copy = useCallback(async () => {
        if (!text)
            return;
        try {
            await navigator.clipboard.writeText(text);
        }
        catch {
            return; // clipboard unavailable (insecure context, permission denied)
        }
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
    }, [text, resetMs]);
    return { copied, copy };
}
//# sourceMappingURL=use-copy.js.map