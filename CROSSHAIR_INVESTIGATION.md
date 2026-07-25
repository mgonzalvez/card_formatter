# Crosshair Cutting Guides — Investigation and Resolution

**Investigation date**: 2026-05-13
**Resolved**: 2026-05-14
**Status**: Implemented; retained as a historical technical note

---

## Reported Issue

Corner crosshair guides appeared misaligned with visible card edges for non-poker card sizes in:

1. Traditional card grid (`grid3x3`)
2. Gutterfold (`gutterfold`)
3. Buttonshy (`grid2x3bleed`)

## Root Cause

The guides were drawn at the layout box corners, but card images used contain/cover scaling. When an uploaded image's aspect ratio differed from the selected card size, the visible image did not necessarily reach the box edges.

The guides and layout geometry were correct; the image fitting behavior caused the apparent offset.

## Implemented Resolution

### Stretch-to-fill image rendering

All PDF and Canvas preview paths now stretch each image to the selected card box dimensions:

- No letterboxing or pillarboxing
- No cropping
- Non-uniform scaling is allowed when source and card aspect ratios differ
- The obsolete Image fit selector was removed

The relevant PDF helpers are `drawImageFit()` and `drawImageFitRotated()`. Gutterfold and Buttonshy preview rendering use the same stretch-to-fill behavior.

### Traditional and gutterfold guides

Crosshairs remain at the exact card box corners. With images filling those boxes, the guides align with the visible card boundaries.

### Buttonshy guide placement

The initial May 13 fix placed guides at the outer bleed boundary. This was refined on May 14:

- Crosshairs now mark the original card corners inside the bleed.
- The crosshair inset equals the configured bleed amount.
- Each of the six cards owns four crosshairs, for 24 total guides.
- The orange dashed preview rectangle remains as a visual reference for the original card/cut boundary.
- `drawCrosshairs()` and `drawPreviewCrosshairs()` use inset-aware left/bottom checks so guide arms point correctly.

### Buttonshy duplex mirroring

Buttonshy uses a landscape sheet and must be printed duplex on the **short edge**. `getDuplexFlipAxis()` returns `"horizontal"`, which mirrors left and right positions for the back sheet. The UI displays an explicit short-edge warning.

Traditional layouts also use horizontal position mirroring and are printed on the **long edge** in portrait orientation.

### Buttonshy bleed color

The Buttonshy-only bleed controls support:

- **Auto**: derive a dominant color from the image edges
- **Custom**: apply the selected color to the bleed area for all cards

## Current Expected Behavior

| Layout | Image rendering | Crosshair location | Duplex instruction |
|---|---|---|---|
| Traditional | Stretch to card box | Card corners | Long edge |
| Gutterfold | Stretch to rotated card box | Card corners | No duplex flip |
| Buttonshy | Stretch to original card area with surrounding bleed | Original card corners, inset from bleed edge | Short edge |

## Regression Checklist

1. Test every card size in all three layouts.
2. Confirm mismatched source aspect ratios stretch to the selected dimensions without gaps or cropping.
3. Confirm Traditional and gutterfold preview/PDF guides align with card corners.
4. Confirm Buttonshy preview/PDF guides align with the orange dashed original-card boundary.
5. Confirm every Buttonshy card has four guides.
6. Confirm Buttonshy backs mirror left-to-right and align when printed on the short edge.
7. Confirm Traditional backs align when printed on the long edge.
8. Test Buttonshy Auto and Custom bleed colors.
