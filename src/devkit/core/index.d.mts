/** DevKit public contract (`devkit.result/1`). Implementations are plain JS (`*.mjs`). */

export type Severity = "error" | "warning" | "info";
export type Confidence = "high" | "medium" | "low";

export interface Finding {
    rule: string;
    severity: Severity;
    file: string;
    line: number;
    evidence: string;
    message: string;
    confidence: Confidence;
}

export interface AgentPermissions {
    read: "workspace" | "none";
    write: "none";
    network: "none";
    exec: "none";
}

export interface IsolationReport {
    fsRead: "node-permission";
    /** `netns`: network cut by an empty namespace. `best-effort`: globals removed only. */
    network: "netns" | "best-effort";
    exec: "blocked";
    write: "blocked";
}

export interface WorkspaceReport {
    files: number;
    bytes: number;
    /** A limit (files, bytes, depth) was hit: partial results. */
    truncated: boolean;
    /** The `include` scope does not cover the whole workspace. */
    partial: boolean;
    skipped: Readonly<Record<string, number>>;
}

export interface AgentResult {
    schema: "devkit.result/1";
    agent: {
        name: string;
        sha256: string;
        description: string;
        permissions: AgentPermissions;
    };
    workspace: WorkspaceReport;
    isolation: IsolationReport;
    findings: Finding[];
    /** Invalid findings rejected by the runner (never forwarded). */
    rejected: number;
    durationMs: number;
}

export interface RunAgentOptions {
    /** Agent folder name (`a-z`, `0-9`, `-`, 2 to 40 chars). */
    name: string;
    /** Project folder to analyze. */
    workspace: string;
    /** DevKit root containing `agents/` and `agents.lock` (default: the package's). */
    root?: string;
    /** Refuses to run without strong network isolation. */
    strict?: boolean;
    timeoutMs?: number;
    /** Workspace folders to read (relative). Default: whole workspace. */
    include?: readonly string[];
}

export declare const DEFAULT_ROOT: string;

export declare function runAgent(options: RunAgentOptions): Promise<AgentResult>;

/** Cheap fingerprint (no content read) of what `runAgent` would read. */
export declare function workspaceFingerprint(options: {
    workspace: string;
    include?: readonly string[];
}): Promise<string>;

export type DevkitErrorCode =
    | "E_USAGE"
    | "E_POLICY"
    | "E_LOCK"
    | "E_SANDBOX"
    | "E_TIMEOUT"
    | "E_OUTPUT";

export declare class DevkitError extends Error {
    readonly code: DevkitErrorCode;
    constructor(code: DevkitErrorCode, message: string);
}

export declare const EXIT_CODES: Readonly<Record<DevkitErrorCode, number>>;

export interface LoadedAgent {
    name: string;
    sha256: string;
    description: string;
    script: string;
    permissions: AgentPermissions;
}

export declare function loadAgent(
    root: string,
    name: string,
    options?: { requireLock?: boolean }
): Promise<LoadedAgent>;
export declare function listAgentNames(root: string): Promise<string[]>;
export declare function loadLock(root: string): Promise<Map<string, string>>;
