import { useCallback, useEffect, useRef, useState } from "react";

export interface RemoteOptions<T> {
    /** `false`: no requests (panel closed). */
    enabled: boolean;
    /** Polling interval when all is well. */
    intervalMs: number;
    /** Type guard for the JSON response (module-level: stable reference). */
    isValid: (value: unknown) => value is T;
    /** Message shown on a 404 (server route missing). */
    notFoundMessage: string;
}

export interface RemoteState<T> {
    status: "loading" | "ready" | "error";
    /** Last valid response: kept during a reload or an outage. */
    data: T | null;
    error: string | null;
    /** True while the last attempt failed (`data` may be stale). */
    stale: boolean;
    refreshing: boolean;
}

const MAX_BACKOFF_MS = 10_000;
const INITIAL: RemoteState<never> = {
    status: "loading",
    data: null,
    error: null,
    stale: false,
    refreshing: false
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

async function fetchJson(
    url: string,
    signal: AbortSignal
): Promise<{ ok: boolean; status: number; json: unknown }> {
    const res = await fetch(url, { cache: "no-store", signal });
    const json: unknown = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
}

/**
 * Polls a development JSON route, continuously and without ever blocking:
 *  - periodic probe while `enabled` and the tab is visible;
 *  - automatic reconnect (1 s → 10 s backoff) when the dev server restarts;
 *  - immediate resume when the tab/window regains focus;
 *  - last data stays displayed during an outage.
 */
export function useRemoteResource<T>(url: string, options: RemoteOptions<T>) {
    const { enabled, intervalMs, isValid, notFoundMessage } = options;
    const [state, setState] = useState<RemoteState<T>>(INITIAL);
    const refreshRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        if (!enabled) return undefined;

        let stopped = false;
        let failures = 0;
        let forceNext = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let inFlight: AbortController | null = null;

        const schedule = (ms: number): void => {
            clearTimeout(timer);
            if (!stopped) timer = setTimeout(() => void tick(), ms);
        };

        const tick = async (): Promise<void> => {
            if (stopped || inFlight) return;
            if (document.visibilityState === "hidden") {
                schedule(intervalMs);
                return;
            }
            const ctrl = new AbortController();
            inFlight = ctrl;
            const target = forceNext ? `${url}${url.includes("?") ? "&" : "?"}force=1` : url;
            forceNext = false;
            setState((s) => ({ ...s, refreshing: true }));
            try {
                const { ok, status, json } = await fetchJson(target, ctrl.signal);
                if (status === 404) throw new Error(notFoundMessage);
                if (!ok) {
                    throw new Error(
                        isRecord(json) && typeof json["error"] === "string"
                            ? json["error"]
                            : `Erreur ${status}`
                    );
                }
                if (!isValid(json)) throw new Error("Réponse invalide du serveur.");
                failures = 0;
                setState({
                    status: "ready",
                    data: json,
                    error: null,
                    stale: false,
                    refreshing: false
                });
                schedule(intervalMs);
            } catch (e) {
                if (ctrl.signal.aborted) return;
                failures += 1;
                const message =
                    e instanceof TypeError
                        ? "Serveur de développement injoignable : nouvelle tentative…"
                        : e instanceof Error
                          ? e.message
                          : String(e);
                setState((s) => ({
                    status: "error",
                    data: s.data,
                    error: message,
                    stale: true,
                    refreshing: false
                }));
                schedule(Math.min(1000 * 2 ** (failures - 1), MAX_BACKOFF_MS));
            } finally {
                if (inFlight === ctrl) inFlight = null;
            }
        };

        const wake = (): void => {
            if (document.visibilityState === "visible") void tick();
        };
        refreshRef.current = () => {
            forceNext = true;
            clearTimeout(timer);
            void tick();
        };

        document.addEventListener("visibilitychange", wake);
        window.addEventListener("focus", wake);
        void tick();

        return () => {
            stopped = true;
            clearTimeout(timer);
            inFlight?.abort();
            document.removeEventListener("visibilitychange", wake);
            window.removeEventListener("focus", wake);
            refreshRef.current = () => undefined;
        };
    }, [url, enabled, intervalMs, isValid, notFoundMessage]);

    const refresh = useCallback(() => refreshRef.current(), []);
    return { ...state, refresh };
}
