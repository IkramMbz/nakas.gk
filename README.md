<div align="center">
  <a href="https://github.com/IkramMbz/nakas.gk">
    <img
      src="assets/media/img/nakas-gk-banner.png"
      alt="nakas.gk Logo"
    >
  </a>

  <hr />

  <p>
    <strong>Live SEO audit and import analysis for your React app, right in the browser during development.</strong>
    <br>
    A dock of diagnostic agents that runs 49 SEO checks on every DOM change, detects missing files, undeclared dependencies and import cycles in your project, and generates PWA icons and <code>manifest.json</code> from a single PNG.
  </p>

  <p>
    <a href="https://github.com/IkramMbz/nakas.gk/releases"><img src="https://img.shields.io/badge/release-v0.4.2-white" alt="Release v0.4.2"></a>
    <a href="https://glitchkids.space/"><img src="https://img.shields.io/badge/Glitch%20Kids-Suite-black" alt="Glitch Kids Suite"></a>
    <a href="https://github.com/IkramMbz/nakas.gk/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%E2%89%A5%2022.13-339933?logo=node.js&logoColor=white" alt="Node.js >= 22.13"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
  </p>

  <p>
    <strong>Tested with</strong><br><br>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" alt="React"></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white" alt="Next.js"></a>
    <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite"></a>
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white" alt="Astro"></a>
  </p>

  <p>
    <a href="#requirements">Requirements</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="#quick-start">Quick start</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="#integration">Integration</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="#security">Security</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="#troubleshooting">Troubleshooting</a>&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="#license">License</a>
  </p>

  <br>
</div>

**nakas.gk** by Glitch Kids is a development-only toolkit for React projects. It adds a dock to your running app with a team of agents, the **Nakas**, each one in charge of a single diagnostic task. Nothing is shipped to production.

<!-- Add a screenshot of the Nakas dock here, e.g. ![The Nakas dock](docs/dock.png) -->

