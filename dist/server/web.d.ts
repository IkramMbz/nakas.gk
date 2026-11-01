import type { NakasServerOptions } from "./types.js";
/**
 * "Fetch API" adapter: Next.js (App Router), SvelteKit, Remix, Hono, Nuxt/Nitro…
 * Any router that provides a standard `Request` and accepts a `Response`.
 *
 * @example Next.js — `app/api/nakas/[...path]/route.ts`
 * export const dynamic = "force-dynamic";
 * export const GET = createNakasHandler();
 */
export declare function createNakasHandler(options?: NakasServerOptions): (request: Request) => Promise<Response>;
//# sourceMappingURL=web.d.ts.map