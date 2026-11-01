import { cpSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "..");

/** Copies assets to a temporary directory for testing SVG additions and corruption. */
export function tempAssets(): string {
    const dir = mkdtempSync(join(tmpdir(), "nakas-assets-"));
    cpSync(join(ROOT, "assets"), dir, { recursive: true });
    return dir;
}

/** Writes an SVG file to the specified layer. */
export function writeSvg(assetsDir: string, layer: string, name: string, content: string): void {
    mkdirSync(join(assetsDir, layer), { recursive: true });
    writeFileSync(join(assetsDir, layer, `${name}.svg`), content);
}

export const svg = (inner: string, viewBox = "0 0 100 100") =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
