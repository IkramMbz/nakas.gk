import { contentChecks } from "./content.js";
import { foundationChecks } from "./foundation.js";
import { imageChecks } from "./images.js";
import { indexingChecks } from "./indexing.js";
import { i18nChecks, linkChecks } from "./links.js";
import { metadataChecks } from "./metadata.js";
import { openGraphChecks, twitterChecks } from "./social.js";
import { structureChecks } from "./structure.js";
import { structuredDataChecks } from "./structured-data.js";
import {
    accessibilityChecks,
    mobileChecks,
    performanceChecks,
    securityChecks,
    trackingChecks
} from "./technical.js";
import type { SeoCheck } from "./types.js";

/** All checks, in display order. Add a check by adding it to its group. */
export const SEO_CHECKS: readonly SeoCheck[] = [
    ...foundationChecks,
    ...indexingChecks,
    ...metadataChecks,
    ...structureChecks,
    ...contentChecks,
    ...imageChecks,
    ...linkChecks,
    ...i18nChecks,
    ...openGraphChecks,
    ...twitterChecks,
    ...structuredDataChecks,
    ...performanceChecks,
    ...trackingChecks,
    ...securityChecks,
    ...accessibilityChecks,
    ...mobileChecks
];

export type { SeoCheck };
