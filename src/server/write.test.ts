import { request } from "node:http";
import { mkdir, mkdtemp, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";

import { alfredTool, alfredWriteTool } from "../agents/manifest/server.js";
import { createNakasApi } from "./api.js";
import { ICON_FILES } from "./manifest.js";
import { startNakasServer } from "./node.js";
import { sessionToken } from "./security.js";
import type { ApiRequest, ApiResponse, WriteTool } from "./types.js";

const HOST = "localhost:5173";
const ORIGIN = "http://localhost:5173";
const APP = "http://localhost:4200";

const echo = vi.fn<WriteTool>(async ({ body }) => ({ got: body }));

const post = (extra: Partial<ApiRequest> = {}): ApiRequest => ({
    method: "POST",
    url: "/api/nakas/echo",
    host: HOST,
    origin: ORIGIN,
    fetchSite: "same-origin",
    contentType: "application/json",
    token: sessionToken(),
    body: '{"a":1}',
    ...extra
});

const api = (options = {}) => createNakasApi({ tools: {}, writeTools: { echo }, ...options });

const get = (extra: Partial<ApiRequest> = {}): ApiRequest => ({
    method: "GET",
    url: "/api/nakas/manifest",
    host: HOST,
    ...extra
});

const failing: WriteTool = async () => {
    throw new Error("ENOENT: /home/secret/project/.env");
};

function pngChunk(type: string, data: Buffer): Buffer {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}

/** Opaque magenta rectangle on a transparent 40x30 RGBA PNG. */
function testPng(): Buffer {
    const width = 40;
    const height = 30;
    const raw = Buffer.alloc(height * (width * 4 + 1));
    for (let y = 5; y < 25; y++) {
        for (let x = 5; x < 35; x++) {
            raw.set([200, 30, 80, 255], y * (width * 4 + 1) + 1 + x * 4);
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", deflateSync(raw)),
        pngChunk("IEND", Buffer.alloc(0))
    ]);
}

async function project(): Promise<string> {
    const root = await mkdtemp(path.join(tmpdir(), "nakas-alfred-"));
    await mkdir(path.join(root, "public"));
    await writeFile(path.join(root, "public", "logo.png"), testPng());
    await writeFile(path.join(root, "public", ".env"), "SECRET=1");
    await writeFile(path.join(root, "public", "notes.txt"), "x");
    return root;
}

const generated = async (root: string): Promise<string[]> =>
    (await readdir(path.join(root, "public"))).filter((n) => n.startsWith("nakas-manifest-"));

const run = async (
    root: string,
    body: unknown,
    extra: Partial<ApiRequest> = {}
): Promise<ApiResponse> =>
    createNakasApi({ root }).handle(
        post({ url: "/api/nakas/manifest", body: JSON.stringify(body), ...extra })
    );

async function boot(allowedOrigins: string[] = []) {
    const root = await project();
    const server = await startNakasServer({ port: 0, root, allowedOrigins });
    return { root, server };
}

const jsonPost = (token: string | null, body: string, origin = APP): RequestInit => ({
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(token ? { "X-Nakas-Token": token } : {})
    },
    body
});

/** Raw HTTP request, to forge a `Host` header that `fetch` would refuse. */
function rawPost(baseUrl: string, headers: Record<string, string>, body: string): Promise<number> {
    const url = new URL(baseUrl);
    return new Promise<number>((resolve, reject) => {
        const req = request(
            {
                host: url.hostname,
                port: url.port,
                path: "/api/nakas/manifest",
                method: "POST",
                headers
            },
            (res) => {
                res.resume();
                resolve(res.statusCode ?? 0);
            }
        );
        req.on("error", reject);
        req.end(body);
    });
}

afterEach(() => {
    echo.mockClear();
    vi.unstubAllEnvs();
});

