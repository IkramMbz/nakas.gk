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
/**
 * Polls a development JSON route, continuously and without ever blocking:
 *  - periodic probe while `enabled` and the tab is visible;
 *  - automatic reconnect (1 s → 10 s backoff) when the dev server restarts;
 *  - immediate resume when the tab/window regains focus;
 *  - last data stays displayed during an outage.
 */
export declare function useRemoteResource<T>(url: string, options: RemoteOptions<T>): {
    status: "loading" | "ready" | "error";
    /** Last valid response: kept during a reload or an outage. */
    data: T | null;
    error: string | null;
    /** True while the last attempt failed (`data` may be stale). */
    stale: boolean;
    refreshing: boolean;
    refresh: () => void;
};
//# sourceMappingURL=use-remote-resource.d.ts.map