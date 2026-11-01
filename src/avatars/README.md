# Avatars

**Deterministic** SVG avatars ([Big Smile](https://www.dicebear.com/styles/big-smile/) style) generated from a string.
No runtime dependencies, no network, no `Math.random()`. ESM only.

```ts
import { createAvatar } from "nakas-gk/avatars";

const avatar = createAvatar("user-123");
avatar.svg; // full SVG string
avatar.toDataUri(); // for <img src="…"> or CSS
avatar.parts; // { head: "base", mouth: "kawaii", hair: "bun-hair", accessories: "glasses", … }
```

```tsx
<img src={createAvatar(user.id, { background: "#e6e6e6" }).toDataUri()} alt={user.name} />
```

The same string always yields the same avatar as long as the SVGs, palettes and manifest stay the same.

## Options

```ts
createAvatar("user-123", {
    parts: { hair: "mohawk", accessories: null }, // force a part / remove a layer
    colors: { skin: "#a47539", hair: ["#000", "#fff"] }, // fixed color, or custom palette
    background: "#e6e6e6", // transparent by default
    size: 96 // <svg> width/height (viewBox is 480×480 by default)
});
```

`listParts()` returns `{ hair: ["bangs", "mohawk", …], … }` (handy for a picker).
Errors are `AvatarError`s with a `code` and a message listing the valid values.

## Adding an SVG (without touching the engine)

1. Draw in the layer's coordinate space (see the `viewBox` of neighboring files).
2. Drop the file in `assets/<layer>/<kebab-case-name>.svg`.
3. `pnpm run generate` (also run by `pnpm test` and `pnpm build`) regenerates the registry.
4. Add the attribution to `NOTICE.md`.

SVG rules (checked at build time, with an explicit error otherwise): a single `<svg>` with a `viewBox`; no `<script>`, `<image>`, `href`, `id`, or `on…` attributes.
For a variable color, use `fill="{{hair}}"` or `fill="{{skin}}"`; any other color is fixed.

`assets/manifest.json` (the only config file) holds the canvas, `layers` (stacking order from bottom to top, placement `transform`, optional `probability`) and `palettes`. A **new layer** = a folder + an entry in `layers`. A **new variable color** = an entry in `palettes` + the `{{name}}` token.

An empty optional layer (`probability` < 100) is skipped; an empty required layer is an error.

### Stability of existing avatars

Selection uses _rendezvous hashing_: adding an SVG to a layer only changes the avatars that pick the new SVG (≈ 1/(n+1) of them), not all the others. Removing or renaming an SVG changes the avatars that used it. To freeze an avatar no matter what, store its `avatar.parts` / `avatar.colors` and replay them through `parts` and `colors`.

## Architecture

```
assets/manifest.json     canvas, layers, palettes
assets/<layer>/*.svg     the illustrations
scripts/build-registry   assets/ → registry.generated.ts (includes validation)
hash.ts              32-bit hash (FNV-1a + Murmur3 finalizer), selection
colors.ts            palettes, color normalization
compose.ts           final SVG assembly
index.ts             public API
```

SVGs are inlined into the compiled JS: no file reads at runtime, works with every bundler. SVGs are not published separately; the CC BY attribution ships in `dist/avatars/NOTICE.md`.
Each avatar costs a few dozen hashes and some string concatenation; nothing is parsed at runtime.

## Licenses

Code: MIT. Big Smile illustrations © Ashley Seo, **CC BY 4.0** — **visible credit is required in your applications**, see [NOTICE.md](./NOTICE.md).
