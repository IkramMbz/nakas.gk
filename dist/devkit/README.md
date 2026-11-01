# DevKit — local diagnostic agents

An agent = a folder: `SKILL.md` (instructions + declared permissions) and an `.mjs` script.
Scripts run the verifiable checks; the model reasons over the JSON they produce.

```bash
node bin/devkit.mjs run import-doctor ./my-project          # text
node bin/devkit.mjs run import-doctor ./my-project --json   # devkit.result/1 contract
node bin/devkit.mjs run import-doctor . --strict            # refuse without strong network isolation
node bin/devkit.mjs list | verify | lock
pnpm run test:devkit                                       # includes offensive tests (from the repo root)
```

Node ≥ 22.13, zero dependencies.

## Agent contract (never changes)

```js
// agents/<name>/run.mjs
export default function run({ files, truncated, skipDirNames }) {
    // files = [{ path, text }]  (snapshot read by the runner, never by the agent)
    return { findings: [{ rule, severity, file, line, evidence, message, confidence }] };
}
```

`severity`: error|warning|info · `confidence`: high|medium|low · `file` must be a provided file.

## Adding an agent

1. Copy a folder into `agents/` (never auto-installed).
2. Review `SKILL.md` + the script.
3. `node bin/devkit.mjs lock`, then commit `agents.lock` (CI checks it).

## Plugging into Cursor / VS Code later

Nothing to change in `core/`. The adapter imports the API and displays the JSON:

```js
import { runAgent } from "nakas-gk/devkit";
const result = await runAgent({ name: "import-doctor", workspace, include: ["src"] }); // ← the only entry point
```

Cursor already reads the `SKILL.md` format; the model only **asks** to "run import-doctor",
and the runner applies the lock, permissions, sandbox and budgets.

See [SECURITY.md](SECURITY.md) for the threat model and limits.

## Wiring in nakas-gk

The `import-doctor` agent is the one the "Imports" panel (Amalia) uses: the server tool
`src/agents/imports/server.ts` calls `runAgent()`, so **every analysis goes through the
`agents.lock` check and the sandbox**. There is no other path for reading the project.

- `include` limits reading to certain folders (the root `package.json` is still read).
- `workspaceFingerprint()` returns a fingerprint without reading content: the server reruns the agent only if the project changed.
- After any change under `agents/`, run `pnpm run devkit:lock`; otherwise `pnpm run devkit:verify` and the tests fail.
- Formatters ignore `agents/` (`.oxfmtrc.json`): reformatting can't invalidate the lock.
