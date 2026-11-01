import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckList } from "../../ui/checker/check-list.js";
import { CheckerHeader } from "../../ui/checker/checker-header.js";
import { useNakasConfig } from "../../ui/config-context.js";
import { complianceOf, toCheckItems } from "./audit-view.js";
import { useSeoAudit } from "./use-seo-audit.js";
export default function SeoPanel({ active }) {
    const { contentSelector } = useNakasConfig();
    const audit = useSeoAudit(active, { contentSelector });
    if (!audit)
        return _jsx("p", { className: "nakas-text nakas-text-md", children: "Analyse en cours\u2026" });
    const { percentage, tone } = complianceOf(audit);
    return (_jsxs("div", { className: "nakas-checker", children: [_jsx(CheckerHeader, { headline: `${percentage} % of SEO compliance`, tone: tone, subline: `${audit.score}/${audit.total}`, legend: ["error", "warning", "success", "info"] }), _jsx(CheckList, { items: toCheckItems(audit) })] }));
}
//# sourceMappingURL=seo-panel.js.map