import type { ReactNode } from "react";
export interface DockItem {
    id: string;
    label: string;
    img: ReactNode;
    active?: boolean;
    disabled?: boolean;
    badge?: ReactNode;
    onClick?: () => void;
    title?: string;
}
export interface DockProps {
    items: readonly DockItem[];
    maxWidth?: number;
    imgSize?: number;
    gap?: number;
    magnification?: boolean;
    magnificationScale?: number;
    label?: string;
    overflowLabel?: string;
    searchable?: boolean;
    searchThreshold?: number;
}
//# sourceMappingURL=types.d.ts.map