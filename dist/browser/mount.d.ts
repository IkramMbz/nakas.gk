import { type NakasOptions } from "../core/options.js";
import { HOST_ATTRIBUTE } from "../ui/shadow-host.js";
export interface NakasHandle {
    /** Removes Nakas from the page. Idempotent. */
    unmount(): void;
}
/**
 * Mounts Nakas in the current page, with any framework (or none).
 * One instance per document: a second call (HMR, double render) replaces the first.
 */
export declare function mount(options?: NakasOptions): NakasHandle;
export { HOST_ATTRIBUTE };
//# sourceMappingURL=mount.d.ts.map