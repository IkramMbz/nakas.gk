export class AvatarError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "AvatarError";
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map