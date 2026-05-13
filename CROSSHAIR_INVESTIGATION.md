# Crosshair Cutting Guides — Investigation & Fix Plan

**Date**: 2026-05-13
**Status**: Root cause identified, fix plan ready, awaiting user confirmation before implementation

---

## Reported Issue

Corner crosshair cutting guides are misaligned with card edges for non-poker card sizes in:
1. **Traditional 3x3 grid** (`grid3x3`)
2. **Gutterfold** (`gutterfold`)
3. **Buttonshy** (`grid2x3bleed`) — guides should be at bleed area outer bounds

---

## Root Cause (Confirmed via Screenshot)

The screenshot shows bridge-size cards in a 3x3 grid. The crosshairs are drawn at the **box corners**, but the card images inside don't reach the box edges. This is because `drawImageFit` uses **"contain" mode** by default — it preserves the image's aspect ratio and centers it within the box. When the uploaded image's aspect ratio doesn't perfectly match the selected card size, letterboxing/pillarboxing occurs, creating a gap between the visible image edge and the box corner where the crosshair sits.

**In short**: Crosshairs are at box corners (correct), but images don't fill the box (problem).

---

## User Requirements (Clarified)

1. **Image fitting**: Stretch/shrink card images to fill the selected card size box completely. No cropping. Non-uniform scaling (stretching) is acceptable if the image aspect ratio differs from the selected card size.

2. **Crosshairs for 3x3 and gutterfold**: At the exact card box corners (already correct — just need images to fill the box).

3. **Crosshairs for buttonshy**: At the bleed box outer bounds (requires `crosshairInsetPt = 0`).

---

## Fix Plan

### Change A: Image Drawing — Stretch to Fill (no cropping)

**5 locations to modify:**

| Location | Lines | Function/Context | Change |
|----------|-------|------------------|--------|
| `drawImageFit()` | 506-519 | PDF: 3x3, buttonshy front | Remove scale calculation, draw at `box.width` × `box.height` |
| `drawImageFitRotated()` | 522-549 | PDF: gutterfold (90°/270°) | Remove scale calculation, draw at `box.width` × `box.height` |
| Gutterfold preview (left) | 1052-1059 | Canvas: gutterfold fronts | Remove scale/offset, draw `img` at `0, 0, h, w` (post-rotate) |
| Gutterfold preview (right) | 1088-1095 | Canvas: gutterfold backs | Same as left column |
| Buttonshy preview | 1171-1178 | Canvas: buttonshy | Remove scale/offset, draw at `x, y, w, h` |

### Change B: Buttonshy Crosshair Inset — Set to 0

| Location | Line | Context | Change |
|----------|------|---------|--------|
| Preview render | 891 | `renderPreview()` | `crosshairInsetPt = 0` |
| PDF generation | 1265 | `downloadSheet()` | `crosshairInsetPt = 0` |

### Change C: Fit Mode Selector (Optional)

The `<select id="fitSelect">` dropdown offers "contain" and "cover" options. Since the user wants stretch-to-fill behavior always, we have two options:
- **A**: Keep the dropdown but make both options do stretch-to-fill (de facto removes the choice)
- **B**: Remove the dropdown from the UI entirely
- **C**: Keep the dropdown functional but change the default to stretch

**Awaiting user preference on this.**

---

## Code Locations Reference

### `drawImageFit` (line 506) — PDF, non-rotated layouts
```js
// BEFORE:
const scale = fitMode === "contain"
    ? Math.min(box.width / imgW, box.height / imgH)
    : Math.max(box.width / imgW, box.height / imgH);
const drawW = imgW * scale;
const drawH = imgH * scale;
const x = box.x + (box.width - drawW) / 2;
const y = box.y + (box.height - drawH) / 2;
page.drawImage(image, { x, y, width: drawW, height: drawH });

// AFTER:
page.drawImage(image, { x: box.x, y: box.y, width: box.width, height: box.height });
```

### `drawImageFitRotated` (line 522) — PDF, gutterfold (90°/270°)
```js
// AFTER: draw at box.width × box.height instead of scaled dimensions
```

### Canvas preview — gutterfold left (line 1052-1059)
After `ctx.translate(x + w, y)` + `ctx.rotate(Math.PI / 2)`, draw:
```js
ctx.drawImage(img, 0, 0, h, w); // h=box.width*scale, w=box.height*scale
```

### Canvas preview — gutterfold right (line 1088-1095)
Same pattern as left column.

### Canvas preview — buttonshy (line 1171-1178)
```js
// AFTER:
ctx.drawImage(img, x, y, w, h);
```

### Crosshair inset (lines 891, 1265)
```js
// BEFORE:
const crosshairInsetPt = inchesToPoints(bleedIn);
// AFTER:
const crosshairInsetPt = 0;
```

---

## Files Affected

| File | Changes |
|------|---------|
| `app.js` | All changes (5 image drawing + 2 crosshair inset) |
| `index.html` | Possibly — remove/hide fit mode dropdown (TBD) |

---

## Open Questions

1. **Fit mode dropdown**: Should we remove it from the UI, keep it but make both options do stretch-to-fill, or keep it functional with a different default?
2. **Gutterfold preview rotation**: The gutterfold canvas preview uses `ctx.translate` + `ctx.rotate` before drawing. After stretch-to-fill, the `drawImage` call becomes `ctx.drawImage(img, 0, 0, h, w)` (note: w and h are swapped due to rotation). Confirmed correct?
3. **Buttonshy orange dashed rectangle** (line 1185-1191): This shows the original card bounds within the bleed area. Should this remain as a visual reference now that crosshairs are at the bleed outer bounds?

---

## Testing Plan (after fix)

1. Upload bridge-size cards, select 3x3 → verify crosshairs align with visible card edges
2. Upload poker-size images but select bridge size → verify image stretches to fill bridge box, crosshairs at corners
3. Upload bridge-size cards, select gutterfold → verify crosshairs at rotated-card corners
4. Upload poker-size cards, select buttonshy → verify crosshairs at bleed box outer corners
5. Download PDF for each layout → verify crosshairs match preview
6. Test all card sizes (poker, square, bridge, euro, mini) across all 3 layouts
7. Test with extreme aspect ratio mismatch (e.g., wide image → square card) to confirm stretching works without errors
