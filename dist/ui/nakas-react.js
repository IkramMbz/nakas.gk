"use client";
import { useEffect } from "react";
import { mount } from "../browser/mount.js";
/**
 * React component: mounts the Nakas UI (shadow DOM, outside the app's React tree)
 * with the host's React. Renders nothing on the server or during hydration: no server/client mismatch.
 */
export default function Nakas({ enabled, endpoint, contentSelector }) {
    useEffect(() => {
        const handle = mount({ enabled, endpoint, contentSelector });
        return () => handle.unmount();
    }, [enabled, endpoint, contentSelector]);
    return null;
}
//# sourceMappingURL=nakas-react.js.map