// ICO container holding PNG images (supported since Windows Vista and by every browser).

/** `frames`: [{ size, png }] with size between 1 and 256. */
export function encodeIco(frames) {
    if (frames.length === 0 || frames.length > 16) throw new Error("ICO : 1 à 16 images attendues");
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type: icon
    header.writeUInt16LE(frames.length, 4);

    const entries = Buffer.alloc(16 * frames.length);
    let offset = 6 + entries.length;
    frames.forEach(({ size, png }, i) => {
        if (!Number.isInteger(size) || size < 1 || size > 256) throw new Error("ICO : taille invalide");
        const e = i * 16;
        entries[e] = size === 256 ? 0 : size; // width (0 = 256)
        entries[e + 1] = size === 256 ? 0 : size; // height
        entries[e + 2] = 0; // palette
        entries[e + 3] = 0; // reserved
        entries.writeUInt16LE(1, e + 4); // planes
        entries.writeUInt16LE(32, e + 6); // bits per pixel
        entries.writeUInt32LE(png.length, e + 8);
        entries.writeUInt32LE(offset, e + 12);
        offset += png.length;
    });
    return Buffer.concat([header, entries, ...frames.map((f) => f.png)]);
}
