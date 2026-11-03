import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearImportsCache } from "../agents/imports/server.js";
import type { ImportAuditResult } from "../agents/imports/types.js";
import { createNakasApi } from "./api.js";
import { nakas, startNakasServer } from "./node.js";
import { createNakasHandler } from "./web.js";

async function project(): Promise<string> {
    const root = await mkdtemp(path.join(tmpdir(), "nakas-srv-"));
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "package.json"), '{"dependencies":{}}');
    await writeFile(
        path.join(root, "src", "a.ts"),
        "import './absent.js';\nimport x from 'lodash';\n"
    );
    await writeFile(path.join(root, ".env"), "SECRET=1");
    return root;
}

afterEach(() => {
    vi.unstubAllEnvs();
    clearImportsCache();
});

describe("API", () => {
    it("health, outil inconnu, méthode non GET", async () => {
        const api = createNakasApi();
        expect((await api.handle({ method: "GET", url: "/api/nakas/health" })).body).toMatchObject({
            ok: true,
            tools: ["imports", "manifest"]
        });
        expect((await api.handle({ method: "GET", url: "/api/nakas/nope" })).status).toBe(404);
        const post = await api.handle({ method: "POST", url: "/api/nakas/imports" });
        expect(post.status).toBe(405);
        expect(post.headers["Allow"]).toBe("GET");
    });
    it("404 en production, sans rien exécuter", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const res = await createNakasApi().handle({ method: "GET", url: "/api/nakas/health" });
        expect(res.status).toBe(404);
    });
    it("imports : passe par le sandbox, trouve les erreurs, met en cache puis relance si le projet change", async () => {
        const root = await project();
        const api = createNakasApi({ root });
        const get = async (q = "") =>
            (await api.handle({ method: "GET", url: `/api/nakas/imports${q}` }))
                .body as ImportAuditResult;
        const first = await get();
        expect(first.findings.map((f) => f.rule).toSorted()).toEqual([
            "missing-dependency",
            "missing-file"
        ]);
        expect(first.cached).toBe(false);
        expect(JSON.stringify(first)).not.toContain("SECRET");
        expect((await get()).cached).toBe(true);
        expect((await get("?force=1")).cached).toBe(false);
        await writeFile(path.join(root, "src", "b.ts"), "export const b = 1;\n");
        expect((await get()).cached).toBe(false);
    });
    it("dossier demandé introuvable => 400 explicite", async () => {
        const root = await project();
        const res = await createNakasApi({ root, imports: { dirs: ["absent"] } }).handle({
            method: "GET",
            url: "/x/imports"
        });
        expect(res.status).toBe(400);
    });
});

describe("adaptateurs", () => {
    it("handler Fetch (Next.js & co)", async () => {
        const root = await project();
        const res = await createNakasHandler({ root })(
            new Request("http://localhost:3000/api/nakas/imports")
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(((await res.json()) as ImportAuditResult).filesScanned).toBeGreaterThan(0);
    });
    it("plugin Vite : middleware monté sur /api/nakas, absent du build", async () => {
        const use = vi.fn<(path: string, handler: unknown) => void>();
        const plugin = nakas();
        expect(plugin.apply).toBe("serve");
        plugin.configureServer({ config: { root: await project() }, middlewares: { use } });
        expect(use).toHaveBeenCalledWith("/api/nakas", expect.any(Function));
    });
    it("serveur autonome : boucle locale, CORS local seulement, Host étranger refusé", async () => {
        const server = await startNakasServer({ root: await project(), port: 0 });
        try {
            const ok = await fetch(`${server.url}/api/nakas/health`, {
                headers: { Origin: "http://localhost:4200" }
            });
            expect(ok.status).toBe(200);
            expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:4200");
            const evil = await fetch(`${server.url}/api/nakas/health`, {
                headers: { Origin: "https://evil.example" }
            });
            expect(evil.status).toBe(403);
            expect(evil.headers.get("access-control-allow-origin")).toBeNull();
        } finally {
            await server.close();
        }
        await expect(startNakasServer({ host: "0.0.0.0" })).rejects.toThrow(/boucle locale/);
    });
});
