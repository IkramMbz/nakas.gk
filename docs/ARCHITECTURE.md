# Architecture

```
src/
  index.ts · react.ts · auto.ts · server.ts · cli.ts   public entry points (one per package export)
  standalone.ts                                        standalone browser bundle (React included)
  core/        types and rules with no DOM or Node: Nakas, team, environment, options, avatar
  agents/      one folder per Nakas: identity.ts + panel (UI) + server.ts (server tool) + SKILL.md
    imports/   Amalia  — import analysis (panel + server tool → devkit)
    seo/       L       — DOM SEO audit (audit/context + audit/checks/* + panel)
    creator/   Bob     — SKILL.md for creating Nakas
    tools.server.ts    server route registry
  ui/          shared UI: dock/, panel/, checker/ (common kit), hooks/, shadow DOM, panels.tsx
  browser/     mount.tsx: vanilla mounting (React inside)
  server/      api.ts (framework-free core) + adapters web.ts (Fetch) and node.ts (Node/Vite/standalone)
  styles/      tokens → base → typography → dock → panel → checker (bundle injected into the shadow DOM)
  avatars/     deterministic avatar generation (standalone module)
  devkit/      sandbox + lock (plain JS, zero dependencies): core/, bin/, agents/<name>/, agents.lock
scripts/       generate (registry, skills, CSS), build, dev, css-audit, verify-package
```

## Rules

1. **One Nakas = one agent = the `Nakas` type** (`core/nakas.ts`). `TEAM` (`core/team.ts`) lists the team; `NakasId` is derived from it. `ui/panels.tsx` is a `Record<NakasId, …>`: a Nakas without a declared tool won't compile.
2. **Environment isolation enforced by the compiler**: `tsconfig.client.json` has no Node types, `tsconfig.server.json` has no DOM/React types. `core/` compiles in both.
3. **No project reads outside devkit**: the `imports` tool calls `runAgent()` (lock + sandbox).
4. **The client knows nothing about the build tool**: no `process.env`, no `import.meta.env`, no CSS imports. CSS is generated as a string and injected into a shadow DOM.
5. **Adding a Nakas**: `agents/<name>/identity.ts` → `core/team.ts` → `ui/panels.tsx` (+ a server tool in `agents/tools.server.ts` if needed).
6. **Adding an SEO check**: add it to its group in `agents/seo/audit/checks/`.

## "Imports" flow

panel (`use-remote-resource`, 3 s probe, automatic reconnect) → `GET {endpoint}/imports` → `server/api.ts` → `agents/imports/server.ts` (fingerprint, cache) → `devkit runAgent('import-doctor')` → `node --permission` sandbox.
