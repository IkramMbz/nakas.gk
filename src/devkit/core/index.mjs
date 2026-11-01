// Stable public surface. An adapter (dev server, Cursor, VS Code, GitHub Action)
// imports only this:
//   const result = await runAgent({ name: 'import-doctor', workspace: '/path/to/project' });
export { runAgent, workspaceFingerprint, DEFAULT_ROOT } from "./runner.mjs";
export { DevkitError, EXIT_CODES } from "./errors.mjs";
export { loadAgent } from "./agent.mjs";
export { listAgentNames, loadLock } from "./lock.mjs";
