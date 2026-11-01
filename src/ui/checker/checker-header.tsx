import type { ReactNode } from "react";

import { StatusDot } from "./status-dot.js";
import { STATUS_LABEL, type CheckStatus } from "./types.js";

interface Props {
    headline: ReactNode;
    /** Title color. */
    tone: CheckStatus;
    subline: ReactNode;
    /** Statuses shown in the legend. */
    legend: readonly CheckStatus[];
    action?: { label: string; onClick: () => void; busy: boolean; busyLabel: string };
}

/** Shared header: colored title, subtitle, status legend and optional action. */
export function CheckerHeader({ headline, tone, subline, legend, action }: Props) {
    return (
        <header className="nakas-checker-header">
            <div className="nakas-checker-header-top">
                <div className="nakas-checker-summary">
                    <p className="nakas-text nakas-text-lg nakas-tone" data-tone={tone}>
                        {headline}
                    </p>
                    <p className="nakas-text nakas-text-md">{subline}</p>
                </div>
                {action && (
                    <button type="button" onClick={action.onClick} disabled={action.busy}>
                        {action.busy ? action.busyLabel : action.label}
                    </button>
                )}
            </div>
            <ul className="nakas-legend">
                {legend.map((status) => (
                    <li key={status}>
                        <StatusDot status={status} />
                        {STATUS_LABEL[status]}
                    </li>
                ))}
            </ul>
        </header>
    );
}
