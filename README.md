# Martin's Card Formatter

A static, browser-based utility for turning card images into print-ready PDFs with cut guides. Supports duplex printing, gutterfold output, and Buttonshy Games–style 2×3 layouts with edge bleed.

## Features
- Upload front images (PNG/JPG) and optional back images.
- Output formats:
  - 3 × 3 grid (portrait)
  - Gutterfold (portrait page with landscape cards; fronts left, backs right, center fold line)
  - 2 × 3 Buttonshy Games Style (landscape page with 0.25" edge bleed)
- Duplex printing with mirrored backs (flip edge depends on layout).
- Dashed corner crosshair guides (configurable length and stroke).
- Live preview with cut-box overlay for Buttonshy style.
- Auto-layout helper and image thumbnails.

## Layout Notes
- **3 × 3**: Portrait page. Duplex flip on **long edge**.
- **2 × 3 Buttonshy Games Style**: Landscape page. Images are extended by **0.25" per side** using edge-pixel bleed. Cut guides remain at the original card size. Duplex flip on **short edge**.
- **Gutterfold**: Portrait page, landscape cards. Fronts in left column, backs in right column, bottoms toward the center gutter. Includes a dashed fold line. No duplex.

## Usage
1. Open `index.html` in a browser.
2. Upload front images and (optionally) back images.
3. Choose layout, page size, card size, and image fit.
4. Preview and export a PDF.

## Files
- `index.html` — UI markup
- `styles.css` — Visual styling
- `app.js` — PDF generation + preview logic

## Development
No build step required. This is a static site suitable for GitHub Pages.
