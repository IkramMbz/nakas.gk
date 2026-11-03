// manifest: PNG -> PWA icon set. Pure function: bytes in, bytes out.
// The agent touches no file; the runner reads the image and writes the result.
import { decodePng, encodePng } from "./png.mjs";
import { bbox, crop, flattenOnWhite, newImage, place, resize, toRgb } from "./raster.mjs";
import { encodeIco } from "./ico.mjs";

const MANIFEST_SIZES = [32, 48, 72, 128, 180, 192, 256, 384, 512];
const MANIFEST_PREFIXES = ["icon", "maskable-icon"];
const CANVAS = 500;
const INNER = 320;
const FAVICON_SIZES = [16, 32, 48, 64, 128, 256];
const FAVICON_MARGIN = 0.01;

function contentBox(img) {
    const box = bbox(img);
    if (!box) throw new Error("l'image est entièrement transparente");
    return box;
}

/** Image shrunk to INNER x INNER, centered on a transparent CANVAS x CANVAS square. */
function centreOnCanvas(img) {
    const canvas = newImage(CANVAS, CANVAS);
    const offset = (CANVAS - INNER) >> 1;
    place(canvas, resize(img, INNER, INNER), offset, offset);
    return canvas;
}

function faviconSource(img) {
    const content = crop(img, contentBox(img));
    let side = Math.max(content.width, content.height);
    side += 2 * Math.trunc(side * FAVICON_MARGIN);
    const square = newImage(side, side);
    place(
        square,
        content,
        (side - content.width) >> 1,
        (side - content.height) >> 1
    );
    return square;
}

export default async function run(input) {
    const file = input?.file;
    if (!file || typeof file.base64 !== "string") throw new Error("entrée : image manquante");
    const center = input.params?.center !== false;

    const original = decodePng(Buffer.from(file.base64, "base64"));
    const base = center ? centreOnCanvas(original) : original;

    const artifacts = [];
    const add = (name, buf) => artifacts.push({ name, base64: buf.toString("base64") });

    // Manifest icons (32 and 48: cropped on the content, otherwise the favicon is too small).
    for (const size of MANIFEST_SIZES) {
        const source = size === 32 || size === 48 ? crop(base, contentBox(base)) : base;
        const png = encodePng(resize(source, size, size));
        for (const prefix of MANIFEST_PREFIXES) add(`manifest/${prefix}-${size}x${size}.png`, png);
    }

    add("logo.png", encodePng(resize(original, 192, 192)));
    add("logo_git.png", encodePng(resize(original, 72, 72)));
    add("apple-touch-icon.png", encodePng(toRgb(resize(flattenOnWhite(base), 180, 180)), 3));

    const big = resize(faviconSource(original), 256, 256);
    add(
        "favicon.ico",
        encodeIco(
            FAVICON_SIZES.map((size) => ({
                size,
                png: encodePng(size === 256 ? big : resize(big, size, size))
            }))
        )
    );

    return { artifacts };
}
