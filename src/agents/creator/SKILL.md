---
name: nakas-creator
description: Create a new hairstyle SVG part (a single flat-vector hair layer) from a reference image, matching an existing kit of hairstyle parts (bangs, bowl-cut-hair, braids, bun-hair, curly-bob, curly-short-hair, fro-bun, half-shaved-head, mohawk, shaved-head, short-hair, straight-hair, wavy-bob, lawliet). Make sure to use this skill whenever the user uploads or mentions an image of a hairstyle, a character's hair, a haircut, or asks for "a new hair", "a new coupe", "another hairstyle", "an SVG for this hair", or wants to extend the hair kit, even if they do not say "skill" or "part". Covers canvas geometry, the {{hair}} color token, shading conventions, the part validator rules, rendering checks, and known pitfalls.
---

# Hair SVG Part

Turn a reference image of a hairstyle into one SVG file that drops into the existing hair-part system without any adaptation: same canvas, same orientation, same color token, same shading style, and it passes the part validator.

The user's file naming and structure are the contract. Deviating from it breaks composition. When in doubt, imitate the existing parts.

## Quick workflow

1. **Analyze the reference** (see "Reading the reference image").
2. **Mirror if needed** so the face points to the **right** (the kit's convention).
3. **Draft the silhouette** as one filled path, then add shading overlays.
4. **Write the file** to `/mnt/user-data/outputs/<kebab-case-name>.svg`.
5. **Validate** (see "Validation"). Note that delivery re-adds a C2PA `<metadata>` block that the validator must ignore (see "Known issue").
6. **Render and look** at the result on two hair colors, next to the reference. Iterate (usually 2 to 3 rounds).
7. **Present the file** and reply briefly: what was built, what was assumed, what could not be verified.

Do not skip step 6. A path that is syntactically valid can still look wrong.

## Canvas and orientation

Every part uses exactly:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 504.7 582.6" width="504.7" height="582.6">
```

- Parts are overlays drawn on top of one shared head, so all parts share the same coordinate space.
- **Side view, face pointing right.** The back of the head is on the left, the fringe and face are on the right. If the reference faces left, mirror it mentally (hair sweeping back goes toward the left, bangs go toward the right).
- Coordinates are approximate landmarks derived from the existing parts, not from a head sprite. State this limitation to the user when relevant.

### Anchors shared by the existing parts

- **Ear notch (the head's ear zone, left-middle):** short and cropped styles open here. The shared segment, copied from `shaved-head`:

    ```
    M113.2 325.6q-.2 6.9.1 13.8c38.5 6.4 56.7 47.2 61 66.8 0 0 11.4.6 14-1.5c14.3-7.4 39.5-37.5 27.1-99.1
    ```

    Starts at about (113, 326), curves down to the sideburn tip at about (174 to 188, 391 to 405), then the inner edge climbs the temple to about (215, 305). Reuse it for any style where the ear stays visible and the sides are short, so the part lines up with the others.

- **Long styles** (`straight-hair`, `bangs`, `braids`, `wavy-bob`) draw a rounded cutout around the ear at roughly x 80 to 170, y 350 to 450, and hair continues below it.
- **Ear hidden:** if the reference clearly covers the ear (like `lawliet`), cover it. Do not force a notch.
- **Typical vertical extents:**
    - crown top: y about 85 to 145 (bun styles go up to y about 30)
    - short fringe edge: y about 260 to 310 (`bowl-cut-hair`, `bangs`)
    - very long bangs: y about 350 to 390 (`lawliet`)
    - hair may reach the canvas bottom (`straight-hair`, `braids`) or the left edge (`curly-bob`), so touching the edge is acceptable; going far outside is not.

## Color token and shading conventions

- **Base color:** `fill="{{hair}}"` on the main silhouette. Exactly `{{hair}}`, lowercase, no spaces inside the braces.
- **Shadows:** a separate path with `fill="black"` and `fill-opacity` between `.1` and `.3`. Default to `.2`. Use `.3` for large shaded areas (`half-shaved-head` shaved side) and up to `.5` only for dense line work (`braids`).
- **Highlights:** `fill="white"` with `fill-opacity` `.1` to `.2`. Use higher values only to simulate lighter material such as shaved stubble (`mohawk` uses `.7`).
- **No other colors** unless there is a deliberate design reason (`braids` keeps a dark base `#220F01` for the gaps between plaits). Hard-coded colors do not follow the user's palette, so mention it if you add one.
- **`mix-blend-mode: multiply`** exists in a couple of parts, but not every renderer supports it. Prefer plain `fill-opacity` overlays.
- **Keep every overlay inside the hair silhouette.** An overlay that sticks out shows as a gray stain on the background or skin. This happened twice; always check the render for slivers at the edges of locks and tips.
- Style is flat vector: no gradients, no filters, no strokes, no text. Simple parts have 1 to 2 paths; rich parts up to 4. Do not over-engineer: match the level of detail of the neighbors.

## File format rules

- File name: kebab-case, ending in `.svg`, named after the style (`curly-bob.svg`, `half-shaved-head.svg`) or, for a signature look inspired by a character, after that character (`lawliet.svg`). The `-hair` suffix is optional. If the user gives a name, use it exactly; if not, propose a descriptive kebab-case name. In the user's project the parts live in `hair/` (for example `hair/lawliet.svg`).
- Two-space indentation, one element per line, `<svg ...>` root only.
- Compact path data (relative commands, no needless decimals). Close subpaths with `z`/`Z`.
- Put the main silhouette first, then shadows/highlights on top.

## Validation

The user's part validator rejects the following. Make sure none of it appears **inside the `<svg>`**:

| Rule                                                           | Consequence                                    |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `<script>`, `<foreignObject>`, `<image>`                       | forbidden                                      |
| `on...=` event attributes                                      | forbidden                                      |
| `href=` / `xlink:href=`                                        | forbidden                                      |
| `<!DOCTYPE`, `<!ENTITY`                                        | forbidden                                      |
| `id="..."` attributes                                          | forbidden (collisions when parts are composed) |
| missing or malformed `viewBox`                                 | must be `"0 0 width height"`                   |
| any `{{token}}` other than a known palette token (here `hair`) | error                                          |
| `{{ hair }}` with spaces                                       | error                                          |
| unbalanced or mismatched tags                                  | error                                          |
| **any text between tags**                                      | error "stray text in the SVG"                  |

Consequences to remember:

- Do **not** add `<title>`, `<desc>`, `<style>`, `<text>` or `<metadata>`: their text content counts as stray text. XML comments are stripped by the validator and are fine, but avoid them anyway.
- Do not use `<defs>`/`<clipPath>`/`<mask>` with ids. No `id`, so no references.

### Known issue: injected C2PA metadata (fix it in the validator, not in the file)

Files delivered to the user get a provenance block added **at delivery time**, after Claude has finished writing them:

```xml
<svg ... xmlns:c2pa="http://c2pa.org/manifest"><metadata><c2pa:manifest>AAAW...base64...</c2pa:manifest></metadata>
```

Its base64 content triggers "stray text in the SVG" in the user's build (`hair/<name>.svg: stray text in the SVG`).

Important lessons:

- **Stripping the block in the container is not enough.** A copy checked in the container can be clean while the downloaded file has the block again. Never tell the user "the file is clean" based on a container check alone.
- Do not claim the problem is solved after a local strip. Say that the block is added on delivery and that the durable fix is in the validator.
- The block is provenance information (it says the file was provided by Claude). It is not part of the drawing and not an error in the SVG.

**Always include this fix in the reply the first time a validator error mentions stray text**, and remind the user of it whenever they report it again. In `parsePartSvg`, strip `<metadata>` before the root match:

```javascript
const src = text
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "") // <- add this line
    .trim();
```

Only `inner` is returned and composed, so the leftover `xmlns:c2pa` attribute on the root `<svg>` is harmless (the validator reads only `viewBox` from the root attributes).

If the user cannot patch the validator right now, a one-off cleanup of an already-downloaded file is:

```powershell
(Get-Content hair\NAME.svg -Raw) -replace '(?s)<metadata.*?</metadata>','' -replace ' xmlns:c2pa="[^"]*"','' | Set-Content hair\NAME.svg -NoNewline
```

Do not generate files with `<metadata>` yourself, and keep stripping it in the container as a best effort, but never rely on it.

### Validator script

Save as `validate.mjs` and run `node validate.mjs file.svg [...]`. It mirrors the user's rules.

```javascript
import fs from "fs";
const TOKENS = ["hair"];
const FORBIDDEN = [
    [/<\s*script/i, "<script> tag"],
    [/<\s*foreignObject/i, "<foreignObject> tag"],
    [/<\s*image[\s>]/i, "<image> tag"],
    [/\son[a-z]+\s*=/i, "event handler attribute"],
    [/(?:xlink:)?href\s*=/i, "href attribute"],
    [/<!ENTITY|<!DOCTYPE/i, "DOCTYPE/ENTITY"],
    [/\sid\s*=/i, "id attribute"]
];
function parse(text) {
    const src = text
        .replace(/<\?xml[\s\S]*?\?>/g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim();
    const m = src.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/);
    if (!m) throw new Error("single <svg> root required");
    const vb = /\bviewBox="([^"]+)"/.exec(m[1])?.[1];
    if (!vb || !/^\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+\s*$/.test(vb))
        throw new Error("missing or invalid viewBox");
    const inner = m[2].trim();
    if (!inner) throw new Error("no elements");
    for (const [re, l] of FORBIDDEN) if (re.test(inner)) throw new Error("forbidden: " + l);
    for (const [, n] of inner.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g))
        if (!TOKENS.includes(n)) throw new Error("unknown token {{" + n + "}}");
    if (/\{\{\s/.test(inner) || /\s\}\}/.test(inner)) throw new Error("malformed token");
    const stack = [];
    for (const t of inner.matchAll(/<(\/?)([A-Za-z][\w:-]*)[^<>]*?(\/?)>/g)) {
        if (t[3]) continue;
        if (!t[1]) stack.push(t[2]);
        else if (stack.pop() !== t[2]) throw new Error("unexpected closing tag " + t[0]);
    }
    if (stack.length) throw new Error("unclosed tag <" + stack.pop() + ">");
    const rest = inner.replace(/<[^<>]*>/g, "").trim();
    if (rest) throw new Error("stray text: " + JSON.stringify(rest.slice(0, 120)));
    return vb;
}
for (const f of process.argv.slice(2)) {
    try {
        console.log(f, "OK", parse(fs.readFileSync(f, "utf8")));
    } catch (e) {
        console.log(f, "ERR", e.message);
    }
}
```

Also run `xmllint --noout file.svg` when available (catches malformed XML the regexes miss).

## Reading the reference image

Extract these facts before drawing anything, and write them down in two or three lines of reasoning:

- **Length:** shaved / cropped / ear-length / jaw / shoulder / longer.
- **Volume and shape of the top:** flat, rounded dome, tall, swept back, swept forward.
- **Fringe / bangs:** none, short, long and pointed, side-swept, parted. How low does it fall (forehead, brows, eyes)? How many distinct locks?
- **Sides and ears:** ear visible or covered, sideburn length, any lock hanging in front of the ear.
- **Back and nape:** ends at the neck or flares, direction the tips point.
- **Texture:** straight, wavy, curly (use arcs/scallops), coily (cloud of lobes), braided, spiky, shaggy.
- **Asymmetry and signature details:** undercut side, top bun, a single long lock, etc.
- **Flow direction:** one overall direction of movement. Tips should follow it.

Describe fictional characters' hair as hair; the goal is a generic part, not a portrait. If the reference is a photo of a real person, only extract the hairstyle itself.

## Drawing guidance

- **One continuous outline** for the silhouette, with `Q`/`C` curves between tips and valleys. Start and end at a landmark (usually the ear-notch top at about (113.2, 325.6), or a lock tip for long styles).
- **Spiky/shaggy styles:** do not build a dome with evenly spaced identical spikes (it reads as a hedgehog). Instead:
    - keep a smooth, rounded volume on top;
    - put the strongest tips at the **ends** of the hair (back, nape, fringe) rather than all around the crown;
    - vary tip length and spacing, and let tips curve in the same flow direction;
    - use 1 to 2 modest tufts on top at most.
- **Fringe locks:** long, tapered, pointing down and slightly forward, with valleys between them at different heights.
- **Curly / coily:** build the outline from arcs or circles (`curly-short-hair`, `fro-bun`), not from sharp tips.
- **Straight / bob:** long smooth curves, a clean cut line at the bottom, optional parting line as a thin shadow crescent.
- **Shading paths:** thin crescents that follow strand flow, placed along clump boundaries and under the fringe. Typically 4 to 9 small shapes in one `<path>`.
- Precision matters less than readability at small sizes. Keep the shape bold.

## Render check (required)

Substitute the token, render on a neutral background, and view it. Use two colors: a mid brown and a near-black, so both shading visibility and silhouette are checked.

```python
import cairosvg
from PIL import Image
src = open("/mnt/user-data/outputs/NAME.svg").read()
tiles = []
for i, color in enumerate(("#6b3f1d", "#1b1b1f")):
    cairosvg.svg2png(bytestring=src.replace("{{hair}}", color).encode(),
                     write_to=f"/home/claude/t{i}.png", output_width=500,
                     background_color="#f2ede4")
    tiles.append(Image.open(f"/home/claude/t{i}.png"))
sheet = Image.new("RGB", (1000, tiles[0].height))
for i, t in enumerate(tiles): sheet.paste(t, (i * 500, 0))
sheet.save("/home/claude/check.png")
```

If `cairosvg` is missing: `pip install cairosvg --break-system-packages`. Note that `cairosvg` may ignore `mix-blend-mode`, so blended layers can look different in a browser.

Then `view` the PNG and ask yourself:

1. Does it look like the reference (length, volume, fringe, tip direction), not just "some hair"?
2. Is the face side on the right?
3. Do shadow paths stay inside the silhouette (no gray slivers)?
4. Is it nothing like a hedgehog / cloud / helmet unless the reference is?
5. Does the level of detail match the neighbors in the kit?

Fix and re-render. If after about three rounds it still deviates, say exactly which aspect is off and ask the user which to prioritize.

## Existing parts (for consistency)

| Part               | Length / type                 | Notes                                     |
| ------------------ | ----------------------------- | ----------------------------------------- |
| `shaved-head`      | shaved                        | 1 path, no shading                        |
| `mohawk`           | shaved sides + crest          | white .7 overlay on sides                 |
| `half-shaved-head` | undercut                      | asymmetric, .3 shaded shaved side         |
| `short-hair`       | short                         | swept top, small curls at the front       |
| `bowl-cut-hair`    | short                         | straight fringe, ear-length sides         |
| `curly-short-hair` | short curly                   | circles/arcs outline, no shading          |
| `bangs`            | shoulder, straight            | blunt fringe with a small split           |
| `straight-hair`    | long, straight                | diagonal parting, reaches canvas bottom   |
| `wavy-bob`         | bob, wavy                     | rich shading                              |
| `curly-bob`        | bob, curly                    | big volume, touches left edge, no shading |
| `bun-hair`         | updo                          | separate circle bun with shadow           |
| `fro-bun`          | afro puff                     | lobed cloud, multiple overlays            |
| `braids`           | cornrows + hanging braids     | dark base `#220F01`, .5 line work         |
| `lawliet`          | shaggy, spiky, character look | long pointed bangs, ear covered, no notch |

## Final reply

Keep it short and in the user's language:

- the file name (do not paste the whole SVG);
- two or three bullet-free sentences on what was drawn and any assumption (ear covered or visible, mirrored from the reference, etc.);
- any limitation (no head sprite to align against, renderer lacks blend modes);
- if the user's validator reports "stray text in the SVG", the C2PA metadata fix from "Known issue";
- offer one concrete next adjustment, not a list of questions.

If the user says the result does not look like the reference, own it, re-read the reference image from scratch, and redo the drawing rather than patching small details.
