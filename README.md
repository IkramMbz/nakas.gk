<div align="center">
  <a href="https://github.com/IkramMbz/nakas.gk">
    <img
      src="assets/media/img/logo-git.png"
      alt="nakas.gk Logo"
      width="136"
    >
  </a>

  <h1>nakas.gk</h1>

  <p>
    <strong>The React Developer Toolkit.</strong>
    <br>
    Audit SEO, inspect imports, and analyze your web applications directly from your development environment.
  </p>

  <p>
    <a href="https://github.com/IkramMbz/nakas.gk/releases"><img src="https://img.shields.io/badge/release-v0.4.2-white" alt="Release v0.4.2"></a>
    <a href="https://github.com/glitchkids"><img src="assets/media/img/glitch-kids-suite.svg" alt="Glitch Kids Suite"></a>
    <a href="LICENSE"><img src="assets/media/img/license-mit.svg" alt="MIT License"></a>
    <a href="https://nodejs.org/"><img src="assets/media/img/nodejs.svg" alt="Node.js"></a>
    <a href="https://www.typescriptlang.org/"><img src="assets/media/img/typescript.svg" alt="TypeScript"></a>
  </p>

  <p>
    <strong>Compatible with</strong><br><br>
    <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white" alt="Next.js">
    <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white" alt="Astro">
    <img src="https://img.shields.io/badge/Vue-4FC08D?logo=vue.js&logoColor=white" alt="Vue">
    <img src="https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white" alt="Angular">
    <img src="https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white" alt="SvelteKit">
    <img src="https://img.shields.io/badge/Nuxt-00DC82?logo=nuxt&logoColor=black" alt="Nuxt">
  </p>

  <p>
    <a href="#installation">Installation</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="#integration-2-steps-client-then-server-for-amalia">Usage</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://github.com/IkramMbz/nakas.gk/issues/new">Report a Bug</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://github.com/IkramMbz/nakas.gk/issues/new">Request a Feature</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="LICENSE">License</a>
  </p>

  <br>
</div>

**nakas.gk** by Glitch Kids, is a lightweight React Developer Toolkit for auditing, debugging, and optimizing web applications.

Framework-agnostic, it works with any React-based setup (Astro, Next.js, Vite, etc.).

> [!WARNING]
> nakas.gk is currently in the testing phase and is not yet available on npm. It will be released soon.

## Meet the Nakas

The **Nakas** are a team of diagnostic agents for web development. Each one has its own specialty, and they work side by side in a single dock.

<!-- <div align="center"> -->
  <img src="assets/media/img/dock-nakas.png" alt="The Nakas dock" width="256">
<!-- </div> -->

<!-- <br> -->

| Naka       | Role           | What it does                                                                                                           |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **L**      | SEO auditor    | Live SEO audit of the displayed page (49 checks, rerun on every DOM change).                                           |
| **Amalia** | Import analyst | Project import analysis (missing files, undeclared dependencies, cycles…), run in a locked-down sandbox.               |
| **Bob**    | Naka builder   | Skill for creating new Nakas.                                                                                          |
| **Alfred** | Manifest maker | Generates PWA icons and `manifest.json` from a PNG into a new dated folder of `public/`, run in a locked-down sandbox. |

The UI lives in a **shadow DOM**: it inherits no CSS from your page, doesn't alter it, and is excluded from the SEO audit. By default it only shows on a local host (localhost, `*.local`, private networks).

> Client: any modern browser. Server part (import analysis): **Node ≥ 22.13**, development only (404 in production).

## Installation

Install nakas.gk using pnpm:

```bash
pnpm add -D https://github.com/IkramMbz/nakas.gk
```

## Integration

The integration has two parts:

1. **Client:** mounts the Nakas dock and enables the SEO auditor.
2. **Server:** exposes the development API required by Amalia (import analysis).

The SEO audit works with the client alone. The Imports panel requires a `GET /api/nakas/*` development route.

### Vite · Astro · SvelteKit · Nuxt

#### 1. Server integration

Add the Nakas Vite plugin to your Vite configuration.

