# Attributions and Licenses

This package contains two distinct sets of files under distinct licenses.

## Code (`src/`, `scripts/`, `test/`)

MIT — see [LICENSE](./LICENSE).

## Illustrations (`assets/`)

| Folder / files                                                                             | Source                                                                                                                                        | License                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `assets/head`, `assets/eyes`, `assets/mouth`, `assets/hair`, `assets/accessories` (38 SVG) | **Big Smile** by [Ashley Seo](http://www.ashleyseo.com/), based on "[Custom Avatar](https://www.figma.com/community/file/881358461963645496)" | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

**Credit to include in your applications** (CC BY 4.0 requires crediting the author, linking the license and indicating changes):

> Avatars: "Big Smile" by Ashley Seo, based on "Custom Avatar" — CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/ — adapted (see below).

### Changes made

The SVGs were imported once from DiceBear's Big Smile definition and are maintained in this repository from then on.

1. each variant is stored in its own `.svg` file (kebab-case names);
2. the `viewBox` matches the component's original size;
3. dynamic colors (hair, skin) became the tokens `{{hair}}` / `{{skin}}`;
4. each layer's position on the canvas is kept in `assets/manifest.json`.

No paths were altered. The default palettes (`manifest.json`) are Big Smile's.

### Adding your own SVGs

**SVGs you add are not covered by the license above.** For each new asset, add a row to the table (author, source, license) and comply with its attribution terms before publishing.
