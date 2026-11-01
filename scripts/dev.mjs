// Dev: regenerate, then recompile continuously (tsc --watch) plus CSS (esbuild --watch).
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const node = process.execPath;
await new Promise((ok, ko) =>
    spawn(node, ["scripts/generate.mjs"], { cwd: root, stdio: "inherit" }).on("exit", (c) =>
        c === 0 ? ok() : ko(new Error("generate a échoué"))
    )
);
const tsc = join(root, "node_modules/typescript/bin/tsc");
const children = ["tsconfig.client.build.json", "tsconfig.server.build.json"].map((p) =>
    spawn(node, [tsc, "-p", p, "--watch", "--preserveWatchOutput"], { cwd: root, stdio: "inherit" })
);
const css = await context({
    entryPoints: [join(root, "src/styles/index.css")],
    bundle: true,
    write: false,
    logLevel: "info"
});
await css.watch();
const stop = () => {
    children.forEach((c) => c.kill());
    void css.dispose().then(() => process.exit(0));
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log(
    "dev : tsc --watch actif. Relance `pnpm generate` après un changement de CSS/SKILL.md."
);