const REFUSALS: [string, Partial<ApiRequest>, number][] = [
    ["Host étranger (DNS rebinding)", { host: "evil.example:5173" }, 403],
    ["Host absent", { host: undefined }, 403],
    ["Origin absent", { origin: undefined }, 403],
    ["Origin d'un autre port local", { origin: "http://localhost:3000" }, 403],
    ["Origin d'un autre site", { origin: "https://evil.example" }, 403],
    ["Origin illisible", { origin: "pas une url" }, 403],
    ["Origin non http", { origin: "file://" }, 403],
    ["Sec-Fetch-Site cross-site", { fetchSite: "cross-site" }, 403],
    ["Sec-Fetch-Site same-site", { fetchSite: "same-site" }, 403],
    ["Content-Type formulaire", { contentType: "application/x-www-form-urlencoded" }, 415],
    ["Content-Type absent", { contentType: undefined }, 415],
    ["jeton absent", { token: undefined }, 403],
    ["jeton faux", { token: "0".repeat(64) }, 403],
    ["corps trop gros", { bodyTooLarge: true }, 413],
    ["JSON invalide", { body: "{nope" }, 400],
    ["corps vide", { body: undefined }, 400]
];

describe("POST : contrôles de sécurité (aucun outil exécuté en cas de refus)", () => {
    it("requête légitime acceptée", async () => {
        const res = await api().handle(post());
        expect(res.status).toBe(200);
        expect(echo).toHaveBeenCalledTimes(1);
    });

    it.each(REFUSALS)("%s => %i", async (_label, extra, status) => {
        const res = await api().handle(post(extra));
        expect(res.status).toBe(status);
        expect(echo).not.toHaveBeenCalled();
    });

    it("Host en majuscules accepté, mais pas une Origin différente de l'hôte", async () => {
        expect((await api().handle(post({ host: "LOCALHOST:5173" }))).status).toBe(200);
        expect((await api().handle(post({ origin: "http://127.0.0.1:5173" }))).status).toBe(403);
    });

    it("origine listée : autorisée même cross-origin, les autres restent refusées", async () => {
        const options = { allowedOrigins: [APP] };
        const cross = post({ host: "127.0.0.1:4321", origin: APP, fetchSite: "cross-site" });
        expect((await api(options).handle(cross)).status).toBe(200);
        expect((await api(options).handle({ ...cross, origin: "http://localhost:4201" })).status).toBe(403);
        expect((await api().handle(cross)).status).toBe(403); // pas de liste = same-origin seulement
    });

    it("404 en production et jamais d'exécution", async () => {
        vi.stubEnv("NODE_ENV", "production");
        expect((await api().handle(post())).status).toBe(404);
        expect(echo).not.toHaveBeenCalled();
    });

    it("outil inconnu : 404 ; outil en lecture seule : 405 Allow GET ; DELETE refusé", async () => {
        const a = createNakasApi({ tools: { imports: async () => ({}) }, writeTools: {} });
        expect((await a.handle(post({ url: "/api/nakas/nope" }))).status).toBe(404);
        const readOnly = await a.handle(post({ url: "/api/nakas/imports" }));
        expect(readOnly.status).toBe(405);
        expect(readOnly.headers["Allow"]).toBe("GET");
        expect((await a.handle({ method: "DELETE", url: "/api/nakas/echo" })).status).toBe(405);
    });

    it("une seule écriture à la fois : 429", async () => {
        let calls = 0;
        const slow = vi.fn<WriteTool>(() =>
            ++calls === 1 ? new Promise((done) => setTimeout(() => done({}), 150)) : Promise.resolve({})
        );
        const a = createNakasApi({ tools: {}, writeTools: { echo: slow } });
        const first = a.handle(post());
        await vi.waitFor(() => expect(slow).toHaveBeenCalled());
        expect((await a.handle(post())).status).toBe(429);
        expect((await first).status).toBe(200);
        expect((await a.handle(post())).status).toBe(200);
    });

    it("erreur inattendue : message générique, rien ne fuit", async () => {
        const res = await createNakasApi({ tools: {}, writeTools: { echo: failing } }).handle(post());
        expect(res.status).toBe(500);
        expect(JSON.stringify(res.body)).not.toContain("secret");
    });
});

const TOKEN_REFUSALS: [string, Partial<ApiRequest>][] = [
    ["Origin étranger", { origin: "https://evil.example" }],
    ["Origin d'un autre port local", { origin: "http://localhost:3000" }],
    ["Host étranger", { host: "evil.example" }],
    ["no-cors cross-site", { fetchSite: "cross-site" }]
];

