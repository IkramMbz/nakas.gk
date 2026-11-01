import { failure, info, success, warning } from "../result.js";
import type { SeoCheck } from "./types.js";

/** 1. Document foundations. */
export const foundationChecks: readonly SeoCheck[] = [
    {
        id: "html5Structure",
        run: ({ doc }) => {
            const obsolete = doc.querySelectorAll(
                "font,center,bgsound,marquee,big,strike,tt,frame,frameset"
            );
            if (doc.doctype?.name !== "html") return failure("Missing HTML5 doctype");
            if (obsolete.length > 0) return failure(`${obsolete.length} obsolete HTML tags found`);
            return success("Valid HTML5 structure");
        }
    },
    {
        id: "charset",
        run: ({ doc }) => {
            const charset = doc.characterSet?.toUpperCase();
            if (!charset) return failure("Missing charset declaration");
            if (charset !== "UTF-8")
                return warning(`Non-standard charset: ${charset} (UTF-8 recommended)`);
            return success("UTF-8");
        }
    },
    {
        id: "lang",
        run: ({ docElement }) => {
            const lang = docElement.lang;
            if (!lang) return failure("Missing lang attribute on <html>");
            if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(lang))
                return warning(`Invalid language code: ${lang}`);
            return success(`Language: ${lang}`);
        }
    },
    {
        id: "viewport",
        run: (ctx) => {
            const viewport = ctx.metaViewport();
            if (!viewport) return failure("Missing viewport meta tag (critical for mobile)");
            if (!viewport.content.includes("width=device-width"))
                return warning("Viewport missing width=device-width");
            return success(viewport.content);
        }
    },
    {
        id: "manifestFile",
        run: ({ doc }) => {
            const manifest = doc.querySelector<HTMLLinkElement>('link[rel="manifest"]');
            return manifest
                ? success(`Found: ${manifest.href}`)
                : info("No manifest.json (PWA recommended)");
        }
    }
];
