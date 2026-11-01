export type AvatarErrorCode =
    | "INVALID_SEED"
    | "INVALID_OPTION"
    | "UNKNOWN_LAYER"
    | "UNKNOWN_PART"
    | "EMPTY_LAYER"
    | "UNKNOWN_COLOR"
    | "INVALID_COLOR"
    | "EMPTY_PALETTE";

export class AvatarError extends Error {
    readonly code: AvatarErrorCode;

    constructor(code: AvatarErrorCode, message: string) {
        super(message);
        this.name = "AvatarError";
        this.code = code;
    }
}
