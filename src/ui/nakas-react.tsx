"use client";

import { useEffect } from "react";

import { mount } from "../browser/mount.js";
import type { NakasOptions } from "../core/options.js";

/**
 * React component: mounts the Nakas UI (shadow DOM, outside the app's React tree)
 * with the host's React. Renders nothing on the server or during hydration: no server/client mismatch.
 */
export default function Nakas({ enabled, endpoint, contentSelector }: NakasOptions) {
    useEffect(() => {
        const handle = mount({ enabled, endpoint, contentSelector });
        return () => handle.unmount();
    }, [enabled, endpoint, contentSelector]);
    return null;
}
