# Security

## Reporting a vulnerability

Use **Security → Report a vulnerability** (private GitHub report). No public issues.

## Threat model

DevKit runs **agent scripts** on **a project you may not control**.
Two things are untrusted: the **contents of the analyzed workspace** and a **third-party agent** copied in by hand.
What we protect: your files, your secrets, your machine, your terminal/IDE.

## What the code enforces (not the instructions)

| Risk                                                      | Mitigation                                                                                                                                                                                                            | Where                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Agent reads files outside the project / secrets           | The **parent** reads the workspace; the agent gets an in-memory snapshot. The child runs under `node --permission` with read access limited to `core/host.mjs` + its temp copy. `.env`, keys, `.ssh`… are never read. | `paths.mjs`, `sandbox.mjs`      |
| Escape via symlink / TOCTOU                               | Symlinks are never followed (`lstat` + `O_NOFOLLOW` + confined `realpath`)                                                                                                                                            | `paths.mjs`                     |
| Writing / running commands                                | `--permission` without `--allow-fs-write`, `--allow-child-process`, `--allow-worker`, `--allow-addons`; no shell                                                                                                      | `sandbox.mjs`                   |
| Network leak                                              | Empty network namespace (`unshare -rn`, Linux) + `fetch`/`WebSocket` removed. `--strict` refuses to run without a namespace                                                                                           | `sandbox.mjs`, `host.mjs`       |
| Environment leak                                          | Empty `env`                                                                                                                                                                                                           | `sandbox.mjs`                   |
| Infinite loop / CPU                                       | Hard timeout (SIGKILL on the process group)                                                                                                                                                                           | `sandbox.mjs`                   |
| Memory exhaustion                                         | `--max-old-space-size`, snapshot ≤ 16 MiB, disposable child (nothing survives a run)                                                                                                                                  | `sandbox.mjs`, `policy.mjs`     |
| Output flood                                              | stdout/stderr sent to `/dev/null`; result capped at 1 MiB                                                                                                                                                             | `sandbox.mjs`                   |
| Agent modified after review                               | `agents.lock` (folder sha256); the executed agent is **the verified copy**, not what's on disk                                                                                                                        | `lock.mjs`, `agent.mjs`         |
| Inflated permissions in SKILL.md                          | Fixed ceiling: any value above it is a **rejection**, never a grant                                                                                                                                                   | `frontmatter.mjs`, `policy.mjs` |
| Booby-trapped output (ANSI, bidi, fake files, stray keys) | Each finding is rebuilt field by field, sanitized, and can only target a file that was actually provided                                                                                                              | `sanitize.mjs`                  |
| Sandbox accidentally disabled                             | Self-test on child startup: if a read/write outside the allowed scope succeeds, it **refuses to continue**                                                                                                            | `host.mjs`                      |
| Prompt injection via the repo                             | Repo content is data; the model can only launch **locked** agents by name                                                                                                                                             | `runner.mjs`                    |

## Known limits (honestly)

- Node's `--permission` is a **permission** barrier, not a VM: it is no defense against a V8/Node 0-day. For fully hostile code, add a container or VM on top.
- Static lint (`lint.mjs`) is a **tripwire**, not a boundary. The boundary is the sandbox.
- Outside Linux (or without user `unshare`), the network is only cut on a best-effort basis (globals removed, network imports rejected by lint). Use `--strict` in CI.
- `--max-old-space-size` bounds the V8 heap, not total native memory; the timeout remains the last safety net.
- `agents.lock` proves "unchanged since review", not "harmless": **review the diff** before `devkit lock`.

## Contribution rules

- An agent = `SKILL.md` + `.mjs` scripts, **zero dependencies**, imports limited to `path url util assert buffer string_decoder crypto events`.
- Any change to `core/` or `.github/` requires review (`.github/CODEOWNERS`).
- No `postinstall`, no runtime dependencies.
