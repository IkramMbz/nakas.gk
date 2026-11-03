// manifest / runTransform: parent-side guarantees (confined read, validated output,
// exclusive write) and agent behavior on hostile images.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";
import {
    DEFAULT_ROOT,
    DevkitError,
    listConfinedFiles,
    resolveConfinedDir,
    runAgent,
    runTransform,
    writeArtifactsExclusive
} from "../core/index.mjs";
import { saveLock, readAgentTree, hashEntries } from "../core/lock.mjs";
import { encodePng, decodePng } from "../agents/manifest/png.mjs";

const SIZES = [32, 48, 72, 128, 180, 192, 256, 384, 512];
const EXPECTED = [
    ...SIZES.flatMap((s) => ["icon", "maskable-icon"].map((p) => `manifest/${p}-${s}x${s}.png`)),
    "logo.png",
    "logo_git.png",
    "apple-touch-icon.png",
    "favicon.ico"
];

const tmp = async (p) => fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `dk-${p}-`)));
const rejects = (p, code) =>
    assert.rejects(p, (e) => e instanceof DevkitError && e.code === code, `attendu ${code}`);

function logo(w = 64, h = 48) {
    const data = new Uint8Array(w * h * 4);
    for (let y = 8; y < h - 8; y++) {
        for (let x = 8; x < w - 8; x++) data.set([220, 40, 90, 255], (y * w + x) * 4);
    }
    return encodePng({ width: w, height: h, data });
}

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}
function rawPng({ width, height, idat, interlace = 0 }) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[12] = interlace;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", idat),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

async function dirWith(files) {
    const dir = await tmp("img");
    for (const [name, data] of Object.entries(files))
        await fs.writeFile(path.join(dir, name), data);
    return dir;
}
const run = (dir, file, extra = {}) =>
    runTransform({ name: "manifest", dir, file, expected: EXPECTED, ...extra });

test("manifest : produit exactement les 22 fichiers attendus, formats valides", async () => {
    const dir = await dirWith({ "logo.png": logo() });
    const r = await run(dir, "logo.png");
    assert.deepEqual(r.artifacts.map((a) => a.name).toSorted(), EXPECTED.toSorted());
    for (const a of r.artifacts.filter((x) => x.name.endsWith(".png"))) {
        const img = decodePng(a.data);
        assert.ok(img.width > 0 && img.width === img.height, a.name);
    }
    const ico = r.artifacts.find((a) => a.name === "favicon.ico").data;
    assert.equal(ico.readUInt16LE(2), 1);
    assert.equal(ico.readUInt16LE(4), 6);
});

test("écriture : dossier neuf, jamais d'écrasement, rien d'autre touché", async () => {
    const dir = await dirWith({ "logo.png": logo() });
    const out = await tmp("out");
    const r = await run(dir, "logo.png");
    const w = await writeArtifactsExclusive({
        parentDir: out,
        folderName: "nakas-manifest-x",
        files: r.artifacts
    });
    assert.equal(w.files.length, 22);
    const before = await fs.readFile(path.join(out, "nakas-manifest-x", "logo.png"));
    await rejects(
        writeArtifactsExclusive({
            parentDir: out,
            folderName: "nakas-manifest-x",
            files: r.artifacts
        }),
        "E_USAGE"
    );
    assert.deepEqual(await fs.readFile(path.join(out, "nakas-manifest-x", "logo.png")), before);
});

test("écriture : nom invalide refusé AVANT toute création", async () => {
    const out = await tmp("out");
    const data = Buffer.from("x");
    for (const name of ["../evil.png", "a/b/c.png", "/abs.png", ".hidden", "a b.png", "x\0.png"]) {
        await rejects(
            writeArtifactsExclusive({
                parentDir: out,
                folderName: "ok-dir",
                files: [{ name, data }]
            }),
            "E_OUTPUT"
        );
    }
    for (const folderName of ["../x", "A", "a/b", "", "-x"]) {
        await rejects(
            writeArtifactsExclusive({
                parentDir: out,
                folderName,
                files: [{ name: "a.png", data }]
            }),
            "E_USAGE"
        );
    }
    assert.deepEqual(await fs.readdir(out), []);
});

test("lecture : traversée, lien symbolique, nom sensible, faux PNG, image géante", async () => {
    const dir = await dirWith({
        "ok.png": logo(),
        "fake.png": Buffer.from("not a png at all......")
    });
    for (const bad of ["../x.png", "a/b.png", "a\\b.png", ".env", "", "..", "x\0.png"]) {
        await assert.rejects(run(dir, bad), (e) => e instanceof DevkitError, bad);
    }
    await rejects(run(dir, "fake.png"), "E_POLICY");
    await rejects(run(dir, "absent.png"), "E_USAGE");

    const secret = path.join(await tmp("secret"), "s.png");
    await fs.writeFile(secret, logo());
    try {
        await fs.symlink(secret, path.join(dir, "link.png"));
        await rejects(run(dir, "link.png"), "E_POLICY");
    } catch (e) {
        if (e?.code !== "EPERM") throw e; // symlinks forbidden (Windows): nothing to test
    }

    const huge = rawPng({ width: 20000, height: 20000, idat: deflateSync(Buffer.alloc(10)) });
    await fs.writeFile(path.join(dir, "huge.png"), huge);
    await rejects(run(dir, "huge.png"), "E_POLICY");
});

