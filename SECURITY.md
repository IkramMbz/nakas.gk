# Security

## Reporting a vulnerability

Use the repository's **GitHub Security Advisories** (private report). Do not open a public issue.

## Scope

- Server adapters exist only in development: they return **404 in production** (`NODE_ENV=production`) and the Vite plugin is absent from builds.
- The standalone server (`nakas serve`) listens on loopback only and rejects non-local `Host`/`Origin` headers.
- Agents run in the DevKit sandbox, locked by `agents.lock`. Full threat model: [`src/devkit/SECURITY.md`](src/devkit/SECURITY.md).
