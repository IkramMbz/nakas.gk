import { createNakasApi } from "./api.js";
import { MAX_WRITE_BODY_BYTES, TOKEN_HEADER } from "./security.js";
/** Reads a small body without ever holding more than the cap in memory. */
async function readBody(request) {
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_WRITE_BODY_BYTES) {
        return { text: "", tooLarge: true };
    }
    const reader = request.body?.getReader();
    if (!reader)
        return { text: "", tooLarge: false };
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > MAX_WRITE_BODY_BYTES) {
            await reader.cancel();
            return { text: "", tooLarge: true };
        }
        chunks.push(value);
    }
    const all = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        all.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return { text: new TextDecoder().decode(all), tooLarge: false };
}
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
export function createNakasHandler(options = {}) {
    const api = createNakasApi(options);
    return async function handler(request) {
        const posted = request.method === "POST" ? await readBody(request) : undefined;
        const { status, body, headers } = await api.handle({
            method: request.method,
            url: request.url,
            host: request.headers.get("host") ?? undefined,
            origin: request.headers.get("origin") ?? undefined,
            fetchSite: request.headers.get("sec-fetch-site") ?? undefined,
            contentType: request.headers.get("content-type") ?? undefined,
            token: request.headers.get(TOKEN_HEADER) ?? undefined,
            body: posted?.text,
            bodyTooLarge: posted?.tooLarge
        });
        return new Response(JSON.stringify(body), { status, headers });
    };
}
//# sourceMappingURL=web.js.map