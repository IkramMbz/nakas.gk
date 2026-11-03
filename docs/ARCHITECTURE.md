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
    manifest/  Alfred  — PWA icons + manifest.json (panel + server tools GET/POST → devkit)
    tools.server.ts    server route registry: SERVER_TOOLS (GET) and WRITE_TOOLS (POST)
  ui/          shared UI: dock/, panel/, checker/ (common kit), hooks/, shadow DOM, panels.tsx
  browser/     mount.tsx: vanilla mounting (React inside)
  server/      api.ts (framework-free core) + adapters web.ts (Fetch) and node.ts (Node/Vite/standalone)
               security.ts (write guards: Host, Origin, Content-Type, session token)
               manifest.ts (manifest.json options + content, expected icon files)
  styles/      tokens → base → typography → dock → panel → checker (bundle injected into the shadow DOM)
  avatars/     deterministic avatar generation (standalone module)
  devkit/      sandbox + lock (plain JS, zero dependencies), agents.lock
    core/      runner (read a workspace) · transform (read ONE file) · output (confined write) · sandbox · paths · policy
    agents/    one locked folder per agent: SKILL.md + scripts (`imports`: import-doctor, `manifest`: PNG → icons)
scripts/       generate (registry, skills, CSS), build, dev, css-audit, verify-package
```

## Rules

1. **One Nakas = one agent = the `Nakas` type** (`core/nakas.ts`). `TEAM` (`core/team.ts`) lists the team; `NakasId` is derived from it. `ui/panels.tsx` is a `Record<NakasId, …>`: a Nakas without a declared tool won't compile. Append new Nakas at the **end** of `TEAM`: avatars are seeded by position.
2. **Environment isolation enforced by the compiler**: `tsconfig.client.json` has no Node types, `tsconfig.server.json` has no DOM/React types. `core/` compiles in both.
3. **Server code stays on the server side**: anything using Node (`node:path`, `Buffer`, devkit) goes in an `agents/<name>/server.ts`, an `*.server.ts` file, or `src/server/`. Any other file under `agents/` is read by the client project and fails to compile.
4. **No project reads outside devkit**: tools call `runAgent()` (read a workspace) or `runTransform()` (read one file); both go through the lock and the sandbox.
5. **The client knows nothing about the build tool**: no `process.env`, no `import.meta.env`, no CSS imports. CSS is generated as a string and injected into a shadow DOM.
6. **Agents never write.** An agent is a pure function (data in, data out) in a sandbox with no write, network, process or native addon. When something must be written, the **parent** writes it, through `writeArtifactsExclusive()`: a new folder, never over existing files.
7. **Write routes (`POST`) live in `WRITE_TOOLS`**, never next to read tools. Each one goes through `checkWriteRequest()` (loopback `Host`, same or listed `Origin`, `application/json`, session token), reads a body capped at 4 KB, validates it strictly and never takes a path from the request. Standalone server: set `allowedOrigins`, otherwise writes are refused.
8. **Adding an SEO check**: add it to its group in `agents/seo/audit/checks/`.

## Adding a Nakas

Read-only Nakas (client only, or with a `GET` tool):

1. `agents/<name>/identity.ts`
2. `core/team.ts` (at the end of the list)
3. `ui/panels.tsx` (panel, or `null`)
4. `agents/<name>/server.ts` + a line in `SERVER_TOOLS` (`agents/tools.server.ts`) if it needs the server. The **key** of that line is the route name: `GET {endpoint}/<key>`.

Nakas that writes files, in addition:

5. A locked agent `devkit/agents/<name>/` with a `SKILL.md` (`name:` identical to the folder, `read: file`, `write: none`).
6. A `POST` tool in `WRITE_TOOLS` using `runTransform()` then `writeArtifactsExclusive()`.
7. Next.js route: export `POST` as well as `GET` (`export const POST = handler;`).

Then, from the repository root:

```bash
pnpm run generate      # skills, avatar registry, embedded CSS
pnpm run devkit:lock   # after ANY change under src/devkit/agents/
pnpm run check         # format, lint, types, tests, build, package
```

In the host application: restart its dev server. The plugin is loaded once at startup, so a rebuilt `dist/` is not enough. Check with `GET {endpoint}/health`, which must list the new route.

## "Imports" flow

panel (`use-remote-resource`, 3 s probe, automatic reconnect) → `GET {endpoint}/imports` → `server/api.ts` → `agents/imports/server.ts` (fingerprint, cache) → `devkit runAgent('import-doctor')` → `node --permission` sandbox.

## "Manifest" flow

panel → `GET {endpoint}/manifest` (PNG files of `public/`, session token for this page) → user picks an image → `POST {endpoint}/manifest` `{ file, center }` with the `X-Nakas-Token` header → `server/api.ts` (`checkWriteRequest`, single write at a time) → `agents/manifest/server.ts` (image name checked against the server's own listing) → `devkit runTransform('manifest')` (confined read, sandbox, output validated against the exact list of expected files) → `writeArtifactsExclusive()` → `public/nakas-manifest-<yyyy-mm-dd-hh-mm-ss>/`. `manifest.json` is built by the parent from the `manifest` option, never by the agent.
