# Martin's Card Formatter

A static, browser-based utility for turning card images into print-ready PDFs with cut guides. Supports duplex printing, gutterfold output, and Buttonshy Games–style layouts with adjustable edge bleed.

## Tech Stack
- HTML + CSS + Vanilla JavaScript
- [pdf-lib](https://github.com/Hopding/pdf-lib) (CDN)
- Canvas API for preview rendering and image processing

## Features
- Upload front images (PNG/JPG) and optional back images.
- Output formats:
  - Traditional card grid
  - Gutterfold (2 columns)
  - Buttonshy Games Style (with bleed)
- Card sizes: Poker, Square, Bridge, Euro, Mini
- Duplex printing with mirrored backs (flip edge depends on layout).
- Auto-rotate landscape inputs to portrait (right edge points upward).
- Adjustable corner crosshair guides (length, stroke, and color).
- Crosshair ranges:
  - Length `10-30 px` (default `20`)
  - Stroke `1-3 pt` (default `1`)
  - Colors: black, dark gray, light gray
- Duplex-only guide placement control:
  - `Back only` (default)
  - `Front only`
  - `Both sides`
- Live preview with safe-margin overlay, crosshairs, and cut-box overlay for Buttonshy.
- Preview page navigation (`Prev`/`Next`) with page count indicator.
- Auto-layout helper and image thumbnails.
- Multiple back images with per-card assignment and batch assignment tools.
- Metric/imperial unit toggle with dynamic labels.
- Adaptive layout summary panel and format-aware export header.
- Safe-print guardrails: hard block export if layout exceeds safe margins, with clickable suggestions for one-click switching.
- Optional **Back Nudge** (mm) to compensate for duplex printer drift, with preview indicator and reset-to-zero control.
- Light/Dark theme toggle with saved preference.
- Top nav links for PnPFinder, PnPTools, Prototyper, Extractor, and Launchpad.
- Footer links for PnPFinder, PnPTools, Prototyper, Extractor, and Launchpad.
- Footer includes copyright notice and Ko-fi support link.
- Cloudflare Web Analytics snippet included.

## Layout Notes
- **Traditional card grid**: Portrait page. Duplex flip on **long edge**.
- **Buttonshy Games Style (with bleed)**: Landscape page. Images are extended by **0.10–0.75" per side** using edge-pixel bleed. Cut guides remain at the original card size. Duplex flip on **short edge**.
- **Gutterfold (2 columns)**: Portrait page, landscape cards. Fronts in left column, backs in right column, bottoms toward the center gutter. Includes a dashed fold line. No duplex. Center gutter is adjustable **0.10–0.75"**. Corner guides remain on for the sheet.

## Back Assignment Workflow
- Upload **one back** to apply it to all fronts automatically.
- Upload **multiple backs** to enable per-card assignment in the thumbnails section.
- Use the **Select all** checkbox and batch selector to assign a back to multiple cards at once.

## Corner Guide Placement
- Duplex layouts can print corner guides on the **back only** (default), **front only**, or **both sides**.
- This control appears only when backs are uploaded for a duplex-capable layout.
- Front-only jobs and gutterfold sheets always retain corner guides.

## Back Nudge (Optional)
- Enable when using duplex layouts if you observe front/back drift.
- Set X/Y offsets in **mm (0.5 mm steps)** after measuring a test print.
- X is limited to **±10 mm**, Y is limited to **±5 mm**.
- Preview shows the center crosshair and applied nudge.
- Positive X moves right. Positive Y moves up.
- Applied to all backs on export (printer-specific).

## Usage
1. Open `index.html` in a browser.
2. Upload front images and optional back images.
3. Choose layout, page size, card size, image fit, and crosshair settings.
4. (Optional) Assign backs per front and apply back nudge for duplex tuning.
5. Preview pages (fronts or backs) as needed.
6. Export PDF.

## Files
- `index.html` — UI markup
- `styles.css` — Visual styling
- `app.js` — PDF generation + preview logic

## Changelog
- Added Launchpad to footer for nav parity with the top navigation.
- Added clickable safe-margin suggestions with one-click layout/page switching for unsafe combinations.
- Added Euro card size (2.32" × 3.62" / 59 × 92 mm).
- Added duplex-only corner guide placement control with `Back only` as the default.
- Added ecosystem nav links, footer support/contact links, and Cloudflare analytics.
- Added theme toggle with saved preference and responsive desktop/tablet/phone layout.
- Added back nudge controls with preview indicator and reset-to-zero workflow.
- Added per-card back assignment, batch assignment tools, and automatic single-back behavior.
- Added safe-margin overlay, hard export guardrails, auto-rotation, and preview crosshairs/Buttonshy cut-box support.

## Development
No build step required. This is a static site suitable for GitHub Pages.
