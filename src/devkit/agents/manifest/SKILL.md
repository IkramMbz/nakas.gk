---
name: manifest
description: Generates a PWA icon set (manifest icons, apple-touch-icon, favicon.ico, logos) from a single PNG, in pure JavaScript inside the sandbox.
script: run.mjs
permissions:
  read: file
  write: none
  network: none
  exec: none
---

# Manifest

## When to use

You have a logo as a PNG and need the files a PWA expects: manifest icons,
`apple-touch-icon.png`, `favicon.ico`, `logo.png`.

## What the script does

It receives **one image** (read by the runner) and returns the generated files
as bytes. It has no disk, network or process access: the runner validates the
result and writes it into a new dated folder, never over existing files.

Produced: 18 manifest icons (9 sizes, `icon-*` and `maskable-icon-*`),
`apple-touch-icon.png` (flattened on white), `favicon.ico` (16 to 256 px),
`logo.png` (192 px) and `logo_git.png` (72 px). `manifest.json` is built by the
runner from the configuration.

## Limits

- PNG only, not interlaced; 8 or 16 bits (palette: 1 to 8 bits).
- 8 MiB and 16 megapixels at most, 8192 px per side.
- No `logo.svg`: vectorizing a raster image is out of scope.

## How to present results

- Name the generated folder and the number of files.
- Remind the user to move the files out of the dated folder and to add it to
  `.gitignore`: `public/` is served as is in production.
- Apply nothing without the user's approval.
