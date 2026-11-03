// Minimal PNG codec: no dependency, `zlib` only (compute, no I/O).
// Decoding: non-interlaced PNG, color types 0/2/3/4/6, 8 or 16 bits (palette: 1/2/4/8).
// Everything else is refused with an explicit message, never guessed.
import { inflateSync, deflateSync, crc32 } from "node:zlib";

export const MAX_PIXELS = 16_000_000;
export const MAX_SIDE = 8192;

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const DEPTHS = { 0: [8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };

const fail = (message) => {
    throw new Error(`PNG : ${message}`);
};

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Reads the chunks (CRC checked) and returns IHDR + palette + transparency + IDAT. */
function readChunks(buf) {
    if (buf.length < 45 || !buf.subarray(0, 8).equals(SIGNATURE)) fail("fichier invalide");
    let pos = 8;
    let ihdr = null;
    let plte = null;
    let trns = null;
    let ended = false;
    const idat = [];
    let idatBytes = 0;
    while (pos + 12 <= buf.length && !ended) {
        const length = buf.readUInt32BE(pos);
        const type = buf.toString("latin1", pos + 4, pos + 8);
        if (!/^[A-Za-z]{4}$/.test(type)) fail("type de bloc invalide");
        if (length > buf.length - pos - 12) fail("fichier tronqué");
        const data = buf.subarray(pos + 8, pos + 8 + length);
        if (crc32(buf.subarray(pos + 4, pos + 8 + length)) !== buf.readUInt32BE(pos + 8 + length)) {
            fail(`somme de contrôle invalide (${type})`);
        }
        if (!ihdr && type !== "IHDR") fail("IHDR doit être le premier bloc");
        if (type === "IHDR") {
            if (ihdr || length !== 13) fail("IHDR invalide");
            ihdr = {
                width: data.readUInt32BE(0),
                height: data.readUInt32BE(4),
                depth: data[8],
                colorType: data[9],
                compression: data[10],
                filter: data[11],
                interlace: data[12]
            };
        } else if (type === "PLTE") {
            plte = data;
        } else if (type === "tRNS") {
            trns = data;
        } else if (type === "IDAT") {
            idatBytes += length;
            if (idatBytes > buf.length) fail("données incohérentes");
            idat.push(data);
        } else if (type === "IEND") {
            ended = true;
        }
        pos += 12 + length;
    }
    if (!ihdr || !ended || idat.length === 0) fail("fichier incomplet");
    return { ihdr, plte, trns, idat: Buffer.concat(idat) };
}

/** Header only (no inflate): used to refuse before any heavy work. */
export function readHeader(buf) {
    return readChunks(buf).ihdr;
}

export function decodePng(buf, maxPixels = MAX_PIXELS) {
    const { ihdr, plte, trns, idat } = readChunks(buf);
    const { width, height, depth, colorType } = ihdr;

    if (!(colorType in CHANNELS) || !DEPTHS[colorType].includes(depth)) {
        fail(`format non supporté (type ${colorType}, ${depth} bits)`);
    }
    if (ihdr.compression !== 0 || ihdr.filter !== 0) fail("méthode de compression inconnue");
    if (ihdr.interlace !== 0) fail("PNG entrelacé non supporté : réexporte-le sans entrelacement");
    if (width < 1 || height < 1) fail("dimensions nulles");
    if (width > MAX_SIDE || height > MAX_SIDE) fail(`image trop grande (max ${MAX_SIDE} px par côté)`);
    if (width * height > maxPixels) fail(`image trop grande (max ${maxPixels} pixels)`);
    if (colorType === 3 && (!plte || plte.length === 0 || plte.length % 3 !== 0)) {
        fail("palette absente ou invalide");
    }

    const bitsPerPixel = CHANNELS[colorType] * depth;
    const bpp = Math.max(1, bitsPerPixel >> 3);
    const stride = Math.ceil((width * bitsPerPixel) / 8);
    const expected = height * (stride + 1);

    let raw;
    try {
        raw = inflateSync(idat, { maxOutputLength: expected });
    } catch {
        fail("données image corrompues ou trop volumineuses");
    }
    if (raw.length !== expected) fail("taille des données incohérente");

    // Unfiltering.
    const px = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        const src = y * (stride + 1) + 1;
        const row = y * stride;
        const prev = row - stride;
        if (filter > 4) fail("filtre inconnu");
        for (let i = 0; i < stride; i++) {
            const x = raw[src + i];
            const a = i >= bpp ? px[row + i - bpp] : 0;
            const b = y > 0 ? px[prev + i] : 0;
            const c = y > 0 && i >= bpp ? px[prev + i - bpp] : 0;
            let v;
            if (filter === 0) v = x;
            else if (filter === 1) v = x + a;
            else if (filter === 2) v = x + b;
            else if (filter === 3) v = x + ((a + b) >> 1);
            else v = x + paeth(a, b, c);
            px[row + i] = v & 255;
        }
    }

    // Conversion to 8-bit RGBA.
    const out = new Uint8Array(width * height * 4);
    const step = depth === 16 ? 2 : 1;
    // 16-bit sample compared as is to the tRNS color key; the high byte is kept for display.
    const sample = (offset) => (depth === 16 ? (px[offset] << 8) | px[offset + 1] : px[offset]);
    const keyAt = (i) => (trns && trns.length >= (i + 1) * 2 ? trns.readUInt16BE(i * 2) : -1);

    for (let y = 0; y < height; y++) {
        const row = y * stride;
        for (let x = 0; x < width; x++) {
            const o = (y * width + x) * 4;
            if (colorType === 6) {
                const p = row + x * 4 * step;
                out[o] = px[p];
                out[o + 1] = px[p + step];
                out[o + 2] = px[p + 2 * step];
                out[o + 3] = px[p + 3 * step];
            } else if (colorType === 2) {
                const p = row + x * 3 * step;
                out[o] = px[p];
                out[o + 1] = px[p + step];
                out[o + 2] = px[p + 2 * step];
                const transparent =
                    trns &&
                    trns.length >= 6 &&
                    sample(p) === keyAt(0) &&
                    sample(p + step) === keyAt(1) &&
                    sample(p + 2 * step) === keyAt(2);
                out[o + 3] = transparent ? 0 : 255;
            } else if (colorType === 0) {
                const p = row + x * step;
                out[o] = out[o + 1] = out[o + 2] = px[p];
                out[o + 3] = trns && trns.length >= 2 && sample(p) === keyAt(0) ? 0 : 255;
            } else if (colorType === 4) {
                const p = row + x * 2 * step;
                out[o] = out[o + 1] = out[o + 2] = px[p];
                out[o + 3] = px[p + step];
            } else {
                // Palette: 1, 2, 4 or 8 bits per index.
                const bit = x * depth;
                const byte = px[row + (bit >> 3)];
                const index = (byte >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
                if (index * 3 + 2 >= plte.length) fail("index de palette hors limites");
                out[o] = plte[index * 3];
                out[o + 1] = plte[index * 3 + 1];
                out[o + 2] = plte[index * 3 + 2];
                out[o + 3] = trns && index < trns.length ? trns[index] : 255;
            }
        }
    }
    return { width, height, data: out };
}

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
}

