/** `ogTitle` → `Og Title` */
export const formatLabel = (text) => text.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
export function toCheckItems(audit) {
    return Object.entries(audit.checks).map(([id, { status, message }]) => ({
        id,
        status,
        title: formatLabel(id),
        details: [{ id, message }]
    }));
}
export function complianceOf(audit) {
    const percentage = audit.total === 0 ? 0 : Math.round((audit.score / audit.total) * 100);
    return {
        percentage,
        tone: percentage < 60 ? "error" : percentage < 80 ? "warning" : "success"
    };
}
//# sourceMappingURL=audit-view.js.map