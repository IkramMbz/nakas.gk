/** Check on the content area: fails cleanly if it is missing. */
export function onContent(id, run) {
    return {
        id,
        run: (ctx) => {
            const { element, problem } = ctx.mainContent();
            return element
                ? run(element, ctx)
                : { status: "error", message: problem ?? "Content area not found" };
        }
    };
}
/** External link = valid URL whose host differs from the page host. */
export function isExternal(a, ctx) {
    try {
        return new URL(a.href, ctx.loc.href).hostname !== ctx.hostname;
    }
    catch {
        return false;
    }
}
export function isInternal(a, ctx) {
    try {
        return new URL(a.href, ctx.loc.href).hostname === ctx.hostname;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=types.js.map