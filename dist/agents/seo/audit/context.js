const MAIN_FALLBACKS = ["main", '[role="main"]', "article"];
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
/** Caches the result of an expensive computation (DOM query) on first call. */
function lazy(compute) {
    let done = false;
    let value;
    return () => {
        if (!done) {
            value = compute();
            done = true;
        }
        return value;
    };
}
/**
 * View of the document for one audit pass: each DOM query runs at most once.
 * Checks never touch `document`/`location` directly (testable with any DOM).
 */
export function createSeoContext(doc, options = {}) {
    const loc = doc.defaultView?.location ?? new URL("http://localhost/");
    const win = doc.defaultView;
    const metaTag = (selector) => lazy(() => doc.querySelector(selector));
    const linkTag = (selector) => lazy(() => doc.querySelector(selector));
    const allLinks = (selector) => lazy(() => [...doc.querySelectorAll(selector)]);
    const title = lazy(() => doc.title || "");
    const metaDescription = metaTag('meta[name="description"]');
    const metaRobots = metaTag('meta[name="robots"]');
    const metaViewport = metaTag('meta[name="viewport"]');
    const canonical = linkTag('link[rel="canonical"]');
    const ogTitle = metaTag('meta[property="og:title"]');
    const ogDescription = metaTag('meta[property="og:description"]');
    const ogImage = metaTag('meta[property="og:image"]');
    const ogType = metaTag('meta[property="og:type"]');
    const images = lazy(() => [...doc.querySelectorAll("img")]);
    const links = lazy(() => [...doc.querySelectorAll("a[href]")]);
    const headings = lazy(() => [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")]);
    const scripts = lazy(() => [...doc.querySelectorAll("script[src]")]);
    const hreflangLinks = allLinks('link[rel="alternate"][hreflang]');
    const schemaScripts = lazy(() => [
        ...doc.querySelectorAll('script[type="application/ld+json"]')
    ]);
    /** All declared JSON-LD `@type`s (arrays and `@graph` included); invalid JSON ignored. */
    const schemaInfo = lazy(() => {
        const types = new Set();
        let valid = 0;
        let invalid = 0;
        const collect = (node) => {
            if (Array.isArray(node))
                return node.forEach(collect);
            if (!isRecord(node))
                return;
            const type = node["@type"];
            if (typeof type === "string")
                types.add(type);
            else if (Array.isArray(type))
                for (const t of type)
                    if (typeof t === "string")
                        types.add(t);
            collect(node["@graph"]);
        };
        for (const script of schemaScripts()) {
            try {
                const json = JSON.parse(script.textContent || "");
                if (isRecord(json) && json["@context"] && json["@type"])
                    valid++;
                else
                    invalid++;
                collect(json);
            }
            catch {
                invalid++;
            }
        }
        return { count: schemaScripts().length, types, valid, invalid };
    });
    /** Content area: configured selector, else `main` / `[role=main]` / `article`, else `body`. */
    const mainContent = lazy(() => {
        const configured = options.contentSelector?.trim();
        if (configured) {
            try {
                const element = doc.querySelector(configured);
                return element
                    ? { element, problem: null }
                    : {
                        element: null,
                        problem: `No element matches contentSelector "${configured}"`
                    };
            }
            catch {
                return { element: null, problem: `Invalid contentSelector "${configured}"` };
            }
        }
        for (const selector of MAIN_FALLBACKS) {
            const element = doc.querySelector(selector);
            if (element)
                return { element, problem: null };
        }
        return { element: doc.body, problem: null };
    });
    const hostname = loc.hostname;
    return {
        doc,
        win,
        loc,
        hostname,
        isLocalhost: LOCAL_HOSTS.has(hostname),
        currentUrl: loc.href.split(/[?#]/)[0] ?? "",
        docElement: doc.documentElement,
        get body() {
            return doc.body;
        },
        title,
        metaDescription,
        metaRobots,
        metaViewport,
        canonical,
        ogTitle,
        ogDescription,
        ogImage,
        ogType,
        images,
        links,
        headings,
        scripts,
        hreflangLinks,
        schemaInfo,
        mainContent,
        pageType: lazy(() => ogType()?.content || "website"),
        /** Selector for a meta tag with a value: `meta("name", "twitter:card")`. */
        meta: (attr, key) => doc.querySelector(`meta[${attr}="${key}"]`)
    };
}
//# sourceMappingURL=context.js.map