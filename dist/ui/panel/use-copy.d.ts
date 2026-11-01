/** Copies to the clipboard and exposes a short-lived "copied" state. */
export declare function useCopy(text: string | undefined, resetMs?: number): {
    copied: boolean;
    copy: () => Promise<void>;
};
//# sourceMappingURL=use-copy.d.ts.map