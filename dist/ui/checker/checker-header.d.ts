import type { ReactNode } from "react";
import { type CheckStatus } from "./types.js";
interface Props {
    headline: ReactNode;
    /** Title color. */
    tone: CheckStatus;
    subline: ReactNode;
    /** Statuses shown in the legend. */
    legend: readonly CheckStatus[];
    action?: {
        label: string;
        onClick: () => void;
        busy: boolean;
        busyLabel: string;
    };
}
/** Shared header: colored title, subtitle, status legend and optional action. */
export declare function CheckerHeader({ headline, tone, subline, legend, action }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=checker-header.d.ts.map