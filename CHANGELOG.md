# Changelog

## 0.4.0 — overhaul

**Breaking changes**

- A single type: `Nakas` (the `Agent` type is removed).
- Entry points: `nakas-gk` (`mountNakas`), `nakas-gk/react` (`<Nakas />`), `nakas-gk/server`, `nakas-gk/auto`, `nakas-gk/avatars`, `nakas-gk/devkit`. The `nakas` export (lowercase component) and `nakas-gk/styles.css` are gone: the CSS is embedded in a shadow DOM.
- `imports.dir` (server) becomes `imports.dirs`.

**Fixed**

- DevKit lock and sandbox reconnected: the `import-doctor` agent exists, `agents.lock` is valid, the server goes through `runAgent()`.
- Imports panel stuck on an error with no way to retry; now reconnects automatically and caches by fingerprint.
- Dock keyboard navigation (nonexistent selector), click-outside closing in a shadow DOM, SEO audit that analyzed itself and ran while the panel was closed.
- Sandbox rejected the exact minimum Node version; `SKILL.md` rewritten by the formatter and rejected by the parser.
- Devkit tests not running; avatar snapshot depending on assets.
- Global CSS that colored the host page's `body`/`html`; dead rules removed.
