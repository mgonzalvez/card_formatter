# Martin's Card Formatter

A static, browser-based utility for turning card images into print-ready PDFs with cut guides. Supports duplex printing, gutterfold output, and Buttonshy Games–style layouts with edge bleed.

## Features
- Upload front images (PNG/JPG) and optional back images.
- Output formats:
  - Traditional card grid
  - Gutterfold (2 columns)
  - Buttonshy Games Style (with bleed)
- Duplex printing with mirrored backs (flip edge depends on layout).
- Dashed corner crosshair guides (configurable length and stroke).
- Live preview with cut-box overlay for Buttonshy style.
- Auto-layout helper and image thumbnails.
- Multiple back images with per-card assignment and batch assignment tools.

## Layout Notes
- **Traditional card grid**: Portrait page. Duplex flip on **long edge**.
- **Buttonshy Games Style (with bleed)**: Landscape page. Images are extended by **0.25" per side** using edge-pixel bleed. Cut guides remain at the original card size. Duplex flip on **short edge**.
- **Gutterfold (2 columns)**: Portrait page, landscape cards. Fronts in left column, backs in right column, bottoms toward the center gutter. Includes a dashed fold line. No duplex.

## Back Assignment Workflow
- Upload **one back** to apply it to all fronts automatically.
- Upload **multiple backs** to enable per-card assignment in the thumbnails section.
- Use the **Select all** checkbox and batch selector to assign a back to multiple cards at once.

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
- Added Buttonshy Games Style bleed extension with cut-box overlay.
- Added gutterfold fold line, portrait page layout, and centered columns.
- Added dynamic duplex mirroring (long-edge vs short-edge) by layout.
- Added preview crosshairs with live updates.
- Added multi-back assignment with thumbnail controls and batch tools.
- Added responsive layout for desktop, tablet, and phone.

## Development
No build step required. This is a static site suitable for GitHub Pages.
