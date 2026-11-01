// Typed errors: the CLI and adapters act on `code`.
export class DevkitError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "DevkitError";
        this.code = code;
    }
}

// E_USAGE   : bad caller input
// E_POLICY  : rejected by policy (non-compliant agent, forbidden workspace)
// E_LOCK    : agent missing from agents.lock or modified
// E_SANDBOX : isolation impossible or agent died abnormally
// E_TIMEOUT : time budget exceeded
// E_OUTPUT  : agent output invalid or too large
export const EXIT_CODES = Object.freeze({
    E_USAGE: 2,
    E_POLICY: 3,
    E_LOCK: 3,
    E_SANDBOX: 3,
    E_TIMEOUT: 3,
    E_OUTPUT: 3
});
