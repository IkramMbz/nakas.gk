import { STYLES } from "./styles.generated.js";

/** Attribute set on the host element; also detects an already-mounted instance. */
export const HOST_ATTRIBUTE = "data-nakas-host";

/**
 * Prepares a shadow DOM host: page CSS does not get in, Nakas CSS does not leak out
 * (and content is absent from `document.querySelectorAll`, so excluded from the SEO audit).
 */
export function attachNakasShadow(host: HTMLElement): HTMLElement {
    host.setAttribute(HOST_ATTRIBUTE, "");
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    if (!shadow.querySelector("style")) {
        const style = host.ownerDocument.createElement("style");
        style.textContent = STYLES;
        shadow.append(style);
    }
    const container = host.ownerDocument.createElement("div");
    shadow.append(container);
    return container;
}
