# Security

## Reporting a vulnerability

Use the repository's **GitHub Security Advisories** (private report): go to the **Security** tab, then **Report a vulnerability**. Do not open a public issue.

Please include:

- the affected version (see `package.json`) and your setup (framework, Node version, OS);
- the steps to reproduce, or a minimal proof of concept;
- the impact you expect (for example: reading a file outside `imports.dirs`, writing outside `public/`, reaching the server from a non-local origin).

## Supported versions

nakas.gk is in its testing phase. Only the latest release receives security fixes.

## Security model

nakas.gk is a development tool. It exposes a local API that reads your project files (Amalia) and writes to `public/` (Alfred). It is designed to never reach production and never be reachable from outside your machine.

- **Development only.** Server adapters return **404 in production** (`NODE_ENV=production`), and the Vite plugin is absent from builds.
- **Local only.** The standalone server (`nakas serve`) listens on loopback only and rejects non-local `Host` and `Origin` headers. The dock itself only shows on a local host by default.
- **Sandboxed agents.** Amalia and Alfred run in the DevKit sandbox, locked by `agents.lock`. The `strict` server option refuses to run without strong network isolation.
- **Limited file access.** Amalia analyzes the directories listed in `imports.dirs`. Alfred writes only into a new dated folder inside `public/`.

The full threat model is in [`src/devkit/SECURITY.md`](src/devkit/SECURITY.md).

## In scope

- Bypassing the production 404, or shipping nakas.gk code in a production build.
- Reaching the development API from a non-local origin or host (DNS rebinding, `Origin` spoofing, and similar).
- Reading files outside the analyzed directories, or writing outside the intended `public/` folder (path traversal).
- Escaping the DevKit sandbox, or modifying an agent without invalidating `agents.lock`.

## Out of scope

- Issues that require you to run nakas.gk in production or to expose the standalone server beyond loopback on purpose.
- Vulnerabilities in your own application or in third-party dependencies, unless nakas.gk makes them exploitable.