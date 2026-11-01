import type { DockItem } from "./types.js";
import { hasContent } from "./utils.js";

interface Props {
    item: DockItem;
    onPick: (item: DockItem) => void;
}

export default function DockButton({ item, onPick }: Props) {
    return (
        <button
            type="button"
            className="nakas-dock-btn"
            data-on={item.active ? "true" : undefined}
            aria-label={item.label}
            aria-pressed={item.active}
            title={item.title}
            disabled={item.disabled}
            data-tip={item.label}
            onClick={() => onPick(item)}
        >
            <span className="nakas-dock-ico">{item.img}</span>
            {hasContent(item.badge) && <span className="nakas-dock-badge">{item.badge}</span>}
        </button>
    );
}
