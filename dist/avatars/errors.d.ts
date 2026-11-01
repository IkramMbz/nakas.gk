export type AvatarErrorCode = "INVALID_SEED" | "INVALID_OPTION" | "UNKNOWN_LAYER" | "UNKNOWN_PART" | "EMPTY_LAYER" | "UNKNOWN_COLOR" | "INVALID_COLOR" | "EMPTY_PALETTE";
export declare class AvatarError extends Error {
    readonly code: AvatarErrorCode;
    constructor(code: AvatarErrorCode, message: string);
}
//# sourceMappingURL=errors.d.ts.map