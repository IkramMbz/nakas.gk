// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mount } from "../browser/mount.js";
import { HOST_ATTRIBUTE } from "./shadow-host.js";
import { useRemoteResource } from "./hooks/use-remote-resource.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("montage vanille", () => {
    it("rend dans un shadow DOM, une seule instance, démontable", async () => {
        const first = mount({ enabled: true });
        await act(async () => {});
        const host = document.querySelector(`[${HOST_ATTRIBUTE}]`);
        expect(host?.shadowRoot?.querySelector(".nakas-root")).not.toBeNull();
        expect(host?.shadowRoot?.querySelectorAll(".nakas-dock-btn").length).toBe(3);
        expect(document.querySelector(".nakas-root")).toBeNull(); // nothing leaks into the page

        mount({ enabled: true });
        expect(document.querySelectorAll(`[${HOST_ATTRIBUTE}]`)).toHaveLength(1);
        first.unmount();
        first.unmount();
    });
    it("monte par défaut sur un hôte local (jsdom = localhost)", async () => {
        const handle = mount();
        await act(async () => {});
        expect(document.querySelector(`[${HOST_ATTRIBUTE}]`)).not.toBeNull();
        handle.unmount();
        expect(document.querySelector(`[${HOST_ATTRIBUTE}]`)).toBeNull();
    });
    it("ouvre le panneau d'un Nakas au clic et le ferme avec Échap", async () => {
        const handle = mount({ enabled: true, endpoint: "/api/nakas" });
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise(() => undefined))
        );
        await act(async () => {});
        const shadow = document.querySelector(`[${HOST_ATTRIBUTE}]`)?.shadowRoot;
        const panel = () => shadow?.querySelector(".nakas-panel");
        expect(panel()?.getAttribute("data-open")).toBe("false");
        await act(async () =>
            shadow?.querySelectorAll<HTMLButtonElement>(".nakas-dock-btn")[1]?.click()
        );
        expect(panel()?.getAttribute("data-open")).toBe("true");
        await act(async () => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        });
        expect(panel()?.getAttribute("data-open")).toBe("false");
        handle.unmount();
    });
});

interface Payload {
    n: number;
}
const isPayload = (v: unknown): v is Payload => typeof v === "object" && v !== null && "n" in v;

function Probe({
    onState
}: {
    onState: (s: ReturnType<typeof useRemoteResource<Payload>>) => void;
}) {
    const [enabled] = useState(true);
    const state = useRemoteResource("/x", {
        enabled,
        intervalMs: 1000,
        isValid: isPayload,
        notFoundMessage: "route absente"
    });
    onState(state);
    return null;
}

describe("useRemoteResource", () => {
    let root: Root;
    beforeEach(() => {
        vi.useFakeTimers();
        root = createRoot(document.body.appendChild(document.createElement("div")));
    });

    it("se reconnecte seul après un redémarrage du serveur et garde les dernières données", async () => {
        let up = true;
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                if (!up) throw new TypeError("fetch failed");
                return new Response(JSON.stringify({ n: 1 }), { status: 200 });
            })
        );
        let last: ReturnType<typeof useRemoteResource<Payload>> | undefined;
        await act(async () => root.render(<Probe onState={(s) => (last = s)} />));
        expect(last?.status).toBe("ready");

        up = false;
        await act(async () => void (await vi.advanceTimersByTimeAsync(1100)));
        expect(last?.status).toBe("error");
        expect(last?.data).toEqual({ n: 1 }); // data kept during the outage
        expect(last?.stale).toBe(true);

        up = true;
        await act(async () => void (await vi.advanceTimersByTimeAsync(1500)));
        expect(last?.status).toBe("ready");
        expect(last?.stale).toBe(false);
    });
    it("404 => message explicite, et la reprise reste possible", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("{}", { status: 404 }))
        );
        let last: ReturnType<typeof useRemoteResource<Payload>> | undefined;
        await act(async () => root.render(<Probe onState={(s) => (last = s)} />));
        expect(last?.error).toBe("route absente");
        expect(typeof last?.refresh).toBe("function");
    });
});
