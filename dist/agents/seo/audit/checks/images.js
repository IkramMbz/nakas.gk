import { fromWarnings, success, warning } from "../result.js";
const MODERN_FORMATS = ["webp", "avif"];
/** 6. Images. */
export const imageChecks = [
    {
        id: "imagesAttributes",
        run: (ctx) => {
            const images = ctx.images();
            if (images.length === 0)
                return success("No images");
            const withoutAlt = images.filter((img) => !img.alt?.trim());
            const withoutSize = images.filter((img) => !img.width || !img.height);
            const eager = images.filter((img) => img.loading !== "lazy" && !img.hasAttribute("loading"));
            const warnings = [];
            if (withoutAlt.length > 0)
                warnings.push(`${withoutAlt.length}/${images.length} missing alt`);
            if (withoutSize.length > images.length * 0.3)
                warnings.push(`${withoutSize.length} missing dimensions (CLS)`);
            if (eager.length > images.length * 0.5 && images.length > 3)
                warnings.push(`${eager.length} not lazy-loaded`);
            return fromWarnings(warnings, `${images.length} images optimized`);
        }
    },
    {
        id: "imageFormats",
        run: (ctx) => {
            const images = ctx.images();
            if (images.length === 0)
                return success("No images");
            const hasModern = [...ctx.doc.querySelectorAll("picture source")].some((s) => {
                const type = s.getAttribute("type") || "";
                return MODERN_FORMATS.some((f) => type.includes(f));
            });
            const legacy = images.filter((img) => /\.(jpe?g|png)$/i.test(img.src));
            return legacy.length > images.length * 0.7 && !hasModern
                ? warning(`${legacy.length} legacy formats (use WebP/AVIF)`)
                : success("Modern formats used");
        }
    }
];
//# sourceMappingURL=images.js.map