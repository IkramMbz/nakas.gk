import { createNakasApi } from "./api.js";
import type { NakasServerOptions } from "./types.js";

/**
 * "Fetch API" adapter: Next.js (App Router), SvelteKit, Remix, Hono, Nuxt/Nitro…
 * Any router that provides a standard `Request` and accepts a `Response`.
 *
 * @example Next.js — `app/api/nakas/[...path]/route.ts`
 * export const dynamic = "force-dynamic";
 * export const GET = createNakasHandler();
 */
export function createNakasHandler(options: NakasServerOptions = {}) {
    const api = createNakasApi(options);
    return async function GET(request: Request): Promise<Response> {
        const { status, body, headers } = await api.handle({
            method: request.method,
            url: request.url,
            host: request.headers.get("host") ?? undefined,
            origin: request.headers.get("origin") ?? undefined
        });
        return new Response(JSON.stringify(body), { status, headers });
    };
}
