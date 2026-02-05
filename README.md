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
- Duplex printing with mirrored backs (flip edge depends on layout).
- Auto-rotate landscape inputs to portrait (right edge points upward).
- Adjustable corner crosshair guides (length + stroke).
- Live preview with safe-margin overlay, crosshairs, and cut-box overlay for Buttonshy.
- Auto-layout helper and image thumbnails.
- Multiple back images with per-card assignment and batch assignment tools.
- Metric/imperial unit toggle with dynamic labels.
- Adaptive layout summary panel and format-aware export header.
- Safe-print guardrails: hard block export if layout exceeds safe margins.
- Optional **Back Nudge** (mm) to compensate for duplex printer drift, with preview indicator.

## Layout Notes
- **Traditional card grid**: Portrait page. Duplex flip on **long edge**.
- **Buttonshy Games Style (with bleed)**: Landscape page. Images are extended by **0.10–0.75" per side** using edge-pixel bleed. Cut guides remain at the original card size. Duplex flip on **short edge**.
- **Gutterfold (2 columns)**: Portrait page, landscape cards. Fronts in left column, backs in right column, bottoms toward the center gutter. Includes a dashed fold line. No duplex. Center gutter is adjustable **0.10–0.75"**.

## Back Assignment Workflow
- Upload **one back** to apply it to all fronts automatically.
- Upload **multiple backs** to enable per-card assignment in the thumbnails section.
- Use the **Select all** checkbox and batch selector to assign a back to multiple cards at once.

## Back Nudge (Optional)
- Enable when using duplex layouts if you observe front/back drift.
- Set X/Y offsets in **mm (0.5 mm steps)** after measuring a test print.
- Preview shows the center crosshair and applied nudge.
- Applied to all backs on export (printer-specific).

## Usage
1. Open `index.html` in a browser.
2. Upload front images and optional back images.
3. Choose layout, page size, card size, and image fit.
4. Preview and export a PDF.

## Files
- `index.html` — UI markup
- `styles.css` — Visual styling
- `app.js` — PDF generation + preview logic

## Changelog
- Added optional Back Nudge controls with preview indicator (mm offsets).
- Added adaptive layout summary panel and format-aware export header.
- Added metric/imperial toggle with dynamic labels and conversions.
- Added adjustable gutter/bleed control by layout (0.10–0.75").
- Added safe-margin overlay + hard export guardrails.
- Added per-card back assignment UI with batch tools and Select All.
- Added auto-rotation of landscape images to portrait.
- Added preview crosshairs + cut-box overlay for Buttonshy.
- Added responsive layout for desktop, tablet, and phone.

## Development
No build step required. This is a static site suitable for GitHub Pages.
