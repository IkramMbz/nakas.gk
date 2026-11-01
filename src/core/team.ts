import { amalia } from "../agents/imports/identity.js";
import { bob } from "../agents/creator/identity.js";
import { l } from "../agents/seo/identity.js";
import type { Nakas } from "./nakas.js";

/** The team, in dock display order. Add a Nakas by adding it here. */
export const TEAM = [amalia, l, bob] as const satisfies readonly Nakas[];

export type NakasId = (typeof TEAM)[number]["id"];
