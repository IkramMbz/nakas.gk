import { failure, success, warning } from "../result.js";
import type { SeoCheck } from "./types.js";

/** 4. Content structure (headings). */
export const structureChecks: readonly SeoCheck[] = [
    {
        id: "h1",
        run: (ctx) => {
            const h1s = ctx.headings().filter((h) => h.tagName === "H1");
            if (h1s.length === 0) return failure("No H1 found");
            if (h1s.length > 1) return warning(`${h1s.length} H1 tags (only 1 recommended)`);
            const text = h1s[0]?.textContent?.trim() || "";
            if (!text) return failure("H1 is empty");
            if (text.length < 20) return warning(`Short H1: "${text}"`);
            return success(`"${text.slice(0, 60)}${text.length > 60 ? "..." : ""}"`);
        }
    },
    {
        id: "headingHierarchy",
        run: (ctx) => {
            const headings = ctx.headings();
            if (headings.length === 0) return failure("No heading tags found");
            const issues: string[] = [];
            let last = 0;
            headings.forEach((heading, index) => {
                const level = Number.parseInt(heading.tagName[1] ?? "0", 10);
                if (last > 0 && level > last + 1)
                    issues.push(`Skip H${last}→H${level} at position ${index + 1}`);
                if (!heading.textContent?.trim())
                    issues.push(`Empty ${heading.tagName} at position ${index + 1}`);
                last = level;
            });
            return issues.length > 0
                ? warning(issues.join("; "))
                : success(`${headings.length} headings with proper hierarchy`);
        }
    }
];
