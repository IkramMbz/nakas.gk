import type { CheckStatus } from "./types.js";

export function StatusDot({ status }: { status: CheckStatus }) {
    return <span className="nakas-dot" data-status={status} aria-hidden="true" />;
}
