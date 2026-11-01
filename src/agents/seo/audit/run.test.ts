// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { runSeoAudit } from "./run.js";

const GOOD = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Un titre de page suffisamment long pour le SEO</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${"d".repeat(130)}"></head>
<body><main><h1>Un titre principal assez long</h1><p>${"Phrase de test. ".repeat(80)}</p></main></body></html>`;

function docOf(html: string): Document {
    document.documentElement.innerHTML = "";
    document.open();
    document.write(html);
    document.close();
    return document;
}

describe("audit SEO", () => {
    it("page correcte : title, description, h1, viewport, lang validés", () => {
        const r = runSeoAudit(docOf(GOOD));
        for (const id of ["title", "metaDescription", "h1", "viewport", "lang"]) {
            expect(r.checks[id]?.status).toBe("success");
        }
        expect(r.total).toBeGreaterThan(20);
    });
    it("page vide : erreurs sur title, description, h1", () => {
        const r = runSeoAudit(docOf("<!doctype html><html><head></head><body></body></html>"));
        expect(r.checks["title"]?.status).toBe("error");
        expect(r.checks["metaDescription"]?.status).toBe("error");
        expect(r.checks["h1"]?.status).toBe("error");
    });
    it("noindex détecté", () => {
        const r = runSeoAudit(
            docOf(GOOD.replace("</head>", '<meta name="robots" content="noindex"></head>'))
        );
        expect(r.checks["robotsMeta"]?.status).toBe("error");
    });
    it("contentSelector : absent => erreur claire ; présent => analysé ; par défaut main", () => {
        const doc = docOf(GOOD);
        expect(
            runSeoAudit(doc, { contentSelector: "#nope" }).checks["contentLengthAndQuality"]
                ?.message
        ).toContain("#nope");
        expect(
            runSeoAudit(doc, { contentSelector: "main" }).checks["contentLengthAndQuality"]?.status
        ).toBe("success");
        expect(runSeoAudit(doc).checks["contentLengthAndQuality"]?.status).toBe("success");
    });
    it("JSON-LD : types en tableau et @graph reconnus", () => {
        const ld = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@graph": [{ "@type": ["Organization"] }]
        });
        const r = runSeoAudit(
            docOf(
                GOOD.replace("</head>", `<script type="application/ld+json">${ld}</script></head>`)
            )
        );
        expect(r.checks["schemaOrganization"]?.message).toContain("present");
    });
    it("un contrôle ne fait jamais planter l'audit et les clés sont stables", () => {
        const keys = Object.keys(runSeoAudit(docOf(GOOD)).checks);
        expect(keys).toHaveLength(new Set(keys).size);
        expect(keys).toContain("touchTargetSize");
    });
});
