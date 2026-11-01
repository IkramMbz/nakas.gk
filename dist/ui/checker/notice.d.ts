interface Props {
    message: string;
    tone?: "warning" | "error";
    onRetry?: () => void;
}
/** Status message (error, lost connection, partial results) with optional retry. */
export declare function Notice({ message, tone, onRetry }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=notice.d.ts.map