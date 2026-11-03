import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { CheckerHeader } from "../../ui/checker/checker-header.js";
import { Notice } from "../../ui/checker/notice.js";
import { useNakasConfig } from "../../ui/config-context.js";
import { useRemoteResource } from "../../ui/hooks/use-remote-resource.js";
import { isAlfredResult, isAlfredStatus } from "./types.js";
const POLL_MS = 4000;
const formatBytes = (n) => n < 1024
    ? `${n} o`
    : n < 1024 * 1024
        ? `${Math.round(n / 1024)} Ko`
        : `${(n / 1024 / 1024).toFixed(1)} Mo`;
export default function AlfredPanel({ active }) {
    const { endpoint } = useNakasConfig();
    const url = `${endpoint}/manifest`;
    const { data, error, status, stale, refreshing, refresh } = useRemoteResource(url, {
        enabled: active,
        intervalMs: POLL_MS,
        isValid: isAlfredStatus,
        notFoundMessage: `Route ${url} introuvable : ajoute l'adaptateur serveur de nakas-gk (voir la documentation, section Intégration).`
    });
    const [choice, setChoice] = useState(null);
    const [center, setCenter] = useState(true);
    const [run, setRun] = useState({ phase: "idle" });
    if (!data) {
        return status === "error" && error ? (_jsx(Notice, { tone: "error", message: error, onRetry: refresh })) : (_jsx("p", { className: "nakas-text nakas-text-md", children: "Chargement\u2026" }));
    }
    const selected = data.images.some((i) => i.name === choice)
        ? choice
        : (data.images[0]?.name ?? null);
    const canRun = selected !== null && data.token !== null && data.canWrite && run.phase !== "running";
    const generate = async () => {
        if (!canRun || data.token === null)
            return;
        setRun({ phase: "running" });
        try {
            const res = await fetch(url, {
                method: "POST",
                cache: "no-store",
                credentials: "omit",
                headers: { "Content-Type": "application/json", "X-Nakas-Token": data.token },
                body: JSON.stringify({ file: selected, center })
            });
            const json = await res.json().catch(() => null);
            if (res.ok && isAlfredResult(json)) {
                setRun({ phase: "done", result: json });
                return;
            }
            const message = typeof json === "object" &&
                json !== null &&
                "error" in json &&
                typeof json.error === "string"
                ? json.error
                : `Erreur ${res.status}`;
            setRun({ phase: "error", message });
        }
        catch {
            setRun({ phase: "error", message: "Serveur de développement injoignable." });
        }
    };
    return (_jsxs("div", { className: "nakas-checker", children: [_jsx(CheckerHeader, { headline: data.images.length > 0 ? "Prêt à générer" : "Aucune image PNG", tone: data.images.length > 0 ? "success" : "warning", subline: `Choisir le logo à utiliser (/${data.dir})`, legend: [], action: {
                    label: "Actualiser",
                    busyLabel: "Actualisation…",
                    busy: refreshing,
                    onClick: refresh
                } }), stale && error && _jsx(Notice, { message: error, onRetry: refresh }), data.problem && _jsx(Notice, { tone: "error", message: data.problem }), !data.canWrite && (_jsx(Notice, { message: "\u00C9criture d\u00E9sactiv\u00E9e pour cette page (mode autonome : renseigne allowedOrigins avec l'adresse de ton application)." })), data.exists && data.images.length === 0 && (_jsxs("p", { className: "nakas-text nakas-text-md", children: ["D\u00E9pose ton logo (PNG) dans \u00AB ", data.dir, " \u00BB, il appara\u00EEtra ici."] })), data.images.length > 0 && (_jsx("ul", { className: "nakas-checklist", children: data.images.map((image) => (_jsx("li", { children: _jsxs("label", { className: "nakas-checklist-item", children: [_jsx("input", { type: "radio", name: "alfred-image", checked: selected === image.name, onChange: () => setChoice(image.name) }), _jsx("span", { className: "nakas-text nakas-text-md nakas-checklist-title", children: image.name }), _jsx("small", { className: "nakas-text nakas-text-sm", children: formatBytes(image.bytes) })] }) }, image.name))) })), data.images.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "nakas-checklist-item", children: [_jsx("input", { type: "checkbox", checked: center, onChange: (e) => setCenter(e.target.checked) }), _jsx("span", { className: "nakas-text nakas-text-md", children: "Centrer sur le canvas (sinon l'image est utilis\u00E9e telle quelle)" })] }), _jsx("button", { type: "button", className: "nakas-button", disabled: !canRun, onClick: () => void generate(), children: run.phase === "running" ? "Génération…" : "Générer le manifest" })] })), run.phase === "error" && _jsx(Notice, { tone: "error", message: run.message }), run.phase === "done" && (_jsxs("div", { className: "nakas-checker", children: [_jsx("p", { className: "nakas-text nakas-text-lg nakas-tone", "data-tone": "success", children: "Dossier cr\u00E9\u00E9" }), _jsx("p", { className: "nakas-text nakas-text-md", children: run.result.folder }), _jsxs("p", { className: "nakas-text nakas-text-sm", children: [run.result.files.length, " fichiers en ", run.result.durationMs, " ms. D\u00E9place-les o\u00F9 tu veux, puis ajoute ce dossier \u00E0 .gitignore : \u00AB ", data.dir, " \u00BB est servi tel quel en production."] })] }))] }));
}
//# sourceMappingURL=alfred-panel.js.map