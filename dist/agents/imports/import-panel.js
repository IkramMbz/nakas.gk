import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CheckList } from "../../ui/checker/check-list.js";
import { CheckerHeader } from "../../ui/checker/checker-header.js";
import { Notice } from "../../ui/checker/notice.js";
import { useNakasConfig } from "../../ui/config-context.js";
import { useRemoteResource } from "../../ui/hooks/use-remote-resource.js";
import { isImportAudit, summarize, toCheckItems } from "./audit-view.js";
const POLL_MS = 3000;
export default function ImportPanel({ active }) {
    const { endpoint } = useNakasConfig();
    const url = `${endpoint}/imports`;
    const { data, error, status, stale, refreshing, refresh } = useRemoteResource(url, {
        enabled: active,
        intervalMs: POLL_MS,
        isValid: isImportAudit,
        notFoundMessage: `Route ${url} introuvable : ajoute l'adaptateur serveur de nakas-gk (voir la documentation, section Intégration).`
    });
    if (!data) {
        return status === "error" && error ? (_jsx(Notice, { tone: "error", message: error, onRetry: refresh })) : (_jsx("p", { className: "nakas-text nakas-text-md", children: "Analyse en cours\u2026" }));
    }
    const summary = summarize(data);
    return (_jsxs("div", { className: "nakas-checker", children: [_jsx(CheckerHeader, { headline: summary.headline, tone: summary.tone, subline: `${data.filesScanned} fichiers analysés dans « ${data.dir} »`, legend: ["error", "warning"], action: {
                    label: "Rescanner",
                    busyLabel: "Analyse…",
                    busy: refreshing,
                    onClick: refresh
                } }), stale && error && _jsx(Notice, { message: error, onRetry: refresh }), data.truncated && (_jsx(Notice, { message: "Analyse partielle : les imports hors du p\u00E9rim\u00E8tre ne sont pas v\u00E9rifi\u00E9s." })), data.isolation === "best-effort" && (_jsx(Notice, { message: "Isolation r\u00E9seau \u00AB best-effort \u00BB (pas de namespace r\u00E9seau sur cette machine)." })), _jsx(CheckList, { items: toCheckItems(data.findings) })] }));
}
//# sourceMappingURL=import-panel.js.map