# Card Formatter — Implementation Plan (August 2026 Feedback)

Status: **Partially implemented.** Companion to `Card Formatter Feedback August 2026.md`.

## Implemented (2026-09-05)
- **Item 1 — Back Assignment: Labeled Backs + Drag-and-Drop** — fully implemented. Numbered `Back N` badges on back thumbnails, drag-and-drop assignment onto front thumbnails, `is-dropping` visual feedback.
- **Back pairing editor** — new feature added on top of the plan: when multiple backs are uploaded, a "Edit back pairs" toggle opens a visual editor panel below the canvas showing each card with its front thumbnail, assigned back thumbnail, back assignment dropdown, and rotation buttons (0°/90°/180°/270°). Canvas preview shows `Back N` badges per card while the editor is open. Per-card back rotations are respected in both preview and PDF export.

## Remaining
- **Item 2 — Back Orientation: "Flip backs 180°" Toggle** — still planned. The back pairing editor provides per-card rotation (0/90/180/270) which covers this use case, but a global toggle is not yet implemented.

## Feedback Summary

1. **Individual card backs** — with many unique backs, the assignment UI shows "Back 1, Back 2, …" dropdowns but the back thumbnails carry no matching labels, forcing manual counting. Feedback author suggests drag-and-drop of back images onto card fronts.
2. **Card back orientation** — with a single back, duplex output is correct (long-edge flip). With several unique backs, the back page comes out upside down; after printing, front and back orientations are opposite.

---

## Item 2 — Back Orientation: "Flip backs 180°" Toggle

### Decision: per-card 180° rotation, exposed as a user toggle

- **Per-card, not whole-page.** Back positions are already mirrored by `getMirroredPositions()` (app.js:533) so each back lands exactly over its front after the printer flip. Rotating the *whole page* 180° would also flip the positions (mirror-x ↔ mirror-y), breaking front/back alignment. Rotating *each back* 180° inside its box preserves alignment and only corrects the art orientation — the exact reported symptom.
- **Toggle, not a hard fix.** The back-drawing path is identical for one back vs. many (same mirrored positions, same `cardRotation ? 90 : 0` rotation — app.js:1657 PDF, app.js:1435 preview). The single-vs-multiple discrepancy therefore comes from configuration (a larger card count can select a landscape sheet, which switches the duplex flip axis via `getDuplexFlipAxis`) and/or printer-specific duplex behavior. Duplex back orientation is inherently ambiguous (depends on printer flip mechanics and how the user turns the card), so a user-facing toggle is the standard, low-risk fix and cannot regress the currently-correct single-back case. Default: **off**.

### Changes

**`index.html`**
- Add a second `setting-toggle-row` in the Back nudge section (step 4, after the nudge toggle at ~line 321), reusing existing `.switch` styles:
  - Label: **Flip backs 180°**
  - Helper: "Rotate each back half a turn if they print upside down."
  - Control: `<input id="flipBacksToggle" type="checkbox" />`

**`app.js`**
- Element ref near the other `getElementById` refs (top of file): `const flipBacksToggle = document.getElementById("flipBacksToggle");`
- `updateLayoutUi()` (app.js:1776): gate exactly like the nudge toggle — `flipBacksToggle.disabled = !duplexLayouts || !hasBacks;` and uncheck when disabled (duplexLayouts = `grid3x3` or `grid2x3bleed`, i.e. non-gutterfold with backs uploaded).
- Rotation math, in both `renderPreview()` and `generatePdf()`:
  ```js
  const backRotation = (cardRotation ? 90 : 0) + (flipBacksToggle.checked ? 180 : 0);
  ```
- **Preview** (`renderPreview`): the shared draw loop (app.js:1423–1455) currently calls `drawPreviewImage(ctx, img, x, y, w, h, cardRotation ? 90 : 0)`. Make the rotation side-aware: fronts keep `cardRotation ? 90 : 0`; when `previewBack` is active the images are backs, so use `backRotation`.
- **PDF** (`generatePdf`): replace the back draw (app.js:1657–1663, currently `cardRotation ? drawImageFitRotated(..., 90) : drawImageFit(...)`) with a dispatch on `backRotation`: `0` → `drawImageFit`, otherwise → `drawImageFitRotated(backPage, backEmbed, nudgedBox, backRotation)`.
- **`drawPreviewImage()`** (app.js:1469): extend to handle 180° and 270°:
  ```js
  if (rotationDeg === 270) {
    ctx.save(); ctx.translate(x, y + h); ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, 0, 0, h, w); ctx.restore(); return;
  }
  if (rotationDeg === 180) {
    ctx.save(); ctx.translate(x + w, y + h); ctx.rotate(Math.PI);
    ctx.drawImage(img, 0, 0, w, h); ctx.restore(); return;
  }
  ```
