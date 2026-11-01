---
name: seo
description: Live SEO audit of the current page (metadata, structure, content, images, links, Open Graph, structured data, performance, accessibility, mobile).
---

# SEO Agent (L)

This agent runs **in the browser**, on the DOM of the displayed page. It makes no
network requests and never modifies the page.

## What it checks

Document foundations (doctype, charset, `lang`, viewport, manifest) · indexing (robots,
canonical) · metadata (title, description, keywords, author) · headings (H1, hierarchy) ·
content (volume, readability, duplicates) · images (alt, dimensions, lazy-loading, formats) · links
(internal, external, security) · hreflang · Open Graph · Twitter cards · JSON-LD · blocking
resources, hints, inline styles · analytics and consent · forms and ARIA landmarks ·
touch targets and font size.

The score counts `success` checks out of the non-informational checks (`info` excluded).

## Content area

Content checks run on `contentSelector` if configured, otherwise on the first
element found among `main`, `[role="main"]`, `article`, then `body`.

## How to present results

- Sort findings by severity: `error`, `warning`, then `info`.
- Suggest a minimal fix per finding; apply nothing without the user's approval.
- `info` reminders (robots.txt, sitemap, CSP, Referrer-Policy) can't be verified from the DOM.
