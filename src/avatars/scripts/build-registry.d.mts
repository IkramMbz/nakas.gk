import type { Registry } from "../types.js";

/** Builds the in-memory registry from an assets directory (defaults to `../assets`). */
export function buildRegistry(assetsDir?: string): Registry;
/** Writes the generated TypeScript registry module. */
export function writeRegistry(registry: Registry, outFile: string): void;
/** Exact content of the generated TypeScript module. */
export function renderRegistry(registry: Registry): string;