/**
 * Encodes 8-bit RGBA (`channels` = 4) or RGB (`channels` = 3).
 * Per-row filter chosen by the "minimum sum of absolute values" heuristic.
 */
export function encodePng({ width, height, data }, channels = 4) {
    if (channels !== 3 && channels !== 4) fail("canaux : 3 ou 4 attendus");
    const stride = width * channels;
    if (data.length !== stride * height) fail("tampon de pixels incohérent");

    const raw = Buffer.alloc(height * (stride + 1));
    const cand = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
    const zero = new Uint8Array(stride);
    for (let y = 0; y < height; y++) {
        const row = data.subarray(y * stride, (y + 1) * stride);
        const prev = y > 0 ? data.subarray((y - 1) * stride, y * stride) : zero;
        const score = [0, 0, 0, 0, 0];
        for (let i = 0; i < stride; i++) {
            const x = row[i];
            const a = i >= channels ? row[i - channels] : 0;
            const b = prev[i];
            const c = i >= channels ? prev[i - channels] : 0;
            const f = [x, (x - a) & 255, (x - b) & 255, (x - ((a + b) >> 1)) & 255, (x - paeth(a, b, c)) & 255];
            for (let k = 0; k < 5; k++) {
                cand[k][i] = f[k];
                score[k] += f[k] < 128 ? f[k] : 256 - f[k];
            }
        }
        let best = 0;
        for (let k = 1; k < 5; k++) if (score[k] < score[best]) best = k;
        raw[y * (stride + 1)] = best;
        raw.set(cand[best], y * (stride + 1) + 1);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = channels === 4 ? 6 : 2;
    return Buffer.concat([
        SIGNATURE,
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0))
    ]);
}
