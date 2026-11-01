import { StatusDot } from "./status-dot.js";
import type { CheckItem } from "./types.js";

/** Shared findings list: status dot, title, then details. */
export function CheckList({ items }: { items: readonly CheckItem[] }) {
    return (
        <ul className="nakas-checklist">
            {items.map((item) => (
                <li key={item.id} className="nakas-checklist-item">
                    <StatusDot status={item.status} />
                    <div>
                        <p className="nakas-checklist-title">{item.title}</p>
                        {item.details.map((d) => (
                            <div key={d.id} className="nakas-checklist-detail">
                                <p className="nakas-text nakas-text-sm">
                                    {d.label && <b>{d.label} · </b>}
                                    {d.message}
                                </p>
                                {d.evidence && <code>{d.evidence}</code>}
                                {d.hint && (
                                    <p className="nakas-text nakas-text-sm nakas-muted">
                                        → {d.hint}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </li>
            ))}
        </ul>
    );
}
