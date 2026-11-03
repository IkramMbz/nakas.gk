// Raster operations on `{ width, height, data }` (8-bit RGBA, straight alpha).
// Resizing follows Pillow's algorithm (Lanczos 3, support widened when shrinking,
// premultiplied alpha) so results stay close to the original Python script.

export function newImage(width, height) {
    return { width, height, data: new Uint8Array(width * height * 4) };
}

/** Bounding box of non-transparent pixels (alpha > 0), or `null` if the image is empty. */
export function bbox(img) {
    const { width, height, data } = img;
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] === 0) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            y1 = y;
        }
    }
    return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

export function crop(img, box) {
    const width = box.x1 - box.x0;
    const height = box.y1 - box.y0;
    const out = newImage(width, height);
    for (let y = 0; y < height; y++) {
        const from = ((box.y0 + y) * img.width + box.x0) * 4;
        out.data.set(img.data.subarray(from, from + width * 4), y * width * 4);
    }
    return out;
}

/** Copies `src` into `dst` at (ox, oy). Meant for an empty (transparent) destination. */
export function place(dst, src, ox, oy) {
    for (let y = 0; y < src.height; y++) {
        const to = ((oy + y) * dst.width + ox) * 4;
        dst.data.set(src.data.subarray(y * src.width * 4, (y + 1) * src.width * 4), to);
    }
}

/** Composites over an opaque white background (iOS fills transparency with black). */
export function flattenOnWhite(img) {
    const out = new Uint8Array(img.data.length);
    for (let i = 0; i < img.data.length; i += 4) {
        const a = img.data[i + 3];
        for (let c = 0; c < 3; c++) {
            out[i + c] = Math.round((img.data[i + c] * a + 255 * (255 - a)) / 255);
        }
        out[i + 3] = 255;
    }
    return { width: img.width, height: img.height, data: out };
}

/** RGBA -> packed RGB. */
export function toRgb(img) {
    const out = new Uint8Array(img.width * img.height * 3);
    for (let i = 0, j = 0; i < img.data.length; i += 4, j += 3) {
        out[j] = img.data[i];
        out[j + 1] = img.data[i + 1];
        out[j + 2] = img.data[i + 2];
    }
    return { width: img.width, height: img.height, data: out };
}

function lanczos3(x) {
    if (x <= -3 || x >= 3) return 0;
    if (x === 0) return 1;
    const p = Math.PI * x;
    return (3 * Math.sin(p) * Math.sin(p / 3)) / (p * p);
}

/** For each output index: first input index, tap count and normalized weights. */
function coefficients(inSize, outSize) {
    const scale = inSize / outSize;
    const filterScale = Math.max(scale, 1);
    const support = 3 * filterScale;
    const stride = Math.ceil(support) * 2 + 1;
    const start = new Int32Array(outSize);
    const count = new Int32Array(outSize);
    const weights = new Float64Array(outSize * stride);
    for (let o = 0; o < outSize; o++) {
        const center = (o + 0.5) * scale;
        const min = Math.max(0, Math.trunc(center - support + 0.5));
        const max = Math.min(inSize, Math.trunc(center + support + 0.5));
        let sum = 0;
        const n = Math.min(max - min, stride);
        for (let k = 0; k < n; k++) {
            const w = lanczos3((k + min - center + 0.5) / filterScale);
            weights[o * stride + k] = w;
            sum += w;
        }
        if (sum !== 0) for (let k = 0; k < n; k++) weights[o * stride + k] /= sum;
        start[o] = min;
        count[o] = n;
    }
    return { start, count, weights, stride };
}

/** Resizes to (outW, outH), stretching if the ratio differs (like Pillow's `resize`). */
export function resize(img, outW, outH) {
    const { width: inW, height: inH, data } = img;
    const h = coefficients(inW, outW);
    const v = coefficients(inH, outH);

    // Horizontal pass on premultiplied alpha, in float: (outW x inH x 4).
    const tmp = new Float32Array(outW * inH * 4);
    for (let y = 0; y < inH; y++) {
        for (let ox = 0; ox < outW; ox++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;
            const base = ox * h.stride;
            for (let k = 0; k < h.count[ox]; k++) {
                const w = h.weights[base + k];
                const i = (y * inW + h.start[ox] + k) * 4;
                const alpha = data[i + 3];
                const wa = (w * alpha) / 255;
                r += data[i] * wa;
                g += data[i + 1] * wa;
                b += data[i + 2] * wa;
                a += w * alpha;
            }
            const t = (y * outW + ox) * 4;
            tmp[t] = r;
            tmp[t + 1] = g;
            tmp[t + 2] = b;
            tmp[t + 3] = a;
        }
    }

    // Vertical pass, then un-premultiply and round.
    const out = new Uint8Array(outW * outH * 4);
    for (let oy = 0; oy < outH; oy++) {
        const base = oy * v.stride;
        for (let x = 0; x < outW; x++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;
            for (let k = 0; k < v.count[oy]; k++) {
                const w = v.weights[base + k];
                const t = ((v.start[oy] + k) * outW + x) * 4;
                r += tmp[t] * w;
                g += tmp[t + 1] * w;
                b += tmp[t + 2] * w;
                a += tmp[t + 3] * w;
            }
            const o = (oy * outW + x) * 4;
            const alpha = Math.min(255, Math.max(0, Math.round(a)));
            out[o + 3] = alpha;
            if (alpha > 0) {
                const f = 255 / a;
                out[o] = Math.min(255, Math.max(0, Math.round(r * f)));
                out[o + 1] = Math.min(255, Math.max(0, Math.round(g * f)));
                out[o + 2] = Math.min(255, Math.max(0, Math.round(b * f)));
            }
        }
    }
    return { width: outW, height: outH, data: out };
}
