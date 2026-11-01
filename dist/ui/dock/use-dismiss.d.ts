import { type RefObject } from "react";
/**
 * Closes on outside click or Escape, then returns focus to the "+" button.
 * Uses `composedPath()`: in a shadow DOM, `event.target` is retargeted to the host.
 */
export declare function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void): void;
//# sourceMappingURL=use-dismiss.d.ts.map