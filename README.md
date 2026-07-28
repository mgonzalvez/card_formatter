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
- Custom finished card sizes from **0.5–11.19 in** / **12.7–284.2 mm**, reset on reload.
- Card images stretch to fill the selected card dimensions without cropping.
- Custom sizes automatically optimize safe paper orientation, card rotation, rows, and columns for the selected layout and uploaded card count.
- Duplex printing with mirrored backs (flip edge depends on layout).
- Target-aware image rotation: source artwork is rotated only when its orientation differs from the selected finished card dimensions.
- Adjustable solid corner crosshair guides (length, stroke, color, and opacity).
- Crosshair ranges:
  - Length `10-30 px` (default `20`)
  - Stroke `1-3 pt` (default `1`)
- Colors: black, dark gray, light gray
- Opacity: 25%, 50%, 75%, or 100%
- Duplex-only guide placement control:
  - `Back only` (default)
  - `Front only`
  - `Both sides`
- Live preview with safe-margin overlay, crosshairs, and cut-box overlay for Buttonshy.
- Buttonshy bleed color can be detected automatically from image edges or set to a custom color.
- Preview page navigation (`Prev`/`Next`) with page count indicator.
- Auto-layout helper and image thumbnails.
- Multiple back images with per-card assignment and batch assignment tools.
- Metric/imperial unit toggle with dynamic labels.
- Adaptive layout summary panel and format-aware export header.
- Safe-print guardrails: hard block export if layout exceeds safe margins, with clickable suggestions for one-click switching.
- Output filenames include the resolved grid (for example, `card-output-grid4x4.pdf`).
- Optional **Back Nudge** (mm) to compensate for duplex printer drift, with preview indicator and reset-to-zero control.
- System-aware Light/Dark theme toggle with saved preference.
- Compact Related Sites menu for the wider PnP tool ecosystem.
- Footer includes copyright notice and Ko-fi support link.
- Cloudflare Web Analytics snippet included.

## Layout Notes
- **Traditional card grid**: Presets use a portrait page. Custom sizes compare portrait/landscape paper and permitted card rotation. Duplex printing uses the **long edge**.
- **Buttonshy Games Style (with bleed)**: Presets use a landscape page; custom sizes optimize orientation. Images are extended by **0.10–0.75" per side** with an automatically detected or custom bleed color. Each card has four crosshairs inset to its original card corners; the orange dashed preview box shows the same cut boundary. Duplex printing uses the **short edge**.
- **Gutterfold (2 columns)**: Fronts and backs share one sheet and face the center gutter. Custom sizes compare paper orientations while preserving the inward-facing rotation. Includes a dashed fold line and no duplex flip. Center gutter is adjustable **0.10–0.75"**.

For duplex layouts, the app derives horizontal or vertical back mirroring from the selected paper orientation while retaining the required long-edge or short-edge printer setting.

## Back Assignment Workflow
- Upload **one back** to apply it to all fronts automatically.
- Upload **multiple backs** to enable per-card assignment in the thumbnails section.
- Use the **Select all** checkbox and batch selector to assign a back to multiple cards at once.

## Corner Guide Placement
- Duplex layouts can print corner guides on the **back only** (default), **front only**, or **both sides**.
- This control appears only when backs are uploaded for a duplex-capable layout.
- Front-only jobs and gutterfold sheets always retain corner guides.
- Each card has its own four corner guides. In Buttonshy layouts, the guides mark the original card boundary inside the bleed.

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
3. Choose layout, page size, card size, and crosshair settings.
   - For a custom size, enter the finished cut width and height; one size applies to the current image set.
4. (Optional) Assign backs per front and apply back nudge for duplex tuning.
5. Preview pages (fronts or backs) as needed.
6. Export PDF.

## Files
- `index.html` — UI markup
- `styles.css` — Visual styling
- `app.js` — PDF generation + preview logic
- `layout-engine.js` — Safe custom-size layout and orientation engine
- `tests/` — Layout and DOM contract tests

## Changelog
- Added unit-aware Custom card dimensions with strict safe-margin layout, automatic portrait/landscape selection, optional card rotation, and session-only state.
- Unified preview, Auto-layout, suggestions, duplex mirroring, and PDF export around the same calculated layout.
- Added automated coverage for divider sizing, A4/Letter boundaries, Buttonshy bleed, gutterfold, orientation, and duplex behavior.
- Redesigned the interface to align with BoardSplitter's clean, Apple-like visual system, including system typography, translucent surfaces, a compact sticky header, clearer workflow hierarchy, and responsive two-column workspace.
- Replaced the old theme switch and individual navigation pills with an icon appearance control and Related Sites menu.
- Fixed Buttonshy duplex mirroring for landscape short-edge printing and clarified the required flip edge in the UI.
- Moved Buttonshy crosshairs to each card's original corners inside the bleed and corrected inset-aware guide arm directions.
- Added automatic or custom Buttonshy bleed color controls.
- Changed image rendering to stretch-to-fill across all layouts and removed the obsolete image-fit selector.
- Added clickable safe-margin suggestions with one-click layout/page switching for unsafe combinations.
- Added Euro card size (2.32" × 3.62" / 59 × 92 mm).
- Added duplex-only corner guide placement control with `Back only` as the default.
- Added the Related Sites ecosystem menu, footer support/contact links, and Cloudflare analytics.
- Added theme toggle with saved preference and responsive desktop/tablet/phone layout.
- Added back nudge controls with preview indicator and reset-to-zero workflow.
- Added per-card back assignment, batch assignment tools, and automatic single-back behavior.
- Added safe-margin overlay, hard export guardrails, auto-rotation, and preview crosshairs/Buttonshy cut-box support.

## Development
No build step required. This is a static site suitable for GitHub Pages.

Run the tests with:

```sh
node --test tests/*.test.js
```
