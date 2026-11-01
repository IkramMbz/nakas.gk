import { CheckList } from "../../ui/checker/check-list.js";
import { CheckerHeader } from "../../ui/checker/checker-header.js";
import { Notice } from "../../ui/checker/notice.js";
import { useNakasConfig } from "../../ui/config-context.js";
import { useRemoteResource } from "../../ui/hooks/use-remote-resource.js";
import type { PanelProps } from "../../ui/panel/agent-panel.js";
import { isImportAudit, summarize, toCheckItems } from "./audit-view.js";

const POLL_MS = 3000;

export default function ImportPanel({ active }: PanelProps) {
    const { endpoint } = useNakasConfig();
    const url = `${endpoint}/imports`;
    const { data, error, status, stale, refreshing, refresh } = useRemoteResource(url, {
        enabled: active,
        intervalMs: POLL_MS,
        isValid: isImportAudit,
        notFoundMessage: `Route ${url} introuvable : ajoute l'adaptateur serveur de nakas-gk (voir la documentation, section Intégration).`
    });

    if (!data) {
        return status === "error" && error ? (
            <Notice tone="error" message={error} onRetry={refresh} />
        ) : (
            <p className="nakas-text nakas-text-md">Analyse en cours…</p>
        );
    }

    const summary = summarize(data);
    return (
        <div className="nakas-checker">
            <CheckerHeader
                headline={summary.headline}
                tone={summary.tone}
                subline={`${data.filesScanned} fichiers analysés dans « ${data.dir} »`}
                legend={["error", "warning"]}
                action={{
                    label: "Rescanner",
                    busyLabel: "Analyse…",
                    busy: refreshing,
                    onClick: refresh
                }}
            />
            {stale && error && <Notice message={error} onRetry={refresh} />}
            {data.truncated && (
                <Notice message="Analyse partielle : les imports hors du périmètre ne sont pas vérifiés." />
            )}
            {data.isolation === "best-effort" && (
                <Notice message="Isolation réseau « best-effort » (pas de namespace réseau sur cette machine)." />
            )}
            <CheckList items={toCheckItems(data.findings)} />
        </div>
    );
}
