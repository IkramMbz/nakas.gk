import type { NakasServerOptions } from "./types.js";
/**
 * "Fetch API" adapter: Next.js (App Router), SvelteKit, Remix, Hono, Nuxt/Nitro…
 * Any router that provides a standard `Request` and accepts a `Response`.
 *
 * Export it for GET (read) AND POST (Alfred writes files): both go through the same checks.
 *
 * @example Next.js — `app/api/nakas/[...path]/route.ts`
 * export const dynamic = "force-dynamic";
 * const handler = createNakasHandler();
 * export const GET = handler;
 * export const POST = handler;
 */
export declare function createNakasHandler(options?: NakasServerOptions): (request: Request) => Promise<Response>;
//# sourceMappingURL=web.d.ts.map