- **`drawImageFitRotated()`** (app.js:747): add a 180° branch *before* the existing 90/270 logic — no width/height swap, origin at the box's top-right:
  ```js
  if (rotationDeg === 180) {
    page.drawImage(image, {
      x: box.x + box.width,
      y: box.y + box.height,
      width: box.width,
      height: box.height,
      rotate: degrees(180),
    });
    return;
  }
  ```
  Origin math verified by analogy with the production 90° branch: pdf-lib rotates around the placement's bottom-left corner, so a 180°-rotated image must be anchored at the box's top-right to occupy the box exactly.
- **Gutterfold is untouched** — its backs share the sheet with fronts (no duplex flip); its 90/270 draws stay as-is.
- Event listener: `flipBacksToggle.addEventListener("change", () => renderPreview().catch(...))` (thumbnails are unaffected by the flip).
- Nudge composes independently: nudge shifts the box position; the 180° rotation happens inside the box.

**`styles.css`**
- Small margin between the two `setting-toggle-row`s in the nudge section (existing classes reused, no new components).

---

## Item 1 — Back Assignment: Labeled Backs + Drag-and-Drop

### Changes

**`app.js` — `renderThumbnails()` (app.js:1004–1113)**

1. **Numbered back badges.** In the back-thumbnail loop (app.js:1067–1082), prepend a badge span to each back wrapper: `Back 1`, `Back 2`, … — matching the dropdown option labels (`Back ${backIndex + 1}`, app.js:1049) so users never count.
2. **Drag source (backs).** When `backCount > 1`: `wrapper.draggable = true`; on `dragstart`, `event.dataTransfer.setData("text/plain", String(backIndex))` and `effectAllowed = "copy"`.
3. **Drop targets (fronts).** When `backCount > 1`, on each front wrapper (app.js:1016–1065):
   - `dragover` → `preventDefault()` + add `is-dropping` class (only if the payload is a back);
   - `dragleave` → remove `is-dropping`;
   - `drop` → `preventDefault()`, read the back index, validate `0 <= index < backCount`, set `backAssignments[frontIndex] = backIndex`, then `renderPreview()` + `renderThumbnails()` (same refresh pattern as the select's change handler, app.js:1053–1059).
4. **Fallbacks stay.** The per-front dropdown, Select-all checkbox, and batch Apply tools remain (touch devices don't support HTML5 DnD).
5. **Hint.** When `backCount > 1`, show a one-line helper near the back thumbnails: "Tip: drag a back onto a front to assign it."

**`styles.css`**
- `.thumb { position: relative; }`
- `.thumb-badge` — small pill, absolutely positioned over the top-left of the image (offset inside the 7px thumb padding).
- `.thumb.is-dropping` — accent border/background highlight for the drop target.
- `.thumb.draggable { cursor: grab; }` / `.thumb.draggable:active { cursor: grabbing; }` (back thumbnails only).

---

## Docs

- **`README.md`** — Features: add the 180° back-flip toggle and drag-and-drop assignment; Changelog: two new entries.
- **`AGENTS.md`** — Recent Changes table: one row for this work; Core Functions/Key Patterns: note the `flipBacksToggle` state and back-rotation math.

## Verification

1. `node --test tests/*.test.js`
   - `dom-contract.test.js` cross-checks every `getElementById` in app.js against unique ids in index.html — adding `flipBacksToggle` to both files keeps it green.
   - `layout-engine.test.js` unaffected (no engine changes).
2. Manual browser check:
   - Upload multiple fronts + multiple backs:
     - Back thumbnails show `Back 1…N` badges.
     - Dragging a back onto a front updates the dropdown, preview, and exports.
     - With "Preview backs" on, toggling **Flip backs 180°** rotates each back (not the layout) in the preview.
     - Exported PDF backs are rotated 180° per card; positions unchanged.
     - Toggle off = byte-identical behavior to today.
   - Gutterfold: no flip control effect, backs still 270° on the right column.
   - Single back + long-edge flip: unchanged (regression guard for the reporter's working case).
   - Custom-size layouts with `cardRotation` (90°): backs render at 90° or 270° correctly with the toggle on/off.

## Open Decisions

- Toggle placement: currently planned in the **Back nudge** section (step 4) as a second toggle row, since both are optional duplex-alignment controls. Alternative: next to "Preview backs" in the preview toolbar. Defaulting to the nudge section unless told otherwise.
