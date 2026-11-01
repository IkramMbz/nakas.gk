<style>
  img { border-radius: 8px; }
</style>

<div align="center">
  <a href="https://github.com/IkramMbz/nakas-gk">
    <img
      src="assets/media/img/logo-git.svg"
      alt="nakas.gk Logo"
      width="140"
    >
  </a>

  <h1>nakas.gk</h1>

  <p>
    <strong>The React Developer Toolkit.</strong>
    <br>
    Audit SEO, inspect imports, and analyze your web applications directly from your development environment.
  </p>

  <div>
    <a href="https://github.com/IkramMbz/nakas-gk/releases">
      <img src="https://img.shields.io/badge/release-v0.4.0-white" alt="Release v0.4.0">
    </a><a href="https://github.com/glitchkids">
      <img src="assets/media/img/glitch-kids-suite.svg" alt="Glitch Kids Suite">
    </a><a href="LICENSE">
      <img src="assets/media/img/license-mit.svg" alt="MIT License">
    </a><a href="https://nodejs.org/">
      <img src="assets/media/img/nodejs.svg" alt="Node.js">
    </a><a href="https://www.typescriptlang.org/">
      <img src="assets/media/img/typescript.svg" alt="TypeScript">
    </a><a href="https://react.dev/">
      <img src="assets/media/img/react.svg" alt="React">
    </a>
  </div>

  <!-- <p>
    <a href="https://github.com/IkramMbz/nakas-gk/stargazers">
      <img src="https://img.shields.io/github/stars/IkramMbz/nakas-gk?style=flat-square&label=stars" alt="GitHub Stars">
    </a>
    <a href="https://github.com/IkramMbz/nakas-gk/issues">
      <img src="https://img.shields.io/github/issues/IkramMbz/nakas-gk?style=flat-square&label=issues" alt="Open Issues">
    </a>
    <a href="https://github.com/IkramMbz/nakas-gk/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/IkramMbz/nakas-gk?style=flat-square&label=contributors" alt="Contributors">
    </a>
  </p> -->


  <div>
    <a href="#installation">Installation</a>
    <a href="#usage">Usage</a>
    <a href="https://github.com/IkramMbz/nakas-gk/issues/new">Report a Bug</a>
    <a href="https://github.com/IkramMbz/nakas-gk/issues/new">Request a Feature</a>
    <a href="LICENSE">License</a>
  </div>
</div>


**nakas.gk** by Glitch Kids, is a lightweight React Developer Toolkit for auditing, debugging, and optimizing web applications.

Framework-agnostic, it works with any React-based setup (Astro, Next.js, Vite, etc.).
<!-- 🟠 -->

**Note:** nakas.gk is currently in the testing phase and is not yet available on npm. It will be released soon.

A dock of **Nakas** (diagnostic agents) for web development, framework-agnostic:

- **L** — live SEO audit of the displayed page (49 checks, rerun on every DOM change).
- **Amalia** — project import analysis (missing files, undeclared dependencies, cycles…), run in a locked-down sandbox.
- **Bob** — skill for creating new Nakas.

The UI lives in a **shadow DOM**: it inherits no CSS from your page, doesn't alter it, and is excluded from the SEO audit. By default it only shows on a local host (localhost, `*.local`, private networks).

> Client: any modern browser. Server part (import analysis): **Node ≥ 22.13**, development only (404 in production).

## Installation

```bash
pnpm add -D https://github.com/IkramMbz/nakas-gk
```

## Integration (2 steps: client, then server for Amalia)

The SEO audit works with the client alone. The Imports panel needs a `GET /api/nakas/*` route in development.

### Vite · Astro · SvelteKit · Nuxt (Vite plugin)

```ts
// vite.config.ts (Astro: `vite: { plugins: [nakas()] }` in astro.config)
import { nakas } from "nakas-gk/server";
export default { plugins: [nakas()] };
```

```ts
// client entry point (Astro: <script> in the layout)
import { mountNakas } from "nakas-gk";
void mountNakas();
```

### React (Vite, Remix…)

```tsx
import { Nakas } from "nakas-gk/react";
<Nakas />; // uses your app's React
```

### Next.js (App Router)

```ts
// app/api/nakas/[...path]/route.ts
import { createNakasHandler } from "nakas-gk/server";
export const dynamic = "force-dynamic";
export const GET = createNakasHandler();
```

```tsx
// app/layout.tsx: <Nakas /> can be rendered from a Server Component
import { Nakas } from "nakas-gk/react";
// …inside <body>: <Nakas />
```

### Vue

```ts
import { onMounted, onBeforeUnmount } from "vue";
import { mountNakas, type NakasHandle } from "nakas-gk";
let handle: NakasHandle | undefined;
onMounted(async () => (handle = await mountNakas()));
onBeforeUnmount(() => handle?.unmount());
```

### Angular, or any project without server integration

```bash
npx nakas serve .            # http://127.0.0.1:4321/api/nakas (loopback only)
```

```ts
import { mountNakas } from "nakas-gk";
void mountNakas({ endpoint: "http://127.0.0.1:4321/api/nakas" }); // ngAfterViewInit
```

### No code: `import "nakas-gk/auto";`

### Options (`mountNakas` / `<Nakas />`)

| Option            | Default                                  | Purpose                             |
| ----------------- | ---------------------------------------- | ----------------------------------- |
| `enabled`         | auto (local host)                        | `true`/`false` to force             |
| `endpoint`        | `/api/nakas`                             | Base URL of the development API     |
| `contentSelector` | `main`, `[role=main]`, `article`, `body` | Content area used by the SEO checks |

Server options (`nakas()`, `createNakasHandler()`, `createNakasMiddleware()`, `startNakasServer()`): `root`, `strict` (refuse to run without strong network isolation), `imports.dirs` (default: `src` if it exists, otherwise the whole project).

## Troubleshooting

- **Imports panel: "Route … introuvable"** (the UI text is in French; it means the route was not found) → the server adapter isn't wired up (see above).
- **"Serveur de développement injoignable"** (dev server unreachable) → the panel retries on its own (1 s → 10 s) and recovers as soon as the server is back; no need to reload the page or re-save the config.
- **Nothing shows up** → the host isn't local: pass `enabled: true`.
- **No imports analyzed** → check `imports.dirs` and run `pnpm run devkit:verify`.

## Repository commands

| Command                                  | Purpose                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm run check`                         | everything: format, lint, types, generated files, CSS, lock, tests, build, package |
| `pnpm test`                              | devkit tests (`node --test`), then unit tests (vitest)                             |
| `pnpm run typecheck`                     | 4 TypeScript projects (full, client, server, JS agents)                            |
| `pnpm run lint` · `fmt` · `fmt:check`    | oxlint (type-aware) · oxfmt                                                        |
| `pnpm run generate`                      | avatar registry, skills, embedded CSS                                              |
| `pnpm run css:check`                     | dead or missing CSS classes and variables                                          |
| `pnpm run devkit:verify` · `devkit:lock` | verify / regenerate `agents.lock`                                                  |
| `pnpm run build` · `verify:pack`         | build `dist/` · check the built package                                            |
| `pnpm run dev`                           | continuous recompilation                                                           |

## Contributing

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (where to make changes) and [`SECURITY.md`](SECURITY.md). Conventions: one file = one responsibility; no `any`; no build-environment access in client code; styling in dedicated CSS (inline variables only for dynamic values); any change under `src/devkit/agents/` ends with `pnpm run devkit:lock`.

## Licenses

MIT. Avatar illustrations are CC BY: see [`NOTICE.md`](NOTICE.md).
