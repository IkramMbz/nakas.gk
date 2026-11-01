import { SEO_RULES } from "../../rules.js";
import { failure, success, warning } from "../result.js";
import { onContent, type SeoCheck } from "./types.js";

const SENTENCE_SPLIT = /[.!?]+/;
const LONG_SENTENCE_WORDS = 25;
const DUPLICATE_LIMIT = 5;

/** 5. Content quality. */
export const contentChecks: readonly SeoCheck[] = [
    onContent("contentLengthAndQuality", (content) => {
        // Clone without navigation/decorative elements: only editorial text counts.
        const clone = content.cloneNode(true);
        if (!(clone instanceof Element)) return failure("Content area cannot be analysed");
        clone
            .querySelectorAll("nav,footer,header,aside,button,svg,noscript,script,style")
            .forEach((el) => el.remove());
        const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
        const words = text ? text.split(/\s+/).length : 0;
        if (text.length < SEO_RULES.CHAR_COUNT_MIN)
            return failure(`Insufficient: ${text.length} < ${SEO_RULES.CHAR_COUNT_MIN} chars`);
        if (words < SEO_RULES.WORD_COUNT_MIN)
            return warning(`Low: ${words} < ${SEO_RULES.WORD_COUNT_MIN} words`);
        return success(`${words} words, ${text.length} chars`);
    }),
    onContent("sentenceReadability", (content) => {
        const text = content.textContent?.trim() || "";
        const sentences = text.split(SENTENCE_SPLIT).filter((s) => s.trim().length > 0);
        if (sentences.length === 0) return warning("No readable sentences");
        const totalWords = text.split(/\s+/).filter(Boolean).length;
        const average = Math.round(totalWords / sentences.length);
        const long = sentences.filter((s) => s.trim().split(/\s+/).length > LONG_SENTENCE_WORDS);
        return long.length > sentences.length * 0.5
            ? warning(`${long.length} long sentences (avg ${average} words/sentence)`)
            : success(`Avg ${average} words/sentence`);
    }),
    onContent("duplicateContent", (content) => {
        const seen = new Set<string>();
        let duplicates = 0;
        for (const raw of (content.textContent || "").split(SENTENCE_SPLIT)) {
            const sentence = raw.trim().toLowerCase();
            if (sentence.length <= SEO_RULES.CHAR_BY_SENTENCE_MIN) continue;
            if (seen.has(sentence)) duplicates++;
            else seen.add(sentence);
        }
        return duplicates > DUPLICATE_LIMIT
            ? warning(`${duplicates} duplicate sentences detected`)
            : success("No significant duplication");
    })
];
