import { useEffect, useMemo, useRef, useState } from "react";

import { avatarSrc } from "../core/avatar.js";
import type { NakasConfig } from "../core/options.js";
import { TEAM, type NakasId } from "../core/team.js";
import { ConfigProvider } from "./config-context.js";
import Dock, { type DockItem } from "./dock/dock.js";
import { useDismiss } from "./dock/use-dismiss.js";
import AgentPanel from "./panel/agent-panel.js";
import { PANELS } from "./panels.js";

const DOCK_HIDDEN_KEY = "__Host-nakas-gk_pref_dock_hidden";
const MONTHS_MS = 12 * 30 * 24 * 60 * 60 * 1000; // Twelve months.

function isDockHiddenRecord(value: unknown): value is { hidden: boolean; timestamp: number } {
    if (typeof value !== "object" || value === null) return false;
    return "hidden" in value && "timestamp" in value &&
        typeof value.hidden === "boolean" && typeof value.timestamp === "number";
}

function readDockHidden(): boolean {
    try {
        const raw = localStorage.getItem(DOCK_HIDDEN_KEY);
        if (!raw) return false;

        const parsed: unknown = JSON.parse(raw);
        if (!isDockHiddenRecord(parsed)) return false;

        if (Date.now() - parsed.timestamp > MONTHS_MS) {
            localStorage.removeItem(DOCK_HIDDEN_KEY);
            return false;
        }

        return parsed.hidden;
    } catch {
        return false;
    }
}

function writeDockHidden(hidden: boolean): void {
    try {
        localStorage.setItem(DOCK_HIDDEN_KEY, JSON.stringify({ hidden, timestamp: Date.now() }));
    } catch {
        // storage indisponible - état gardé en mémoire pour la session
    }
}

export default function NakasApp({ config }: { config: NakasConfig }) {
    const [openId, setOpenId] = useState<NakasId | null>(null);
    const [minimizedId, setMinimizedId] = useState<NakasId | null>(null);
    const [dockHidden, setDockHidden] = useState(readDockHidden);
    const root = useRef<HTMLDivElement>(null);

    useDismiss(openId !== null, root, () => setOpenId(null));

    useEffect(() => {
        writeDockHidden(dockHidden);
    }, [dockHidden]);

    const items = useMemo<DockItem[]>(
        () =>
            TEAM.map((nakas, index) => ({
                id: nakas.id,
                label: nakas.name,
                title: `${nakas.name} - ${nakas.role}`,
                active: nakas.id === openId,
                onClick: () => setOpenId((current) => (current === nakas.id ? null : nakas.id)),
                img: (
                    <img
                        className="nakas-dock-avatar"
                        data-active={nakas.id === openId}
                        src={avatarSrc(nakas, index)}
                        alt={nakas.name}
                        width={96}
                        height={96}
                    />
                )
            })),
        [openId]
    );

    const minimizedItem: DockItem | undefined = minimizedId
        ? {
            id: minimizedId,
            label: TEAM.find((n) => n.id === minimizedId)?.name ?? "Nakas",
            title: "Restaurer le Nakas",
            active: true,
            onClick: () => {
                setOpenId(minimizedId);
                setMinimizedId(null);
            },
            img: <span className="nakas-minimized-icon">↗</span>
        }
        : undefined;

    return (
        <ConfigProvider value={config}>
            <div className="nakas-root" ref={root} data-has-open={openId !== null}>
                <div className="nakas-stage">
                    {!dockHidden && (
                        <Dock
                            items={items}
                            minimizedItem={minimizedItem}
                            maxWidth={680}
                            imgSize={44}
                            onClose={() => setDockHidden(true)}
                        />
                    )}
                </div>

                {dockHidden && (
                    <button
                        type="button"
                        className="nakas-dock-reopen"
                        onClick={() => setDockHidden(false)}
                        aria-label="Afficher le Dock"
                        title="Afficher le Dock"
                    >
                        Nakas
                    </button>
                )}

                <AgentPanel
                    nakas={TEAM.find((n) => n.id === openId)}
                    panels={PANELS}
                    onClose={() => {
                        setMinimizedId(openId);
                        setOpenId(null);
                    }}
                />
            </div>
        </ConfigProvider>
    );
}