> [!WARNING]
> nakas.gk is currently in the testing phase and is not yet available on npm. It will be released soon. Until then, install it from GitHub (see [Installation](#installation)).

## Compatibility

| Status | Setups |
| --- | --- |
| Tested | React, Next.js (App Router), Vite, Astro |
| Should work, not tested | SvelteKit, Nuxt, Vue, Angular. See [Untested setups](#untested-setups) |

## Meet the Nakas

| Feature | Naka | What it does |
| --- | --- | --- |
| SEO audit | **L** | Live SEO audit of the displayed page: 49 checks, rerun on every DOM change. |
| Import analysis | **Amalia** | Analyzes your project's imports (missing files, undeclared dependencies, cycles…), run in a locked-down sandbox. |
| PWA assets | **Alfred** | Generates PWA icons and `manifest.json` from a PNG into a new dated folder of `public/`, run in a locked-down sandbox. |
| Naka creation | **Bob** | A skill for contributors, used to create new Nakas. It is not part of the dock. |

The UI lives in a shadow DOM: it inherits no CSS from your page, does not alter it, and is excluded from the SEO audit. By default it only shows on a local host (`localhost`, `*.local`, private networks).

## Requirements

- **Client:** any modern browser.
- **Server part** (import analysis, PWA assets): Node ≥ 22.13, development only (returns 404 in production).
- **Package manager:** the examples use pnpm.

## Installation

```bash
pnpm add -D https://github.com/IkramMbz/nakas.gk
```

## Quick start

The fastest setup, with Vite and React. The integration has two parts: a **server** plugin that exposes the development API, and a **client** that mounts the dock.

**1. Add the plugin to `vite.config.ts`**

```ts
import { nakas } from "nakas-gk/server";

export default {
  plugins: [nakas()]
};
```

**2. Render the dock in your app**

```tsx
import { Nakas } from "nakas-gk/react";

<Nakas />; // Uses your app's React
```

Start your dev server: the dock appears. The SEO audit works with the client alone; the Imports panel (Amalia) requires the server part.

## Integration

### Vite

Same as the [Quick start](#quick-start). Without React, mount the dock from your client entry point:

```ts
import { mountNakas } from "nakas-gk";

void mountNakas();
```

### Next.js (App Router)

**Server route** — `app/api/nakas/[...path]/route.ts`

```ts
import { createNakasHandler } from "nakas-gk/server";

export const dynamic = "force-dynamic";
export const GET = createNakasHandler();
```

**Client** — `app/layout.tsx`

Import `Nakas` from the React entry point and render it inside `<body>`.

```tsx
import { Nakas } from "nakas-gk/react";

// Inside <body>:
<Nakas />
```

### Astro

**Server** — `astro.config.ts`

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

**Client**

Add the following script inside the `<head>` of your main Astro layout (or of the component that renders your `<head>`, if you have one).

```astro
{import.meta.env.DEV && (
  <script>
    import { mountNakas } from "nakas-gk";

    void mountNakas({ enabled: true });
  </script>
)}
```

> [!IMPORTANT]
> - The code must be placed inside the HTML `<head>`.
> - Do not use `is:inline` on this script. Astro must process it through Vite to resolve the `nakas-gk` package correctly.
> - `import.meta.env.DEV` ensures Nakas is loaded only during development.
> - `enabled: true` forces the dock to appear, even if local host detection does not recognize your development environment.

### Options

For `mountNakas()` and `<Nakas />`:

| Option | Default | Purpose |
| --- | --- | --- |
| `enabled` | auto (local host) | `true` / `false` to force |
| `endpoint` | `/api/nakas` | Base URL of the development API |
| `contentSelector` | `main, [role=main], article, body` | Content area used by the SEO checks |

For the server (`nakas()`, `createNakasHandler()`, `createNakasMiddleware()`, `startNakasServer()`):

| Option | Default | Purpose |
| --- | --- | --- |
| `root` | project root | Project directory to work on |
| `strict` | off | Refuse to run without strong network isolation |
| `imports.dirs` | `src` if it exists, otherwise the whole project | Directories analyzed by Amalia |

## Security

nakas.gk exposes a development API that reads your project files and, through Alfred, writes to `public/`. It is designed to stay out of your production build:

- **Development only.** The server part returns 404 in production, and the client is meant to be loaded in development only.
- **Local by default.** The dock only shows on a local host unless you force it with `enabled: true`.
- **Loopback only.** The standalone server (`npx nakas serve`) listens on `127.0.0.1` only.
- **Sandboxed agents.** Amalia and Alfred run in a locked-down sandbox. Set `strict` to refuse to run when strong network isolation is not available.
- **Scoped access.** Amalia analyzes the directories listed in `imports.dirs`. Alfred writes only to a new dated folder inside `public/`, so existing files are not overwritten.

See [SECURITY.md](SECURITY.md) for the full policy and how to report a vulnerability.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Imports panel: "Route … not found" | The server adapter is not wired up. See [Integration](#integration). |
| "Development server unreachable" | The panel retries on its own (1 s → 10 s) and recovers as soon as the server is back. No need to reload the page or re-save the config. |
| Nothing shows up | The host is not detected as local. Pass `enabled: true`. |
| No imports analyzed | Check `imports.dirs` and run `pnpm run devkit:verify`. |

## Untested setups

The following setups follow the same two-part integration (server + client) but have **not been tested yet**. Feedback is welcome: [report a bug](https://github.com/IkramMbz/nakas.gk/issues) or tell us it works.

### SvelteKit · Nuxt

Both use Vite: add `nakas()` from `nakas-gk/server` to the Vite plugins as shown in the [Vite](#vite) section, then mount the client with `mountNakas()`.

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

The API will be available at `http://127.0.0.1:4321/api/nakas` (loopback only). Then mount the client:

```ts
import { mountNakas } from "nakas-gk";

void mountNakas({
  endpoint: "http://127.0.0.1:4321/api/nakas"
});
```

### No-code client integration

Where package resolution is handled by the bundler, you can mount Nakas without calling `mountNakas()`:

```ts
import "nakas-gk/auto";
```

## Contributing

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (where to make changes) and [SECURITY.md](SECURITY.md).

Conventions: one file = one responsibility; no `any`; no build-environment access in client code; styling in dedicated CSS (inline variables only for dynamic values); any change under `src/devkit/agents/` ends with `pnpm run devkit:lock`.

### Repository commands

| Command | Purpose |
| --- | --- |
| `pnpm run check` | Everything: format, lint, types, generated files, CSS, lock, tests, build, package |
| `pnpm test` | Devkit tests (`node --test`), then unit tests (vitest) |
| `pnpm run typecheck` | 4 TypeScript projects (full, client, server, JS agents) |
| `pnpm run lint` · `fmt` · `fmt:check` | oxlint (type-aware) · oxfmt |
| `pnpm run generate` | Avatar registry, skills, embedded CSS |
| `pnpm run css:check` | Dead or missing CSS classes and variables |
| `pnpm run devkit:verify` · `devkit:lock` | Verify / regenerate `agents.lock` |
| `pnpm run build` · `verify:pack` | Build `dist/` · check the built package |
| `pnpm run dev` | Continuous recompilation |

## License

MIT. Avatar illustrations are CC BY: see [NOTICE.md](NOTICE.md).