async function tokenFor(req: ApiRequest, options = {}): Promise<string | null> {
    const res = await createNakasApi({
        tools: { alfred: alfredTool },
        writeTools: {},
        root: await project(),
        ...options
    }).handle(req);
    return (res.body as { token: string | null }).token;
}

describe("GET : le jeton n'est remis qu'à la page elle-même", () => {
    it("same-origin (pas d'Origin) : jeton remis", async () => {
        expect(await tokenFor(get())).toBe(sessionToken());
    });

    it.each(TOKEN_REFUSALS)("%s : pas de jeton", async (_label, extra) => {
        expect(await tokenFor(get(extra))).toBeNull();
    });

    it("origine listée : jeton remis", async () => {
        expect(
            await tokenFor(get({ origin: APP, host: "127.0.0.1:4321" }), { allowedOrigins: [APP] })
        ).toBe(sessionToken());
    });
});

describe("Alfred : de bout en bout", () => {
    it("liste seulement les PNG, génère le dossier daté (23 fichiers dont manifest.json)", async () => {
        const root = await project();
        const status = (await createNakasApi({ root }).handle(get())).body as {
            images: { name: string }[];
        };
        expect(status.images.map((i) => i.name)).toEqual(["logo.png"]);

        const res = await run(root, { file: "logo.png", center: true });
        expect(res.status).toBe(200);
        const result = res.body as { folder: string; files: string[] };
        expect(result.folder).toMatch(/^public\/nakas-manifest-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
        expect(result.files).toHaveLength(ICON_FILES.length + 1);
        expect(result.files).toContain("manifest.json");

        const out = path.join(root, result.folder);
        const manifest = JSON.parse(await readFile(path.join(out, "manifest.json"), "utf8")) as {
            icons: { src: string }[];
        };
        expect(manifest.icons).toHaveLength(18);
        expect(manifest.icons[0]?.src).toBe("/manifest/icon-32x32.png");
        expect(await readdir(path.join(out, "manifest"))).toHaveLength(18);
        expect(await readdir(path.join(root, "public"))).toContain("logo.png"); // source intacte
    });

    it("refuse tout ce qui n'est pas une image listée par le serveur", async () => {
        const root = await project();
        const names = ["../public/logo.png", "../../etc/passwd", ".env", "notes.txt", "nope.png", "a/b.png", "logo.png\0"];
        const statuses = await Promise.all(names.map(async (file) => (await run(root, { file })).status));
        expect(statuses).toEqual(names.map(() => 400));
        expect(await generated(root)).toEqual([]);
    });

    it("corps strict : champ inconnu, type invalide, __proto__", async () => {
        const root = await project();
        expect((await run(root, { file: "logo.png", outDir: "/tmp" })).status).toBe(400);
        expect((await run(root, { file: "logo.png", center: "yes" })).status).toBe(400);
        expect((await run(root, { file: 42 })).status).toBe(400);
        expect((await run(root, ["logo.png"])).status).toBe(400);
        const res = await createNakasApi({ root }).handle(
            post({ url: "/api/nakas/manifest", body: '{"file":"logo.png","__proto__":{"x":1}}' })
        );
        expect(res.status).toBe(400);
    });

    it("lien symbolique nommé .png : ignoré à la liste, refusé à la lecture", async () => {
        const root = await project();
        const outside = path.join(await mkdtemp(path.join(tmpdir(), "nakas-out-")), "s.png");
        await writeFile(outside, "x");
        try {
            await symlink(outside, path.join(root, "public", "evil.png"));
        } catch {
            return; // symlinks not permitted here
        }
        const list = (await createNakasApi({ root }).handle(get())).body as {
            images: { name: string }[];
        };
        expect(list.images.map((i) => i.name)).not.toContain("evil.png");
        expect((await run(root, { file: "evil.png" })).status).toBe(400);
    });

    it("dossier source hors projet : refusé", async () => {
        const root = await project();
        const res = await createNakasApi({ root, manifest: { publicDir: "../outside" } }).handle(
            post({ url: "/api/nakas/manifest", body: '{"file":"logo.png"}' })
        );
        expect(res.status).toBe(400);
    });

    it("configuration du manifest invalide : refusée avant toute écriture", async () => {
        const root = await project();
        const bad = [
            { themeColor: "red" },
            { lang: "fr_FR!" },
            { iconsBasePath: "/a/../b" },
            { display: "kiosk" },
            { startUrl: "javascript:1" }
        ];
        const statuses = await Promise.all(
            bad.map(
                async (manifest) =>
                    (
                        await createNakasApi({ root, manifest } as never).handle(
                            post({ url: "/api/nakas/manifest", body: '{"file":"logo.png"}' })
                        )
                    ).status
            )
        );
        expect(statuses).toEqual(bad.map(() => 400));
        expect(await generated(root)).toEqual([]);
    });

    it("l'outil direct refuse un nom hors liste (défense en profondeur)", async () => {
        const root = await project();
        await expect(
            alfredWriteTool({ root, options: {}, body: { file: "../x.png" } })
        ).rejects.toThrow("image introuvable");
    });
});

describe("serveur autonome (HTTP réel)", () => {
    it("origine listée : préflight, jeton, POST, dossier créé", async () => {
        const { root, server } = await boot([APP]);
        try {
            const pre = await fetch(`${server.url}/api/nakas/manifest`, {
                method: "OPTIONS",
                headers: { Origin: APP, "Access-Control-Request-Method": "POST" }
            });
            expect(pre.headers.get("access-control-allow-methods")).toBe("GET, POST");
            expect(pre.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-nakas-token");

            const status = (await (
                await fetch(`${server.url}/api/nakas/manifest`, { headers: { Origin: APP } })
            ).json()) as { token: string | null };
            expect(status.token).toBe(sessionToken());
            const res = await fetch(
                `${server.url}/api/nakas/manifest`,
                jsonPost(status.token, '{"file":"logo.png"}')
            );
            expect(res.status).toBe(200);
            expect(res.headers.get("access-control-allow-origin")).toBe(APP);
            expect((await generated(root)).length).toBe(1);
        } finally {
            await server.close();
        }
    });

    it("sans allowedOrigins : jeton non remis, préflight POST non autorisé, POST refusé", async () => {
        const { root, server } = await boot();
        try {
            const status = (await (
                await fetch(`${server.url}/api/nakas/manifest`, { headers: { Origin: APP } })
            ).json()) as { token: string | null; canWrite: boolean };
            expect(status.token).toBeNull();
            expect(status.canWrite).toBe(false);
            const pre = await fetch(`${server.url}/api/nakas/manifest`, {
                method: "OPTIONS",
                headers: { Origin: APP }
            });
            expect(pre.headers.get("access-control-allow-methods")).toBe("GET");
            expect(pre.headers.get("access-control-allow-headers")).toBeNull();
            const res = await fetch(
                `${server.url}/api/nakas/manifest`,
                jsonPost(sessionToken(), '{"file":"logo.png"}')
            );
            expect(res.status).toBe(403);
            expect(await generated(root)).toEqual([]);
        } finally {
            await server.close();
        }
    });

    it("corps de 1 Mo : 413, sans écriture", async () => {
        const { server } = await boot([APP]);
        try {
            const res = await fetch(
                `${server.url}/api/nakas/manifest`,
                jsonPost(sessionToken(), JSON.stringify({ file: "x".repeat(1_000_000) }))
            );
            expect(res.status).toBe(413);
        } finally {
            await server.close();
        }
    });

    it("Host forgé (rebinding) : 403 même avec jeton et Origin correspondants", async () => {
        const { server } = await boot([APP]);
        try {
            const status = await rawPost(
                server.url,
                {
                    Host: "evil.example",
                    Origin: "http://evil.example",
                    "Content-Type": "application/json",
                    "X-Nakas-Token": sessionToken()
                },
                '{"file":"logo.png"}'
            );
            expect(status).toBe(403);
        } finally {
            await server.close();
        }
    });
});