import { CheckList } from "../../ui/checker/check-list.js";
import { CheckerHeader } from "../../ui/checker/checker-header.js";
import { useNakasConfig } from "../../ui/config-context.js";
import type { PanelProps } from "../../ui/panel/agent-panel.js";
import { complianceOf, toCheckItems } from "./audit-view.js";
import { useSeoAudit } from "./use-seo-audit.js";

export default function SeoPanel({ active }: PanelProps) {
    const { contentSelector } = useNakasConfig();
    const audit = useSeoAudit(active, { contentSelector });

    if (!audit) return <p className="nakas-text nakas-text-md">Analyse en cours…</p>;

    const { percentage, tone } = complianceOf(audit);
    return (
        <div className="nakas-checker">
            <CheckerHeader
                headline={`${percentage} % of SEO compliance`}
                tone={tone}
                subline={`${audit.score}/${audit.total}`}
                legend={["error", "warning", "success", "info"]}
            />
            <CheckList items={toCheckItems(audit)} />
        </div>
    );
}
