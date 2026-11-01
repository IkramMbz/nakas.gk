import { useEffect, useRef, useState } from "react";

import type { DockItem } from "./types.js";
import { hasContent } from "./utils.js";

interface Props {
    id: string;
    label: string;
    items: readonly DockItem[];
    search: boolean;
    onPick: (item: DockItem) => void;
}

export default function DockMenu({ id, label, items, search, onPick }: Props) {
    const [query, setQuery] = useState("");
    const input = useRef<HTMLInputElement>(null);
    const needle = query.trim().toLowerCase();
    const matches = items.filter((x) => x.label.toLowerCase().includes(needle));

    useEffect(() => {
        input.current?.focus();
    }, []);

    return (
        <section className="nakas-dock-menu" id={id} aria-label={label}>
            {search && (
                <input
                    ref={input}
                    type="search"
                    value={query}
                    placeholder="Rechercher un Nakas…"
                    aria-label="Rechercher un Nakas"
                    onChange={(e) => setQuery(e.target.value)}
                />
            )}
            {matches.map((i) => (
                <button key={i.id} type="button" disabled={i.disabled} onClick={() => onPick(i)}>
                    <span className="nakas-dock-ico">{i.img}</span>
                    <b>{i.label}</b>
                    {hasContent(i.badge) && <small>{i.badge}</small>}
                </button>
            ))}
            {matches.length === 0 && (
                <p className="nakas-text nakas-text-sm">Aucun Nakas trouvé.</p>
            )}
        </section>
    );
}
