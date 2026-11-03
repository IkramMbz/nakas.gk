import { useState } from "react";

import { CheckerHeader } from "../../ui/checker/checker-header.js";
import { Notice } from "../../ui/checker/notice.js";
import { useNakasConfig } from "../../ui/config-context.js";
import { useRemoteResource } from "../../ui/hooks/use-remote-resource.js";
import type { PanelProps } from "../../ui/panel/agent-panel.js";
import { isAlfredResult, isAlfredStatus, type AlfredResult } from "./types.js";

const POLL_MS = 4000;

type Run =
    | { phase: "idle" }
    | { phase: "running" }
    | { phase: "done"; result: AlfredResult }
    | { phase: "error"; message: string };

const formatBytes = (n: number): string =>
    n < 1024
        ? `${n} o`
        : n < 1024 * 1024
          ? `${Math.round(n / 1024)} Ko`
          : `${(n / 1024 / 1024).toFixed(1)} Mo`;

export default function AlfredPanel({ active }: PanelProps) {
    const { endpoint } = useNakasConfig();
    const url = `${endpoint}/manifest`;
    const { data, error, status, stale, refreshing, refresh } = useRemoteResource(url, {
        enabled: active,
        intervalMs: POLL_MS,
        isValid: isAlfredStatus,
        notFoundMessage: `Route ${url} introuvable : ajoute l'adaptateur serveur de nakas-gk (voir la documentation, section Intégration).`
    });
    const [choice, setChoice] = useState<string | null>(null);
    const [center, setCenter] = useState(true);
    const [run, setRun] = useState<Run>({ phase: "idle" });

    if (!data) {
        return status === "error" && error ? (
            <Notice tone="error" message={error} onRetry={refresh} />
        ) : (
            <p className="nakas-text nakas-text-md">Chargement…</p>
        );
    }

    const selected = data.images.some((i) => i.name === choice)
        ? choice
        : (data.images[0]?.name ?? null);
    const canRun =
        selected !== null && data.token !== null && data.canWrite && run.phase !== "running";

    const generate = async (): Promise<void> => {
        if (!canRun || data.token === null) return;
        setRun({ phase: "running" });
        try {
            const res = await fetch(url, {
                method: "POST",
                cache: "no-store",
                credentials: "omit",
                headers: { "Content-Type": "application/json", "X-Nakas-Token": data.token },
                body: JSON.stringify({ file: selected, center })
            });
            const json: unknown = await res.json().catch(() => null);
            if (res.ok && isAlfredResult(json)) {
                setRun({ phase: "done", result: json });
                return;
            }
            const message =
                typeof json === "object" &&
                json !== null &&
                "error" in json &&
                typeof json.error === "string"
                    ? json.error
                    : `Erreur ${res.status}`;
            setRun({ phase: "error", message });
        } catch {
            setRun({ phase: "error", message: "Serveur de développement injoignable." });
        }
    };

    return (
        <div className="nakas-checker">
            <CheckerHeader
                headline={data.images.length > 0 ? "Prêt à générer" : "Aucune image PNG"}
                tone={data.images.length > 0 ? "success" : "warning"}
                subline={`Choisir le logo à utiliser (/${data.dir})`}
                legend={[]}
                action={{
                    label: "Actualiser",
                    busyLabel: "Actualisation…",
                    busy: refreshing,
                    onClick: refresh
                }}
            />
            {stale && error && <Notice message={error} onRetry={refresh} />}
            {data.problem && <Notice tone="error" message={data.problem} />}
            {!data.canWrite && (
                <Notice message="Écriture désactivée pour cette page (mode autonome : renseigne allowedOrigins avec l'adresse de ton application)." />
            )}
            {data.exists && data.images.length === 0 && (
                <p className="nakas-text nakas-text-md">
                    Dépose ton logo (PNG) dans « {data.dir} », il apparaîtra ici.
                </p>
            )}

            {data.images.length > 0 && (
                <ul className="nakas-checklist">
                    {data.images.map((image) => (
                        <li key={image.name}>
                            <label className="nakas-checklist-item">
                                <input
                                    type="radio"
                                    name="alfred-image"
                                    checked={selected === image.name}
                                    onChange={() => setChoice(image.name)}
                                />
                                <span className="nakas-text nakas-text-md nakas-checklist-title">
                                    {image.name}
                                </span>
                                <small className="nakas-text nakas-text-sm">
                                    {formatBytes(image.bytes)}
                                </small>
                            </label>
                        </li>
                    ))}
                </ul>
            )}

            {data.images.length > 0 && (
                <>
                    <label className="nakas-checklist-item">
                        <input
                            type="checkbox"
                            checked={center}
                            onChange={(e) => setCenter(e.target.checked)}
                        />
                        <span className="nakas-text nakas-text-md">
                            Centrer sur le canvas (sinon l'image est utilisée telle quelle)
                        </span>
                    </label>
                    <button
                        type="button"
                        className="nakas-button"
                        disabled={!canRun}
                        onClick={() => void generate()}
                    >
                        {run.phase === "running" ? "Génération…" : "Générer le manifest"}
                    </button>
                </>
            )}

            {run.phase === "error" && <Notice tone="error" message={run.message} />}
            {run.phase === "done" && (
                <div className="nakas-checker">
                    <p className="nakas-text nakas-text-lg nakas-tone" data-tone="success">
                        Dossier créé
                    </p>
                    <p className="nakas-text nakas-text-md">{run.result.folder}</p>
                    <p className="nakas-text nakas-text-sm">
                        {run.result.files.length} fichiers en {run.result.durationMs} ms.
                        Déplace-les où tu veux, puis ajoute ce dossier à .gitignore : « {data.dir} »
                        est servi tel quel en production.
                    </p>
                </div>
            )}
        </div>
    );
}