**Vite - `vite.config.ts`**

```ts
import { nakas } from "nakas-gk/server";

export default {
  plugins: [nakas()]
};
```

**Astro - `astro.config.ts`**

Add the plugin to your existing Astro configuration:

```ts
import { defineConfig } from "astro/config";
import { nakas } from "nakas-gk/server";

export default defineConfig({
  vite: {
    plugins: [nakas()]
  }
});
```

If you already have other Astro integrations, adapters, or Vite plugins, keep them and add `nakas()` to the existing `vite.plugins` array.

#### 2. Client integration

Mount Nakas from your application entry point.

**Vite - client entry point**

```ts
import { mountNakas } from "nakas-gk";

void mountNakas();
```

**Astro - `src/components/Head.astro`**

If your project uses a dedicated Head component, add the following code at the end of `src/components/Head.astro`, inside the component's HTML `<head>`.

```astro
{import.meta.env.DEV && (
  <script>
    import { mountNakas } from "nakas-gk";

    void mountNakas({ enabled: true });
  </script>
)}
```

**Important:**
- The code must be placed inside your `Head.astro` component, within the HTML `<head>`.
- Do not use `is:inline` on this script. Astro must process it through Vite to resolve the `nakas-gk` package correctly.
- `import.meta.env.DEV` ensures Nakas is loaded only during development.
- `enabled: true` forces the dock to appear, even if local host detection does not recognize your development environment.

If you don't have a dedicated `Head.astro` component, place the same code inside the `<head>` of your main Astro layout.

### React (Vite, Remix…)

Import and render the Nakas component inside your React application.

```tsx
import { Nakas } from "nakas-gk/react";

<Nakas />; // Uses your app's React
```

### Next.js (App Router)

**Server route - `app/api/nakas/[...path]/route.ts`**

```ts
import { createNakasHandler } from "nakas-gk/server";

export const dynamic = "force-dynamic";
export const GET = createNakasHandler();
```

**Client - `app/layout.tsx`**

Import Nakas from the React entry point and render it inside `<body>`.

```tsx
import { Nakas } from "nakas-gk/react";

// Inside <body>:
<Nakas />
```

### Vue

Mount Nakas when the component is mounted and clean it up when the component is destroyed.

```ts
import { onMounted, onBeforeUnmount } from "vue";
import { mountNakas, type NakasHandle } from "nakas-gk";

let handle: NakasHandle | undefined;

onMounted(async () => {
  handle = await mountNakas();
});

onBeforeUnmount(() => handle?.unmount());
```

### Angular, or any project without server integration

Start the standalone development server:

```bash
npx nakas serve .
```

The API will be available at:

`http://127.0.0.1:4321/api/nakas`

The server is loopback-only.

Then mount the client:

```ts
import { mountNakas } from "nakas-gk";

void mountNakas({
  endpoint: "http://127.0.0.1:4321/api/nakas"
});
```

### No-code client integration

For supported setups where package resolution is handled by the bundler, you can automatically mount Nakas without explicitly calling `mountNakas()`.

```ts
import "nakas-gk/auto";
```

### Options (`mountNakas` / `<Nakas />`)

| Option            | Default                                  | Purpose                             |
| ----------------- | ---------------------------------------- | ----------------------------------- |
| `enabled`         | auto (local host)                        | `true`/`false` to force             |
| `endpoint`        | `/api/nakas`                             | Base URL of the development API     |
| `contentSelector` | `main`, `[role=main]`, `article`, `body` | Content area used by the SEO checks |

Server options (`nakas()`, `createNakasHandler()`, `createNakasMiddleware()`, `startNakasServer()`): `root`, `strict` (refuse to run without strong network isolation), `imports.dirs` (default: `src` if it exists, otherwise the whole project).

## Troubleshooting

- **Imports panel: "Route … not found"** → the server adapter isn't wired up (see above).
- **"Development server unreachable"** → the panel retries on its own (1 s → 10 s) and recovers as soon as the server is back; no need to reload the page or re-save the config.
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
