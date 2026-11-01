#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { startNakasServer } from "./server/node.js";
const HELP = `nakas — serveur de développement autonome (boucle locale uniquement)

  nakas serve [projet] [--port 4321] [--strict]

Le client se connecte avec : mountNakas({ endpoint: "http://127.0.0.1:4321/api/nakas" })`;
function option(args, name) {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args[i + 1];
}
async function main(args) {
    const [command, ...rest] = args;
    if (command !== "serve") {
        process.stdout.write(`${HELP}\n`);
        return command === undefined || command === "--help" ? 0 : 2;
    }
    const port = Number(option(rest, "--port") ?? 4321);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        process.stderr.write("nakas : --port invalide\n");
        return 2;
    }
    const valueOfOption = new Set(["--port"]);
    const positional = rest.filter((a, i) => !a.startsWith("--") && !valueOfOption.has(rest[i - 1] ?? ""));
    const root = path.resolve(positional[0] ?? ".");
    const server = await startNakasServer({ root, port, strict: rest.includes("--strict") });
    process.stdout.write(`nakas : ${server.url}/api/nakas  (projet : ${root})\n`);
    const stop = () => void server.close().then(() => process.exit(0));
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return -1;
}
try {
    const code = await main(process.argv.slice(2));
    if (code >= 0)
        process.exitCode = code;
}
catch (e) {
    process.stderr.write(`nakas : ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
}
//# sourceMappingURL=cli.js.map