test("sandbox : PNG entrelacé et bombe de décompression échouent proprement", async () => {
    const bomb = rawPng({ width: 8, height: 8, idat: deflateSync(Buffer.alloc(20 << 20)) });
    const inter = rawPng({
        width: 8,
        height: 8,
        idat: deflateSync(Buffer.alloc(8 * 33)),
        interlace: 1
    });
    const dir = await dirWith({ "bomb.png": bomb, "inter.png": inter });
    await rejects(run(dir, "bomb.png"), "E_SANDBOX");
    await rejects(run(dir, "inter.png"), "E_SANDBOX");
});

test("image entièrement transparente : erreur claire", async () => {
    const empty = encodePng({ width: 16, height: 16, data: new Uint8Array(16 * 16 * 4) });
    await rejects(run(await dirWith({ "e.png": empty }), "e.png"), "E_SANDBOX");
});

// Throwaway DevKit root with a locked transform agent.
async function forgeRoot(code) {
    const root = await tmp("root");
    const dir = path.join(root, "agents", "evil-forge");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
        path.join(dir, "SKILL.md"),
        "---\nname: evil-forge\ndescription: test\nscript: run.mjs\npermissions:\n  read: file\n  write: none\n  network: none\n  exec: none\n---\nx\n"
    );
    await fs.writeFile(path.join(dir, "run.mjs"), code);
    await saveLock(root, new Map([["evil-forge", hashEntries(await readAgentTree(dir))]]));
    return root;
}
const b64 = (s) => Buffer.from(s).toString("base64");
const PNG_B64 = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(40)
]).toString("base64");

test("sortie hostile : nom inattendu, doublon, manquant, mal formé, non-PNG => E_OUTPUT", async () => {
    const dir = await dirWith({ "logo.png": logo() });
    const cases = {
        inattendu: `export default () => ({ artifacts: [{ name: "../../etc/x.png", base64: "${PNG_B64}" }] });`,
        doublon: `export default () => ({ artifacts: [{ name: "a.png", base64: "${PNG_B64}" }, { name: "a.png", base64: "${PNG_B64}" }] });`,
        manquant: `export default () => ({ artifacts: [{ name: "a.png", base64: "${PNG_B64}" }] });`,
        "clé en trop": `export default () => ({ artifacts: [{ name: "a.png", base64: "${PNG_B64}", mode: 493 }, { name: "b.png", base64: "${PNG_B64}" }] });`,
        "faux png": `export default () => ({ artifacts: [{ name: "a.png", base64: "${b64("<script>alert(1)</script>")}" }, { name: "b.png", base64: "${PNG_B64}" }] });`,
        "base64 invalide": `export default () => ({ artifacts: [{ name: "a.png", base64: "@@@" }, { name: "b.png", base64: "${PNG_B64}" }] });`,
        "pas une liste": `export default () => ({ artifacts: "x" });`
    };
    for (const [label, code] of Object.entries(cases)) {
        const root = await forgeRoot(code);
        await assert.rejects(
            runTransform({
                name: "evil-forge",
                dir,
                file: "logo.png",
                expected: ["a.png", "b.png"],
                root
            }),
            (e) => e instanceof DevkitError && e.code === "E_OUTPUT",
            label
        );
    }
});

test("un agent de transformation est refusé par runAgent, et inversement", async () => {
    const root = await forgeRoot("export default () => ({ artifacts: [] });");
    const ws = await tmp("ws");
    await rejects(runAgent({ name: "evil-forge", workspace: ws, root }), "E_USAGE");
    const dir = await dirWith({ "logo.png": logo() });
    await rejects(
        runTransform({
            name: "import-doctor",
            dir,
            file: "logo.png",
            expected: ["a.png"],
            root: DEFAULT_ROOT
        }),
        "E_USAGE"
    );
});

test("confinement de dossier : « .. », absolu, lien, introuvable", async () => {
    const root = await tmp("proj");
    await fs.mkdir(path.join(root, "public"));
    await fs.writeFile(path.join(root, "public", "a.png"), logo());
    await fs.writeFile(path.join(root, "public", ".env"), "S=1");
    assert.equal(await resolveConfinedDir(root, "public"), path.join(root, "public"));
    for (const bad of ["../public", "/etc", "C:\\x", "public/../..", "", "a b"]) {
        await assert.rejects(resolveConfinedDir(root, bad), (e) => e instanceof DevkitError, bad);
    }
    await rejects(resolveConfinedDir(root, "nope"), "E_USAGE");
    const list = await listConfinedFiles(path.join(root, "public"), { exts: [".png"] });
    assert.deepEqual(
        list.map((f) => f.name),
        ["a.png"]
    );
});
