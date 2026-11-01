interface Props {
    message: string;
    tone?: "warning" | "error";
    onRetry?: () => void;
}

/** Status message (error, lost connection, partial results) with optional retry. */
export function Notice({ message, tone = "warning", onRetry }: Props) {
    return (
        <div className="nakas-notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
            <p className="nakas-text nakas-text-sm">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry}>
                    Réessayer
                </button>
            )}
        </div>
    );
}
