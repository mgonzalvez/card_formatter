const { PDFDocument, rgb, degrees } = PDFLib;

const frontFilesInput = document.getElementById("frontFiles");
const backFilesInput = document.getElementById("backFiles");
const layoutSelect = document.getElementById("layoutSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const cardSizeSelect = document.getElementById("cardSizeSelect");
const gutterInput = document.getElementById("gutterInput");
const crosshairLengthInput = document.getElementById("crosshairLength");
const crosshairStrokeInput = document.getElementById("crosshairStroke");
const crosshairColorSelect = document.getElementById("crosshairColor");
const cornerGuideModeWrap = document.getElementById("cornerGuideModeWrap");
const cornerGuideModeSelect = document.getElementById("cornerGuideMode");
const cornerGuideModeHelper = document.getElementById("cornerGuideModeHelper");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const previewCanvas = document.getElementById("previewCanvas");
const previewMeta = document.getElementById("previewMeta");
const previewBackToggle = document.getElementById("previewBackToggle");
const previewPrev = document.getElementById("previewPrev");
const previewNext = document.getElementById("previewNext");
const previewPageIndicator = document.getElementById("previewPageIndicator");
const autoLayoutBtn = document.getElementById("autoLayoutBtn");
const frontThumbs = document.getElementById("frontThumbs");
const backThumbs = document.getElementById("backThumbs");
const thumbMeta = document.getElementById("thumbMeta");
const batchBackSelect = document.getElementById("batchBackSelect");
const applyBackBtn = document.getElementById("applyBackBtn");
const selectAllFronts = document.getElementById("selectAllFronts");
const thumbToolbar = document.querySelector(".thumb-toolbar");
const backAssignHelper = document.getElementById("backAssignHelper");
const nudgeToggle = document.getElementById("nudgeToggle");
const nudgeControls = document.getElementById("nudgeControls");
const nudgeXInput = document.getElementById("nudgeX");
const nudgeYInput = document.getElementById("nudgeY");
const themeToggle = document.getElementById("themeToggle");
const resetNudgeBtn = document.getElementById("resetNudgeBtn");
const unitToggle = document.getElementById("unitToggle");
const unitLabel = document.getElementById("unitLabel");
const layoutHelper = document.getElementById("layoutHelper");
const summaryLabel1 = document.getElementById("summaryLabel1");
const summaryValue1 = document.getElementById("summaryValue1");
const summaryLabel2 = document.getElementById("summaryLabel2");
const summaryValue2 = document.getElementById("summaryValue2");
const summaryLabel3 = document.getElementById("summaryLabel3");
const summaryValue3 = document.getElementById("summaryValue3");
const gutterLabel = document.getElementById("gutterLabel");
const exportHeading = document.getElementById("exportHeading");
const duplexNote = document.getElementById("duplexNote");
const bleedColorControls = document.getElementById("bleedColorControls");
const bleedAutoColor = document.getElementById("bleedAutoColor");
const bleedColorPicker = document.getElementById("bleedColorPicker");
const customSizeControls = document.getElementById("customSizeControls");
const customCardWidthInput = document.getElementById("customCardWidth");
const customCardHeightInput = document.getElementById("customCardHeight");
const customWidthLabel = document.getElementById("customWidthLabel");
const customHeightLabel = document.getElementById("customHeightLabel");
const customSizeMessage = document.getElementById("customSizeMessage");
const customLayoutResult = document.getElementById("customLayoutResult");
let storedPreviewBackState = previewBackToggle.checked;
let backAssignments = [];
let lastUnitMetric = false;
let currentPreviewPage = 0;
let customBleedColor = null; // {r, g, b} or null for auto

const BLEED_GAP_IN = 0.25;
const BLEED_EXTEND_IN = 0.25;
const SAFE_MARGIN_IN = 0.25;
const POINTS_PER_IN = 72;

const pageSizes = {
  letter: { w: 8.5, h: 11 },
  a4: { w: 8.27, h: 11.69 },
};

const cardSizes = {
  poker: { w: 2.5, h: 3.5 },
  square: { w: 2.5, h: 2.5 },
  bridge: { w: 2.25, h: 3.5 },
  euro: { w: 2.32, h: 3.62 },
  mini: { w: 1.75, h: 2.5 },
};

let customCardSize = { ...cardSizes.poker };
let previousCardSizeKey = "poker";
let customInputTimer = null;


function setStatus(message) {
  statusEl.textContent = message;
}

function inchesToPoints(inches) {
  return inches * POINTS_PER_IN;
}

function inchesToMm(inches) {
  return inches * 25.4;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 255, g: 255, b: 255 };
}

function formatNumber(value, decimals = 1) {
  const fixed = value.toFixed(decimals);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

function formatSizeLabel(size, useMetric) {
  if (useMetric) {
    const w = formatNumber(inchesToMm(size.w), 1);
    const h = formatNumber(inchesToMm(size.h), 1);
    return `${w} × ${h} mm`;
  }
  return `${formatNumber(size.w, 2)}" × ${formatNumber(size.h, 2)}"`;
}

function getGutterValueInInches() {
  const raw = Number(gutterInput.value || 0);
  if (Number.isNaN(raw)) return 0.25;
  const inches = unitToggle.checked ? raw / 25.4 : raw;
  return Math.min(0.75, Math.max(0.10, inches));
}

function getBleedValueInInches() {
  const raw = Number(gutterInput.value || 0);
  if (Number.isNaN(raw)) return 0.25;
  const inches = unitToggle.checked ? raw / 25.4 : raw;
  return Math.min(0.75, Math.max(0.10, inches));
}

function isCustomCardSize() {
  return cardSizeSelect.value === "custom";
}

function getSelectedCardSizeInches() {
  return isCustomCardSize() ? { ...customCardSize } : (cardSizes[cardSizeSelect.value] || cardSizes.poker);
}

function getCustomSizeValidation() {
  return CardLayoutEngine.validateCardSize(customCardSize, 0.5, 11.19);
}

function setCustomInputsFromState() {
  const useMetric = unitToggle.checked;
  const width = useMetric ? inchesToMm(customCardSize.w) : customCardSize.w;
  const height = useMetric ? inchesToMm(customCardSize.h) : customCardSize.h;
  customCardWidthInput.value = Number.isFinite(width) ? formatNumber(width, useMetric ? 1 : 2) : "";
  customCardHeightInput.value = Number.isFinite(height) ? formatNumber(height, useMetric ? 1 : 2) : "";
}

function updateCustomSizeUi() {
  const useMetric = unitToggle.checked;
  const custom = isCustomCardSize();
  customSizeControls.hidden = !custom;
  customWidthLabel.textContent = useMetric ? "Width (mm)" : "Width (in)";
  customHeightLabel.textContent = useMetric ? "Height (mm)" : "Height (in)";
  customCardWidthInput.min = useMetric ? "12.7" : "0.5";
  customCardHeightInput.min = useMetric ? "12.7" : "0.5";
  customCardWidthInput.max = useMetric ? "284.2" : "11.19";
  customCardHeightInput.max = useMetric ? "284.2" : "11.19";
  customCardWidthInput.step = useMetric ? "0.1" : "0.01";
  customCardHeightInput.step = useMetric ? "0.1" : "0.01";

  if (!custom) {
    customSizeMessage.textContent = "";
    customLayoutResult.textContent = "";
    return;
  }

  const validation = getCustomSizeValidation();
  customSizeMessage.textContent = validation.valid
    ? ""
    : (useMetric
      ? validation.message.replace("0.5 in", "12.7 mm").replace("11.19 in", "284.2 mm")
      : validation.message);
}

function readCustomSizeInputs() {
  const useMetric = unitToggle.checked;
  const width = Number(customCardWidthInput.value);
  const height = Number(customCardHeightInput.value);
  customCardSize = {
    w: Number.isFinite(width) ? (useMetric ? width / 25.4 : width) : NaN,
    h: Number.isFinite(height) ? (useMetric ? height / 25.4 : height) : NaN,
  };
  updateCustomSizeUi();
}

function updateUnitDisplay() {
  const useMetric = unitToggle.checked;
  unitLabel.textContent = useMetric ? "Units: Metric (mm)" : "Units: Imperial (inches)";
  gutterLabel.textContent = useMetric ? "Center gutter / bleed (mm)" : "Center gutter / bleed (in)";

  if (useMetric !== lastUnitMetric) {
    const current = Number(gutterInput.value || 0);
    if (!Number.isNaN(current)) {
      const next = useMetric ? inchesToMm(current) : current / 25.4;
      gutterInput.value = formatNumber(next, useMetric ? 2 : 2);
    }
    lastUnitMetric = useMetric;
  }

  if (useMetric) {
    gutterInput.min = formatNumber(inchesToMm(0.10), 2);
    gutterInput.max = formatNumber(inchesToMm(0.75), 2);
    gutterInput.step = "0.5";
  } else {
    gutterInput.min = "0.10";
    gutterInput.max = "0.75";
    gutterInput.step = "0.05";
  }

  const sizeEntries = [
    { key: "poker", label: "Poker" },
    { key: "square", label: "Square" },
    { key: "bridge", label: "Bridge" },
    { key: "euro", label: "Euro" },
    { key: "mini", label: "Mini" },
    { key: "custom", label: "Custom…" },
  ];
  const current = cardSizeSelect.value;
  cardSizeSelect.innerHTML = "";
  sizeEntries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.key;
    const size = cardSizes[entry.key];
    option.textContent = size ? `${entry.label} (${formatSizeLabel(size, useMetric)})` : entry.label;
    cardSizeSelect.appendChild(option);
  });
  cardSizeSelect.value = current || "poker";
  setCustomInputsFromState();
  updateCustomSizeUi();

  if (useMetric) {
    layoutHelper.textContent =
      "Buttonshy extends image edges by 6.35 mm per side (adjustable), with cut guides at the original card size. " +
      "Custom sizes automatically choose the safest paper orientation and card placement.";
  } else {
    layoutHelper.textContent =
      "Buttonshy extends image edges by 0.25\" per side (adjustable), with cut guides at the original card size. " +
      "Custom sizes automatically choose the safest paper orientation and card placement.";
  }
  updateSummary();
}

function updateSummary() {
  const layoutKey = layoutSelect.value;
  const useMetric = unitToggle.checked;
  const cardSize = getSelectedCardSizeInches();
  const backCount = getBackFiles().length;

  summaryLabel1.textContent = "Layout";
  summaryValue1.textContent = formatLayoutName(layoutKey);

  summaryLabel2.textContent = "Card size";
  summaryValue2.textContent = isCustomCardSize() && !getCustomSizeValidation().valid
    ? "Custom size incomplete"
    : `${isCustomCardSize() ? "Custom · " : ""}${formatSizeLabel(cardSize, useMetric)}`;

  summaryLabel3.textContent = "Details";
  let detailParts = [];
  if (layoutKey === "grid2x3bleed") {
    const bleedIn = getBleedValueInInches();
    const bleed = useMetric ? `${formatNumber(inchesToMm(bleedIn), 2)} mm` : `${formatNumber(bleedIn, 2)}"`;
    detailParts.push(`Bleed: ${bleed} per side`);
  } else if (layoutKey === "gutterfold") {
    const gutterIn = getGutterValueInInches();
    const gutter = useMetric ? `${formatNumber(inchesToMm(gutterIn), 2)} mm` : `${formatNumber(gutterIn, 2)}"`;
    detailParts.push(`Gutter: ${gutter}`);
  } else {
    detailParts.push("Bleed: none");
  }

  if (layoutKey === "gutterfold") {
    detailParts.push(backCount > 0 ? "Backs: same sheet (no duplex)" : "Backs: none");
  } else if (backCount === 0) {
    detailParts.push("Backs: none");
  } else if (backCount === 1) {
    detailParts.push("Backs: 1 (duplex)");
  } else {
    detailParts.push(`Backs: ${backCount} (duplex)`);
  }

  summaryValue3.textContent = detailParts.join(" · ");
}
function getLayoutConfig(layout) {
  if (layout === "grid3x3") {
    return { cols: 3, rows: 3, gap: 0, centerGutter: 0 };
  }
  if (layout === "gutterfold") {
    return { cols: 2, rows: 4, gap: 0, centerGutter: getGutterValueInInches() };
  }
  return { cols: 3, rows: 2, gap: 0, centerGutter: 0 };
}

// Compute dynamic cols/rows that fit within safe margins.
// Never shrinks below the current hardcoded grid — preserves existing layouts
// even if they slightly exceed safe margins. Grows larger for smaller cards.
function computeLayoutGrid(layoutKey, pageSize, cardSize) {
  const safeMarginPt = inchesToPoints(SAFE_MARGIN_IN);
  const safeW = pageSize.w - safeMarginPt * 2;
  const safeH = pageSize.h - safeMarginPt * 2;
  const current = getLayoutConfig(layoutKey);

  if (layoutKey === "grid3x3") {
    // Portrait page, portrait cards
    const safeCols = Math.max(1, Math.floor(safeW / cardSize.w));
    const safeRows = Math.max(1, Math.floor(safeH / cardSize.h));
    const pageCols = Math.max(1, Math.floor(pageSize.w / cardSize.w));
    const pageRows = Math.max(1, Math.floor(pageSize.h / cardSize.h));
    const fitsOnPage = pageCols >= current.cols && pageRows >= current.rows;
    return {
      cols: fitsOnPage ? Math.max(current.cols, safeCols) : safeCols,
      rows: fitsOnPage ? Math.max(current.rows, safeRows) : safeRows,
      gap: 0,
      centerGutter: 0,
    };
  }

  if (layoutKey === "gutterfold") {
    // Portrait page, landscape cards, 2 fixed columns with center gutter
    const gutterPt = inchesToPoints(getGutterValueInInches());
    const colW = (pageSize.w - gutterPt) / 2;
    const safeColW = (safeW - gutterPt) / 2;
    const safeRows = Math.max(1, Math.floor(safeH / cardSize.h));
    const pageRows = Math.max(1, Math.floor(pageSize.h / cardSize.h));
    const fitsOnPage = colW >= cardSize.w && pageRows >= current.rows;
    return {
      cols: 2,
      rows: fitsOnPage ? Math.max(current.rows, safeRows) : safeRows,
      gap: 0,
      centerGutter: getGutterValueInInches(),
    };
  }

  // grid2x3bleed — landscape page, portrait cards (cardSize already includes bleed)
  const safeCols = Math.max(1, Math.floor(safeW / cardSize.w));
  const safeRows = Math.max(1, Math.floor(safeH / cardSize.h));
  const pageCols = Math.max(1, Math.floor(pageSize.w / cardSize.w));
  const pageRows = Math.max(1, Math.floor(pageSize.h / cardSize.h));
  const fitsOnPage = pageCols >= current.cols && pageRows >= current.rows;
  return {
    cols: fitsOnPage ? Math.max(current.cols, safeCols) : safeCols,
    rows: fitsOnPage ? Math.max(current.rows, safeRows) : safeRows,
    gap: 0,
    centerGutter: 0,
  };
}

function getPageSizePoints(pageSizeKey) {
  const size = pageSizes[pageSizeKey] || pageSizes.letter;
  return { w: inchesToPoints(size.w), h: inchesToPoints(size.h) };
}

function getCardSizePoints() {
  const size = getSelectedCardSizeInches();
  return { w: inchesToPoints(size.w), h: inchesToPoints(size.h) };
}

function getCardSizeInches() {
  return getSelectedCardSizeInches();
}

function isGutterfold(layoutKey) {
  return layoutKey === "gutterfold";
}

function getPageSizeForLayout(layoutKey, pageSizeKey) {
  const pageSize = getPageSizePoints(pageSizeKey);
  if (layoutKey === "grid2x3bleed") {
    return { w: pageSize.h, h: pageSize.w };
  }
  return pageSize;
}

function getCardSizeForLayout(layoutKey) {
  const cardSize = getCardSizePoints();
  if (isGutterfold(layoutKey)) {
    return { w: cardSize.h, h: cardSize.w };
  }
  if (layoutKey === "grid2x3bleed") {
    return {
      w: cardSize.w + inchesToPoints(getBleedValueInInches() * 2),
      h: cardSize.h + inchesToPoints(getBleedValueInInches() * 2),
    };
  }
  return cardSize;
}

function getCardContentSizeForLayout(layoutKey) {
  const cardSize = getCardSizePoints();
  if (isGutterfold(layoutKey)) {
    return { w: cardSize.h, h: cardSize.w };
  }
  return cardSize;
}

function candidateToLayoutState(candidate) {
  return {
    layoutKey: candidate.layout,
    pageKey: candidate.page,
    orientation: candidate.orientation,
    cardRotation: candidate.cardRotation,
    pageSize: {
      w: inchesToPoints(candidate.pageSize.w),
      h: inchesToPoints(candidate.pageSize.h),
    },
    cardSize: {
      w: inchesToPoints(candidate.cardBoxSize.w),
      h: inchesToPoints(candidate.cardBoxSize.h),
    },
    layoutConfig: {
      cols: candidate.cols,
      rows: candidate.rows,
      gap: 0,
      centerGutter: candidate.centerGutter,
    },
    capacity: candidate.capacity,
    candidate,
  };
}

function getCustomCandidates(layoutKeys, pageKeys) {
  const validation = getCustomSizeValidation();
  if (!validation.valid) return [];
  return CardLayoutEngine.enumerateCandidates({
    layoutKeys,
    pageKeys,
    pageSizes,
    cardSize: customCardSize,
    bleedIn: getBleedValueInInches(),
    gutterIn: getGutterValueInInches(),
    safeMarginIn: SAFE_MARGIN_IN,
    allowCardRotation: true,
  });
}

function getActiveLayoutState(layoutKey = layoutSelect.value, pageKey = pageSizeSelect.value) {
  if (isCustomCardSize()) {
    const candidates = getCustomCandidates([layoutKey], [pageKey]);
    const best = CardLayoutEngine.chooseBestCandidate(
      candidates,
      frontFilesInput.files?.length || 0,
      { layout: layoutKey, page: pageKey }
    );
    return best ? candidateToLayoutState(best) : null;
  }

  const pageSize = getPageSizeForLayout(layoutKey, pageKey);
  const cardSize = getCardSizeForLayout(layoutKey);
  const layoutConfig = computeLayoutGrid(layoutKey, pageSize, cardSize);
  return {
    layoutKey,
    pageKey,
    orientation: pageSize.w > pageSize.h ? "landscape" : "portrait",
    cardRotation: false,
    pageSize,
    cardSize,
    layoutConfig,
    capacity: isGutterfold(layoutKey)
      ? layoutConfig.rows
      : layoutConfig.cols * layoutConfig.rows,
    candidate: null,
  };
}

function formatOrientation(orientation) {
  return orientation === "landscape" ? "Landscape" : "Portrait";
}

function updateCustomLayoutResult(state) {
  if (!isCustomCardSize()) return;
  if (!getCustomSizeValidation().valid) {
    customLayoutResult.textContent = "";
    return;
  }
  if (!state) {
    customLayoutResult.textContent = "No safe arrangement fits this layout and paper size.";
    return;
  }
  const grid = isGutterfold(state.layoutKey)
    ? `${state.layoutConfig.rows} divider${state.layoutConfig.rows === 1 ? "" : "s"} per sheet`
    : `${state.layoutConfig.cols} × ${state.layoutConfig.rows} · ${state.capacity} per sheet`;
  const rotation = state.cardRotation ? " · cards rotated for best fit" : "";
  customLayoutResult.textContent = `${formatPageName(state.pageKey)} · ${formatOrientation(state.orientation)} · ${grid}${rotation}`;
}

function getPositions(layoutConfig, pageW, pageH, cardW, cardH, layoutKey) {
  const gap = inchesToPoints(layoutConfig.gap || 0);
  const centerGutter = inchesToPoints(layoutConfig.centerGutter || 0);

  const totalH = layoutConfig.rows * cardH + (layoutConfig.rows - 1) * gap;
  const marginY = Math.max((pageH - totalH) / 2, 0);

  const positions = [];

  if (isGutterfold(layoutKey)) {
    const leftX = Math.max(pageW / 2 - centerGutter / 2 - cardW, 0);
    const rightX = Math.max(pageW / 2 + centerGutter / 2, 0);
    for (let row = 0; row < layoutConfig.rows; row += 1) {
      const y = pageH - marginY - cardH - row * (cardH + gap);
      positions.push({ x: leftX, y, width: cardW, height: cardH });
      positions.push({ x: rightX, y, width: cardW, height: cardH });
    }
    return positions;
  }

  const totalW = layoutConfig.cols * cardW + (layoutConfig.cols - 1) * gap + centerGutter;
  const marginX = Math.max((pageW - totalW) / 2, 0);

  for (let row = 0; row < layoutConfig.rows; row += 1) {
    for (let col = 0; col < layoutConfig.cols; col += 1) {
      let x = marginX + col * (cardW + gap);
      if (layoutConfig.cols === 2 && col === 1) {
        x += centerGutter;
      }
      const y = pageH - marginY - cardH - row * (cardH + gap);
      positions.push({ x, y, width: cardW, height: cardH });
    }
  }

  return positions;
}

function getMirroredPositions(positions, pageW, pageH, axis) {
  if (axis === "vertical") {
    return positions.map((box) => ({
      ...box,
      y: pageH - (box.y + box.height),
    }));
  }
  return positions.map((box) => ({
    ...box,
    x: pageW - (box.x + box.width),
  }));
}

function getDuplexFlipAxis(layoutKey, orientation = "portrait") {
  return CardLayoutEngine.getDuplexFlipAxis(layoutKey, orientation);
}

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function loadImageFromFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

async function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

async function ensurePngDataUrl(dataUrl) {
  if (dataUrl.startsWith("data:image/png")) {
    return dataUrl;
  }
  const img = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

async function getNormalizedDataUrl(file, targetSizeInches = getCardSizeInches()) {
  const img = await loadImageFromFile(file);
  const sourceLandscape = img.width > img.height;
  const targetLandscape = targetSizeInches.w > targetSizeInches.h;
  if (sourceLandscape !== targetLandscape) {
    const canvas = document.createElement("canvas");
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return canvas.toDataURL("image/png");
  }
  return readFileAsDataUrl(file);
}

async function createBleedDataUrlFromDataUrl(dataUrl, bleedIn, cardSizeInches, overrideColor) {
  if (!bleedIn || !cardSizeInches || !cardSizeInches.w || !cardSizeInches.h) {
    return dataUrl;
  }
  try {
    const img = await loadImageFromDataUrl(dataUrl);
    const bleedPxX = Math.max(1, Math.round((bleedIn / cardSizeInches.w) * img.width));
    const bleedPxY = Math.max(1, Math.round((bleedIn / cardSizeInches.h) * img.height));
    if (!Number.isFinite(bleedPxX) || !Number.isFinite(bleedPxY)) {
      return dataUrl;
    }

    const sampleIn = 1 / 25.4; // 1mm sampling depth
    const samplePxX = Math.max(1, Math.round((sampleIn / cardSizeInches.w) * img.width));
    const samplePxY = Math.max(1, Math.round((sampleIn / cardSizeInches.h) * img.height));

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = img.width;
    sampleCanvas.height = img.height;
    const sampleCtx = sampleCanvas.getContext("2d");
    sampleCtx.drawImage(img, 0, 0);

    const getAverageColor = (x, y, w, h) => {
      const data = sampleCtx.getImageData(x, y, w, h).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count += 1;
      }
      if (!count) return { r: 255, g: 255, b: 255 };
      return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
      };
    };

    const quantize = (value) => Math.round(value / 16) * 16;
    const isNearWhite = (r, g, b) => {
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b);
      return luminance > 240;
    };
    const getDominantColor = (regions) => {
      const counts = new Map();
      regions.forEach(({ x, y, w, h }) => {
        const data = sampleCtx.getImageData(x, y, w, h).data;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 200) continue;
          const rRaw = data[i];
          const gRaw = data[i + 1];
          const bRaw = data[i + 2];
          if (isNearWhite(rRaw, gRaw, bRaw)) continue;
          const r = quantize(rRaw);
          const g = quantize(gRaw);
          const b = quantize(bRaw);
          const key = `${r},${g},${b}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
      let bestKey = null;
      let bestCount = -1;
      counts.forEach((count, key) => {
        if (count > bestCount) {
          bestCount = count;
          bestKey = key;
        }
      });
      if (!bestKey) return { r: 255, g: 255, b: 255 };
      const [r, g, b] = bestKey.split(",").map(Number);
      return { r, g, b };
    };

    let fill;
    if (overrideColor) {
      fill = overrideColor;
    } else {
      const dominant = getDominantColor([
        { x: 0, y: 0, w: img.width, h: samplePxY },
        { x: 0, y: img.height - samplePxY, w: img.width, h: samplePxY },
        { x: 0, y: 0, w: samplePxX, h: img.height },
        { x: img.width - samplePxX, y: 0, w: samplePxX, h: img.height },
      ]);
      fill = dominant;
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.width + bleedPxX * 2;
    canvas.height = img.height + bleedPxY * 2;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const fillRect = (color, x, y, w, h) => {
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fillRect(x, y, w, h);
    };

    // Fill all bleed areas with the detected or user-selected color.
    fillRect(fill, 0, 0, canvas.width, canvas.height);

    // Draw center image last
    ctx.drawImage(img, bleedPxX, bleedPxY);

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Bleed extension failed, using original image.", error);
    return dataUrl;
  }
}

async function embedNormalizedImage(pdfDoc, file, bleedIn, cardSizeInches, overrideColor) {
  let dataUrl = await getNormalizedDataUrl(file, cardSizeInches);
  if (bleedIn > 0) {
    dataUrl = await createBleedDataUrlFromDataUrl(dataUrl, bleedIn, cardSizeInches, overrideColor);
  }
  dataUrl = await ensurePngDataUrl(dataUrl);
  const response = await fetch(dataUrl);
  const bytes = await response.arrayBuffer();
  return pdfDoc.embedPng(bytes);
}

function drawImageFit(page, image, box) {
  page.drawImage(image, { x: box.x, y: box.y, width: box.width, height: box.height });
}


function drawImageFitRotated(page, image, box, rotationDeg) {
  let x = box.x;
  let y = box.y;
  if (rotationDeg === 90) {
    x = box.x + box.width;
    y = box.y;
  } else if (rotationDeg === 270) {
    x = box.x;
    y = box.y + box.height;
  }

  page.drawImage(image, {
    x,
    y,
    width: box.height,
    height: box.width,
    rotate: degrees(rotationDeg),
  });
}

function getCrosshairColor() {
  const value = crosshairColorSelect.value;
  if (value === "light") return rgb(0.7, 0.7, 0.7);
  if (value === "dark") return rgb(0.3, 0.3, 0.3);
  return rgb(0, 0, 0);
}

function getPreviewCrosshairColor() {
  const value = crosshairColorSelect.value;
  if (value === "light") return "#b3b3b3";
  if (value === "dark") return "#4d4d4d";
  return "#000000";
}

function shouldDrawCornerGuides(side, options = {}) {
  const { duplex = false, gutterfold = false } = options;
  if (gutterfold || !duplex) return true;

  const mode = cornerGuideModeSelect.value || "back";
  if (mode === "both") return true;
  return mode === side;
}

function drawCrosshairs(page, box, lengthPx, strokePt, insetPt = 0) {
  const length = lengthPx; // treat px as pt for consistent PDF sizing
  const dashArray = [8, 6];
  const dark = getCrosshairColor();
  const half = length / 2;

  const corners = [
    { x: box.x + insetPt, y: box.y + insetPt },
    { x: box.x + box.width - insetPt, y: box.y + insetPt },
    { x: box.x + insetPt, y: box.y + box.height - insetPt },
    { x: box.x + box.width - insetPt, y: box.y + box.height - insetPt },
  ];

  corners.forEach((corner) => {
    const isLeft = corner.x === box.x + insetPt;
    const isBottom = corner.y === box.y + insetPt;
    const horizontal = {
      start: { x: corner.x + (isLeft ? -half : half), y: corner.y },
      end: { x: corner.x + (isLeft ? half : -half), y: corner.y },
    };
    const vertical = {
      start: { x: corner.x, y: corner.y + (isBottom ? -half : half) },
      end: { x: corner.x, y: corner.y + (isBottom ? half : -half) },
    };

    [horizontal, vertical].forEach((line) => {
      page.drawLine({
        ...line,
        thickness: strokePt,
        color: dark,
        dashArray,
      });
    });
  });
}

function drawFoldLine(page, pageW, pageH) {
  const centerX = pageW / 2;
  const dashArray = [8, 6];
  const light = rgb(1, 1, 1);
  const dark = rgb(0, 0, 0);

  page.drawLine({
    start: { x: centerX, y: 0 },
    end: { x: centerX, y: pageH },
    thickness: 2.5,
    color: light,
    dashArray,
  });
  page.drawLine({
    start: { x: centerX, y: 0 },
    end: { x: centerX, y: pageH },
    thickness: 1.5,
    color: dark,
    dashArray,
  });
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function getBackFiles() {
  return Array.from(backFilesInput.files || []);
}

function normalizeAssignments(frontCount, backCount) {
  if (backCount === 0) {
    backAssignments = [];
    return;
  }
  if (backCount === 1) {
    backAssignments = Array(frontCount).fill(0);
    return;
  }
  if (backAssignments.length !== frontCount) {
    const next = Array(frontCount).fill(0);
    backAssignments.forEach((value, index) => {
      if (index < frontCount) {
        next[index] = Math.min(value, backCount - 1);
      }
    });
    backAssignments = next;
    return;
  }
  backAssignments = backAssignments.map((value) => Math.min(value, backCount - 1));
}

function getAssignedBackIndex(cardIndex, backCount) {
  if (backCount === 0) return null;
  if (backCount === 1) return 0;
  return backAssignments[cardIndex] ?? 0;
}

function layoutFits(pageSize, layoutConfig, cardSize) {
  const gap = inchesToPoints(layoutConfig.gap || 0);
  const centerGutter = inchesToPoints(layoutConfig.centerGutter || 0);
  const totalW = layoutConfig.cols * cardSize.w + (layoutConfig.cols - 1) * gap + centerGutter;
  const totalH = layoutConfig.rows * cardSize.h + (layoutConfig.rows - 1) * gap;
  return { fits: totalW <= pageSize.w && totalH <= pageSize.h, totalW, totalH };
}

function layoutFitsWithinSafeArea(pageSize, layoutConfig, cardSize) {
  const gap = inchesToPoints(layoutConfig.gap || 0);
  const centerGutter = inchesToPoints(layoutConfig.centerGutter || 0);
  const totalW = layoutConfig.cols * cardSize.w + (layoutConfig.cols - 1) * gap + centerGutter;
  const totalH = layoutConfig.rows * cardSize.h + (layoutConfig.rows - 1) * gap;
  const safeW = pageSize.w - inchesToPoints(SAFE_MARGIN_IN) * 2;
  const safeH = pageSize.h - inchesToPoints(SAFE_MARGIN_IN) * 2;
  return { fits: totalW <= safeW && totalH <= safeH, totalW, totalH, safeW, safeH };
}

function isLayoutStateSafe(state) {
  if (!state) return false;
  const pageFit = layoutFits(state.pageSize, state.layoutConfig, state.cardSize);
  const safeFit = layoutFitsWithinSafeArea(state.pageSize, state.layoutConfig, state.cardSize);
  return pageFit.fits && safeFit.fits;
}

function getValidLayoutStates(layoutOptions, pageOptions) {
  const states = [];
  layoutOptions.forEach((layout) => {
    pageOptions.forEach((page) => {
      const state = getActiveLayoutState(layout, page);
      if (isLayoutStateSafe(state)) states.push(state);
    });
  });
  return states;
}

function compareLayoutStates(a, b, frontCount, preferences = {}) {
  return CardLayoutEngine.compareCandidates(
    {
      layout: a.layoutKey,
      page: a.pageKey,
      orientation: a.orientation,
      cardRotation: a.cardRotation,
      capacity: a.capacity,
    },
    {
      layout: b.layoutKey,
      page: b.pageKey,
      orientation: b.orientation,
      cardRotation: b.cardRotation,
      capacity: b.capacity,
    },
    frontCount,
    preferences
  );
}

function suggestAlternatives(pageKey, layoutKey) {
  const pageOptions = Object.keys(pageSizes);
  const layoutOptions = ["grid3x3", "gutterfold", "grid2x3bleed"];
  const frontCount = frontFilesInput.files?.length || 0;
  return getValidLayoutStates(layoutOptions, pageOptions)
    .filter((state) => state.layoutKey !== layoutKey || state.pageKey !== pageKey)
    .sort((a, b) => compareLayoutStates(a, b, frontCount, { layout: layoutKey, page: pageKey }))
    .slice(0, 3);
}

function formatLayoutName(layout) {
  if (layout === "grid3x3") return "Traditional card grid";
  if (layout === "gutterfold") return "Gutterfold";
  return "Buttonshy Games Style (with bleed)";
}

function formatPageName(page) {
  return page === "a4" ? "A4" : "US Letter";
}

function pickAutoLayout() {
  const layoutOptions = ["grid3x3", "gutterfold", "grid2x3bleed"];
  const pageOptions = ["letter", "a4"];
  const currentLayout = layoutSelect.value;
  const currentPage = pageSizeSelect.value;
  const frontCount = frontFilesInput.files?.length || 0;
  const candidates = getValidLayoutStates(layoutOptions, pageOptions);
  candidates.sort((a, b) => compareLayoutStates(
    a,
    b,
    frontCount,
    { layout: currentLayout, page: currentPage }
  ));
  return candidates[0] || null;
}

async function loadPreviewImages(files, options = {}) {
  const { bleedIn = 0, cardSizeInches = null, overrideColor = null } = options;
  const images = [];
  for (const file of files) {
    try {
      let dataUrl = await getNormalizedDataUrl(file, cardSizeInches || getCardSizeInches());
      if (bleedIn > 0 && cardSizeInches) {
        dataUrl = await createBleedDataUrlFromDataUrl(dataUrl, bleedIn, cardSizeInches, overrideColor);
      }
      const img = await loadImageFromDataUrl(dataUrl);
      images.push(img);
    } catch (error) {
      console.error("Preview image load failed", error);
    }
  }
  return images;
}

async function renderThumbnails() {
  const frontFiles = Array.from(frontFilesInput.files || []);
  const backFiles = getBackFiles();
  const bleedIn = layoutSelect.value === "grid2x3bleed" ? getBleedValueInInches() : 0;
  const cardSizeInches = getCardSizeInches();
  const backCount = backFiles.length;

  normalizeAssignments(frontFiles.length, backCount);

  const frontList = frontFiles;
  const frontImages = await loadPreviewImages(frontList, { bleedIn, cardSizeInches, overrideColor: customBleedColor });
  frontThumbs.innerHTML = "";
  frontImages.forEach((img, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "thumb";
    const image = document.createElement("img");
    image.src = img.src;
    const label = document.createElement("span");
    label.textContent = frontList[index]?.name || `Front ${index + 1}`;
    wrapper.appendChild(image);
    wrapper.appendChild(label);

    if (backCount > 1) {
      const controls = document.createElement("div");
      controls.className = "thumb-controls";

      const checkboxLabel = document.createElement("label");
      checkboxLabel.className = "thumb-checkbox";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.index = String(index);
      checkbox.addEventListener("change", () => {
        if (!checkbox.checked) {
          selectAllFronts.checked = false;
        }
      });
      checkboxLabel.appendChild(checkbox);
      checkboxLabel.appendChild(document.createTextNode("Select"));
      controls.appendChild(checkboxLabel);

      const select = document.createElement("select");
      select.dataset.index = String(index);
      backFiles.forEach((file, backIndex) => {
        const option = document.createElement("option");
        option.value = String(backIndex);
        option.textContent = `Back ${backIndex + 1}`;
        select.appendChild(option);
      });
      select.value = String(getAssignedBackIndex(index, backCount) ?? 0);
      select.addEventListener("change", (event) => {
        const target = event.target;
        const cardIndex = Number(target.dataset.index);
        backAssignments[cardIndex] = Number(target.value);
        renderPreview().catch((error) => console.error(error));
        renderThumbnails().catch((error) => console.error(error));
      });
      controls.appendChild(select);

      wrapper.appendChild(controls);
    }
    frontThumbs.appendChild(wrapper);
  });

  backThumbs.innerHTML = "";
  if (backCount) {
    const backList = backFiles;
    const backImages = await loadPreviewImages(backList, { bleedIn, cardSizeInches, overrideColor: customBleedColor });
    backImages.forEach((img, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "thumb";
      const image = document.createElement("img");
      image.src = img.src;
      const label = document.createElement("span");
      label.textContent = backList[index]?.name || `Back ${index + 1}`;
      wrapper.appendChild(image);
      wrapper.appendChild(label);
      backThumbs.appendChild(wrapper);
    });
  }

  if (!frontFiles.length && !backCount) {
    thumbMeta.textContent = "Upload images to see thumbnails.";
  } else {
    thumbMeta.textContent = `${frontFiles.length} front image(s), ${backCount} back image(s) loaded.`;
  }

  batchBackSelect.innerHTML = "";
  selectAllFronts.checked = false;
  if (backCount > 1) {
    thumbToolbar.style.display = "flex";
    backAssignHelper.style.display = "none";
    backFiles.forEach((file, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Back ${index + 1}`;
      batchBackSelect.appendChild(option);
    });
    batchBackSelect.disabled = false;
    applyBackBtn.disabled = false;
  } else {
    thumbToolbar.style.display = "none";
    backAssignHelper.style.display = "block";
    const option = document.createElement("option");
    option.textContent = "No backs uploaded";
    option.value = "0";
    batchBackSelect.appendChild(option);
    batchBackSelect.disabled = true;
    applyBackBtn.disabled = true;
  }
}

async function renderPreview() {
  const frontFiles = Array.from(frontFilesInput.files || []);
  const layoutKey = layoutSelect.value;
  const layoutState = getActiveLayoutState(layoutKey, pageSizeSelect.value);
  updateCustomLayoutResult(layoutState);
  if (!layoutState) {
    const validation = getCustomSizeValidation();
    const message = validation.valid
      ? "No safe arrangement fits this layout and paper size."
      : validation.message;
    const suggestions = validation.valid
      ? suggestAlternatives(pageSizeSelect.value, layoutSelect.value)
      : [];
    if (suggestions.length) {
      const links = suggestions.map((state) => {
        const text = `${formatLayoutName(state.layoutKey)} on ${formatPageName(state.pageKey)} (${formatOrientation(state.orientation)})`;
        return `<span class="suggestion-link" data-layout="${state.layoutKey}" data-page="${state.pageKey}">${text}</span>`;
      }).join(" · ");
      previewMeta.innerHTML = `${message} <span class="suggestion-hint">Try: </span>${links}`;
      previewMeta.querySelectorAll(".suggestion-link").forEach((el) => {
        el.addEventListener("click", () => {
          layoutSelect.value = el.dataset.layout;
          pageSizeSelect.value = el.dataset.page;
          updateLayoutUi();
          renderPreview();
        });
      });
    } else {
      previewMeta.textContent = message;
    }
    setStatus(message);
    generateBtn.disabled = true;
    previewPrev.disabled = true;
    previewNext.disabled = true;
    previewPageIndicator.textContent = "Page 1 of 1";
    const invalidCtx = previewCanvas.getContext("2d");
    invalidCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    invalidCtx.fillStyle = "#ffffff";
    invalidCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    invalidCtx.fillStyle = "#737d8e";
    invalidCtx.font = "600 16px -apple-system, BlinkMacSystemFont, sans-serif";
    invalidCtx.textAlign = "center";
    invalidCtx.fillText(message, previewCanvas.width / 2, previewCanvas.height / 2);
    invalidCtx.textAlign = "start";
    return;
  }
  const {
    pageSize,
    cardSize,
    layoutConfig,
    orientation,
    cardRotation,
  } = layoutState;
  const cardSizeInches = getCardSizeInches();
  const bleedIn = layoutKey === "grid2x3bleed" ? getBleedValueInInches() : 0;
  const crosshairInsetPt = layoutKey === "grid2x3bleed" ? inchesToPoints(bleedIn) : 0;
  const fits = layoutFits(pageSize, layoutConfig, cardSize);
  const safeFits = layoutFitsWithinSafeArea(pageSize, layoutConfig, cardSize);
  const positions = getPositions(layoutConfig, pageSize.w, pageSize.h, cardSize.w, cardSize.h, layoutSelect.value);
  const flipAxis = getDuplexFlipAxis(layoutSelect.value, orientation);
  const backPositions = getMirroredPositions(positions, pageSize.w, pageSize.h, flipAxis);
  const crosshairLength = Number(crosshairLengthInput.value || 50);
  const crosshairStroke = Number(crosshairStrokeInput.value || 3);
  const backFiles = getBackFiles();
  const backCount = backFiles.length;
  normalizeAssignments(frontFiles.length, backCount);
  const hasBacks = backCount > 0;
  const duplexEnabled = hasBacks && !isGutterfold(layoutSelect.value);
  const previewBack = !isGutterfold(layoutSelect.value) && previewBackToggle.checked && hasBacks;
  const nudgeEnabled = nudgeToggle.checked && previewBack;
  const nudgeXPts = inchesToPoints(Math.min(10, Math.max(-10, Number(nudgeXInput.value || 0))) / 25.4);
  const nudgeYPts = inchesToPoints(Math.min(5, Math.max(-5, Number(nudgeYInput.value || 0))) / 25.4);

  generateBtn.disabled = !fits.fits || !safeFits.fits;
  if (!fits.fits || !safeFits.fits) {
    const suggestions = suggestAlternatives(pageSizeSelect.value, layoutSelect.value);
    const reason = !fits.fits ? "Layout exceeds page size." : "Layout exceeds safe print margins.";
    if (suggestions.length) {
      const links = suggestions.map((s) => {
        const text = `${formatLayoutName(s.layoutKey)} on ${formatPageName(s.pageKey)} (${formatOrientation(s.orientation)})`;
        return `<span class="suggestion-link" data-layout="${s.layoutKey}" data-page="${s.pageKey}">${text}</span>`;
      }).join(" · ");
      previewMeta.innerHTML = `${reason} <span class="suggestion-hint">Try: </span>${links}`;
      setStatus("Layout is unsafe to print. Click a suggestion below to switch.");
      previewMeta.querySelectorAll(".suggestion-link").forEach((el) => {
        el.addEventListener("click", () => {
          layoutSelect.value = el.dataset.layout;
          pageSizeSelect.value = el.dataset.page;
          updateLayoutUi();
          renderPreview();
        });
      });
    } else {
      previewMeta.textContent = `${reason} Try a smaller card size, different layout, or different page size.`;
      setStatus("Layout is unsafe to print. No suggestions available.");
    }
  } else {
    const rotationText = cardRotation ? " · cards rotated for best fit" : "";
    previewMeta.textContent = `${formatPageName(pageSizeSelect.value)} · ${formatOrientation(orientation)} · ${layoutState.capacity} per sheet${rotationText}`;
    const frontCount = frontFilesInput.files?.length || 0;
    const backCount = getBackFiles().length;
    if (frontCount) {
      const backText = backCount ? `, ${backCount} back image(s)` : "";
      setStatus(`Ready to print (${frontCount} front image(s)${backText}).`);
    } else {
      setStatus("Waiting for files…");
    }
  }

  const ctx = previewCanvas.getContext("2d");
  const padding = 24;
  const availableW = previewCanvas.width - padding * 2;
  const availableH = previewCanvas.height - padding * 2;
  const scale = Math.min(availableW / pageSize.w, availableH / pageSize.h);

  ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  const pageX = (previewCanvas.width - pageSize.w * scale) / 2;
  const pageY = (previewCanvas.height - pageSize.h * scale) / 2;
  ctx.fillStyle = "#fdf6ee";
  ctx.fillRect(pageX, pageY, pageSize.w * scale, pageSize.h * scale);
  ctx.strokeStyle = "#c9b8a3";
  ctx.lineWidth = 1;
  ctx.strokeRect(pageX, pageY, pageSize.w * scale, pageSize.h * scale);

  const safeMarginPx = inchesToPoints(SAFE_MARGIN_IN) * scale;
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#d48b8b";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    pageX + safeMarginPx,
    pageY + safeMarginPx,
    pageSize.w * scale - safeMarginPx * 2,
    pageSize.h * scale - safeMarginPx * 2
  );
  ctx.fillStyle = "#b04822";
  ctx.font = "12px \"Space Grotesk\", sans-serif";
  ctx.fillText("Safe margin", pageX + safeMarginPx + 8, pageY + safeMarginPx + 14);
  ctx.restore();

  if (!fits.fits || !safeFits.fits) {
    ctx.save();
    ctx.fillStyle = "rgba(200, 60, 60, 0.08)";
    ctx.fillRect(pageX, pageY, pageSize.w * scale, pageSize.h * scale);
    ctx.restore();
  }

  if (isGutterfold(layoutSelect.value)) {
    const centerX = pageX + (pageSize.w * scale) / 2;
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "#c39b79";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, pageY);
    ctx.lineTo(centerX, pageY + pageSize.h * scale);
    ctx.stroke();
    ctx.restore();
  }

  const perPage = isGutterfold(layoutKey)
    ? positions.filter((_, index) => index % 2 === 0).length
    : positions.length;
  const pageCount = Math.max(1, Math.ceil(frontFiles.length / perPage));
  currentPreviewPage = Math.min(currentPreviewPage, pageCount - 1);

  previewPrev.disabled = currentPreviewPage === 0;
  previewNext.disabled = currentPreviewPage >= pageCount - 1;
  previewPageIndicator.textContent = `Page ${currentPreviewPage + 1} of ${pageCount}`;

  const pageStart = currentPreviewPage * perPage;
  const pageEnd = pageStart + perPage;
  const frontPageFiles = frontFiles.slice(pageStart, pageEnd);

  let cardImages = [];
  if (previewBack && backFiles.length) {
    const backImages = await loadPreviewImages(backFiles, { bleedIn, cardSizeInches, overrideColor: customBleedColor });
    for (let i = 0; i < frontPageFiles.length; i += 1) {
      const globalIndex = pageStart + i;
      const backIndex = getAssignedBackIndex(globalIndex, backCount);
      cardImages.push(backIndex !== null ? backImages[backIndex] : backImages[0]);
    }
  } else if (!previewBack) {
    cardImages = frontPageFiles.length
      ? await loadPreviewImages(frontPageFiles, { bleedIn, cardSizeInches, overrideColor: customBleedColor })
      : [];
  } else if (previewBack && !backFiles.length) {
    previewMeta.textContent = "No back image available for preview. Upload a back image.";
  }

  if (isGutterfold(layoutSelect.value)) {
    const leftPositions = positions.filter((_, index) => index % 2 === 0);
    const rightPositions = positions.filter((_, index) => index % 2 === 1);
    const frontImagesGutter = frontPageFiles.length
      ? await loadPreviewImages(frontPageFiles, { bleedIn, cardSizeInches, overrideColor: customBleedColor })
      : [];
    const backImagesGutter = backFiles.length ? await loadPreviewImages(backFiles, { bleedIn, cardSizeInches, overrideColor: customBleedColor }) : [];

    leftPositions.forEach((box, index) => {
      const x = pageX + box.x * scale;
      const y = pageY + (pageSize.h - box.y - box.height) * scale;
      const w = box.width * scale;
      const h = box.height * scale;
      ctx.strokeStyle = "#e0d6c7";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      const img = frontImagesGutter[index];
      if (img) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, 0, 0, h, w);
        ctx.restore();
      } else {
        ctx.fillStyle = "#f3ebe0";
        ctx.fillRect(x, y, w, h);
      }

      if (shouldDrawCornerGuides("front", { gutterfold: true })) {
        drawPreviewCrosshairs(ctx, x, y, w, h, crosshairLength, crosshairStroke, 0);
      }
    });

    rightPositions.forEach((box, index) => {
      const x = pageX + box.x * scale;
      const y = pageY + (pageSize.h - box.y - box.height) * scale;
      const w = box.width * scale;
      const h = box.height * scale;
      ctx.strokeStyle = "#e0d6c7";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      const globalIndex = pageStart + index;
      const backIndex = getAssignedBackIndex(globalIndex, backCount);
      const img = backIndex !== null ? backImagesGutter[backIndex] : null;
      if (img) {
        ctx.save();
        ctx.translate(x, y + h);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, 0, 0, h, w);
        ctx.restore();
      } else {
        ctx.fillStyle = "#f3ebe0";
        ctx.fillRect(x, y, w, h);
      }

      if (shouldDrawCornerGuides("back", { gutterfold: true })) {
        drawPreviewCrosshairs(ctx, x, y, w, h, crosshairLength, crosshairStroke, 0);
      }
    });

    if (!fits.fits || !safeFits.fits) {
      ctx.save();
      ctx.fillStyle = "rgba(200, 60, 60, 0.15)";
      ctx.fillRect(pageX, pageY, pageSize.w * scale, pageSize.h * scale);
      ctx.restore();
      ctx.fillStyle = "#b04822";
      ctx.font = "bold 14px \"Space Grotesk\", sans-serif";
      ctx.fillText("Layout exceeds safe print margins", pageX + 12, pageY + 22);
    }
    return;
  }

  const drawPositions = previewBack ? backPositions : positions;

  if (previewBack) {
    const centerX = pageX + (pageSize.w * scale) / 2;
    const centerY = pageY + (pageSize.h * scale) / 2;
    ctx.save();
    ctx.strokeStyle = "#d1592a";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY);
    ctx.lineTo(centerX + 12, centerY);
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX, centerY + 12);
    ctx.stroke();

    if (nudgeEnabled && (nudgeXPts !== 0 || nudgeYPts !== 0)) {
      const dx = nudgeXPts * scale;
      const dy = -nudgeYPts * scale;
      ctx.strokeStyle = "#1e1b16";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + dx, centerY + dy);
      ctx.stroke();
      ctx.fillStyle = "#1e1b16";
      ctx.beginPath();
      ctx.arc(centerX + dx, centerY + dy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "12px \"Space Grotesk\", sans-serif";
      ctx.fillText(`Nudge: ${nudgeXInput.value || 0}mm, ${nudgeYInput.value || 0}mm`, centerX + 8, centerY + 18);
    } else {
      ctx.font = "12px \"Space Grotesk\", sans-serif";
      ctx.fillStyle = "#1e1b16";
      ctx.fillText("Backs centered", centerX + 8, centerY + 18);
    }
    ctx.restore();
  }

  const offsetX = previewBack && nudgeEnabled ? nudgeXPts : 0;
  const offsetY = previewBack && nudgeEnabled ? nudgeYPts : 0;

  drawPositions.forEach((box, index) => {
    const x = pageX + (box.x + offsetX) * scale;
    const y = pageY + (pageSize.h - (box.y + offsetY) - box.height) * scale;
    const w = box.width * scale;
    const h = box.height * scale;

    ctx.strokeStyle = "#e0d6c7";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    const img = cardImages[index];
    if (img) {
      drawPreviewImage(ctx, img, x, y, w, h, cardRotation ? 90 : 0);
    } else {
      ctx.fillStyle = "#f3ebe0";
      ctx.fillRect(x, y, w, h);
    }

    if (layoutSelect.value === "grid2x3bleed") {
      const inset = inchesToPoints(getBleedValueInInches()) * scale;
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#d1592a";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
      ctx.restore();
    }

    const previewSide = previewBack ? "back" : "front";
    if (shouldDrawCornerGuides(previewSide, { duplex: duplexEnabled })) {
      drawPreviewCrosshairs(ctx, x, y, w, h, crosshairLength, crosshairStroke, crosshairInsetPt * scale);
    }
  });

  if (!fits.fits || !safeFits.fits) {
    ctx.save();
    ctx.fillStyle = "rgba(200, 60, 60, 0.15)";
    ctx.fillRect(pageX, pageY, pageSize.w * scale, pageSize.h * scale);
    ctx.restore();
    ctx.fillStyle = "#b04822";
    ctx.font = "bold 14px \"Space Grotesk\", sans-serif";
    ctx.fillText("Layout exceeds safe print margins", pageX + 12, pageY + 22);
  }

}

function drawPreviewImage(ctx, img, x, y, w, h, rotationDeg = 0) {
  if (rotationDeg === 90) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, 0, h, w);
    ctx.restore();
    return;
  }
  ctx.drawImage(img, x, y, w, h);
}

function drawPreviewCrosshairs(ctx, x, y, w, h, lengthPx, strokePt, insetPx = 0) {
  const half = lengthPx / 2;
  const corners = [
    { x: x + insetPx, y: y + insetPx },
    { x: x + w - insetPx, y: y + insetPx },
    { x: x + insetPx, y: y + h - insetPx },
    { x: x + w - insetPx, y: y + h - insetPx },
  ];

  ctx.save();
  ctx.setLineDash([6, 6]);
  corners.forEach((corner) => {
    const isLeft = corner.x === x + insetPx;
    const isBottom = corner.y === y + insetPx;
    const horizontal = {
      start: { x: corner.x + (isLeft ? -half : half), y: corner.y },
      end: { x: corner.x + (isLeft ? half : -half), y: corner.y },
    };
    const vertical = {
      start: { x: corner.x, y: corner.y + (isBottom ? -half : half) },
      end: { x: corner.x, y: corner.y + (isBottom ? half : -half) },
    };

    [horizontal, vertical].forEach((line) => {
      ctx.strokeStyle = getPreviewCrosshairColor();
      ctx.lineWidth = strokePt;
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();
    });
  });
  ctx.restore();
}

async function generatePdf() {
  const frontFiles = Array.from(frontFilesInput.files || []);
  const backFiles = getBackFiles();
  const backCount = backFiles.length;
  normalizeAssignments(frontFiles.length, backCount);

  if (frontFiles.length === 0) {
    setStatus("Please add at least one front image.");
    return;
  }

  setStatus("Embedding images...");

  const layoutKey = layoutSelect.value;
  const layoutState = getActiveLayoutState(layoutKey, pageSizeSelect.value);
  if (!layoutState) {
    setStatus("No safe arrangement fits the selected size, layout, and paper.");
    return;
  }
  const {
    pageSize,
    cardSize,
    layoutConfig,
    orientation,
    cardRotation,
  } = layoutState;
  const cardSizeInches = getCardSizeInches();
  const bleedIn = layoutKey === "grid2x3bleed" ? getBleedValueInInches() : 0;
  const crosshairInsetPt = layoutKey === "grid2x3bleed" ? inchesToPoints(bleedIn) : 0;
  const layoutCheck = layoutFits(pageSize, layoutConfig, cardSize);
  const safeLayoutCheck = layoutFitsWithinSafeArea(pageSize, layoutConfig, cardSize);
  if (!layoutCheck.fits || !safeLayoutCheck.fits) {
    setStatus("Layout exceeds safe print margins. Please adjust the size, layout, or page.");
    return;
  }
  const pdfDoc = await PDFDocument.create();
  const positions = getPositions(layoutConfig, pageSize.w, pageSize.h, cardSize.w, cardSize.h, layoutKey);
  const flipAxis = getDuplexFlipAxis(layoutKey, orientation);
  const backPositions = getMirroredPositions(positions, pageSize.w, pageSize.h, flipAxis);
  const crosshairLength = Number(crosshairLengthInput.value || 50);
  const crosshairStroke = Number(crosshairStrokeInput.value || 3);
  const duplex = backCount > 0 && !isGutterfold(layoutKey);

  const frontEmbeds = [];
  for (const file of frontFiles) {
    frontEmbeds.push(await embedNormalizedImage(pdfDoc, file, bleedIn, cardSizeInches, customBleedColor));
  }

  const backEmbeds = [];
  for (const file of backFiles) {
    backEmbeds.push(await embedNormalizedImage(pdfDoc, file, bleedIn, cardSizeInches, customBleedColor));
  }

  if (isGutterfold(layoutKey)) {
    const leftPositions = positions.filter((_, index) => index % 2 === 0);
    const rightPositions = positions.filter((_, index) => index % 2 === 1);
    const perPage = leftPositions.length;
    const pages = chunkArray(frontEmbeds, perPage);

    pages.forEach((pageImages, pageIndex) => {
      const page = pdfDoc.addPage([pageSize.w, pageSize.h]);
      drawFoldLine(page, pageSize.w, pageSize.h);
      pageImages.forEach((image, index) => {
        const box = leftPositions[index];
        if (!box) return;
        drawImageFitRotated(page, image, box, 90);
        if (shouldDrawCornerGuides("front", { gutterfold: true })) {
          drawCrosshairs(page, box, crosshairLength, crosshairStroke, crosshairInsetPt);
        }
      });

      rightPositions.forEach((box, index) => {
        if (!box) return;
        const globalIndex = pageIndex * perPage + index;
        const backIndex = getAssignedBackIndex(globalIndex, backCount);
        const backEmbed = backIndex !== null ? backEmbeds[backIndex] : null;
        if (backEmbed) {
          drawImageFitRotated(page, backEmbed, box, 270);
        }
        if (shouldDrawCornerGuides("back", { gutterfold: true })) {
          drawCrosshairs(page, box, crosshairLength, crosshairStroke, crosshairInsetPt);
        }
      });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `card-output-${layoutSelect.value}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("PDF generated.");
    return;
  }

  const perPage = positions.length;
  const pages = chunkArray(frontEmbeds, perPage);

  pages.forEach((pageImages, pageIndex) => {
    const page = pdfDoc.addPage([pageSize.w, pageSize.h]);
    pageImages.forEach((image, index) => {
      const box = positions[index];
      if (!box) return;
      if (cardRotation) {
        drawImageFitRotated(page, image, box, 90);
      } else {
        drawImageFit(page, image, box);
      }
      if (shouldDrawCornerGuides("front", { duplex })) {
        drawCrosshairs(page, box, crosshairLength, crosshairStroke, crosshairInsetPt);
      }
    });

    if (duplex) {
      const backPage = pdfDoc.addPage([pageSize.w, pageSize.h]);
      pageImages.forEach((_, index) => {
        const box = backPositions[index];
        if (!box) return;
        const globalIndex = pageIndex * perPage + index;
        const backIndex = getAssignedBackIndex(globalIndex, backCount);
        const backEmbed = backIndex !== null ? backEmbeds[backIndex] : null;
          const nudgeXPts = nudgeToggle.checked
            ? inchesToPoints(Math.min(10, Math.max(-10, Number(nudgeXInput.value || 0))) / 25.4)
            : 0;
          const nudgeYPts = nudgeToggle.checked
            ? inchesToPoints(Math.min(5, Math.max(-5, Number(nudgeYInput.value || 0))) / 25.4)
            : 0;
        const nudgedBox = {
          ...box,
          x: box.x + nudgeXPts,
          y: box.y + nudgeYPts,
        };
        if (backEmbed) {
          if (cardRotation) {
            drawImageFitRotated(backPage, backEmbed, nudgedBox, 90);
          } else {
            drawImageFit(backPage, backEmbed, nudgedBox);
          }
        }
        if (shouldDrawCornerGuides("back", { duplex })) {
          drawCrosshairs(backPage, nudgedBox, crosshairLength, crosshairStroke, crosshairInsetPt);
        }
      });
    }
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `card-output-${layoutSelect.value}.pdf`;
  link.click();

  URL.revokeObjectURL(url);
  setStatus("PDF generated.");
}

generateBtn.addEventListener("click", () => {
  generatePdf().catch((error) => {
    console.error(error);
    setStatus("Something went wrong. Check the console for details.");
  });
});

function wirePreviewUpdates() {
  const inputs = [
    frontFilesInput,
    backFilesInput,
    layoutSelect,
    pageSizeSelect,
    cardSizeSelect,
    gutterInput,
    crosshairLengthInput,
    crosshairStrokeInput,
    crosshairColorSelect,
    cornerGuideModeSelect,
    previewBackToggle,
    nudgeToggle,
    nudgeXInput,
    nudgeYInput,
  ];
  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      renderPreview().catch((error) => console.error(error));
      renderThumbnails().catch((error) => console.error(error));
      updateSummary();
    });
  });
}

frontFilesInput.addEventListener("change", () => {
  const count = frontFilesInput.files?.length || 0;
  setStatus(count ? `${count} front image(s) ready.` : "Waiting for files…");
});

backFilesInput.addEventListener("change", () => {
  if (backFilesInput.files?.length) {
    setStatus("Back image(s) ready.");
  }
  updateLayoutUi();
  updateSummary();
});

cardSizeSelect.addEventListener("change", () => {
  const nextKey = cardSizeSelect.value;
  if (nextKey === "custom" && previousCardSizeKey !== "custom") {
    customCardSize = { ...(cardSizes[previousCardSizeKey] || cardSizes.poker) };
    setCustomInputsFromState();
  }
  if (nextKey !== "custom") {
    previousCardSizeKey = nextKey;
  }
  currentPreviewPage = 0;
  updateCustomSizeUi();
});

[customCardWidthInput, customCardHeightInput].forEach((input) => {
  input.addEventListener("input", () => {
    readCustomSizeInputs();
    updateSummary();
    clearTimeout(customInputTimer);
    customInputTimer = setTimeout(() => {
      currentPreviewPage = 0;
      renderPreview().catch((error) => console.error(error));
      renderThumbnails().catch((error) => console.error(error));
      updateLayoutUi();
    }, 120);
  });
});

wirePreviewUpdates();
renderPreview().catch((error) => console.error(error));
renderThumbnails().catch((error) => console.error(error));

autoLayoutBtn.addEventListener("click", () => {
  const choice = pickAutoLayout();
  if (!choice) {
    setStatus("No layout fits the selected card size.");
    return;
  }
  layoutSelect.value = choice.layoutKey;
  pageSizeSelect.value = choice.pageKey;
  currentPreviewPage = 0;
  setStatus(`Auto-layout set: ${formatLayoutName(choice.layoutKey)} on ${formatPageName(choice.pageKey)} (${formatOrientation(choice.orientation)}).`);
  renderPreview().catch((error) => console.error(error));
  updateLayoutUi();
});

function updateLayoutUi() {
  const gutterfold = isGutterfold(layoutSelect.value);
  const backFiles = getBackFiles();
  const hasBacks = backFiles.length > 0;
  const nudgeActive = nudgeToggle.checked;
  const duplexOutput = hasBacks && !gutterfold;

  exportHeading.textContent = `6. Export ${formatLayoutName(layoutSelect.value)}`;
  updateSummary();

  if (layoutSelect.value === "gutterfold") {
    gutterInput.disabled = false;
    gutterInput.parentElement.classList.remove("is-disabled");
    gutterLabel.textContent = unitToggle.checked ? "Gutterfold center gutter (mm)" : "Gutterfold center gutter (in)";
    if (Number(gutterInput.value) < (unitToggle.checked ? inchesToMm(0.10) : 0.10)) {
      gutterInput.value = unitToggle.checked ? formatNumber(inchesToMm(0.10), 2) : "0.10";
    }
  } else if (layoutSelect.value === "grid2x3bleed") {
    gutterInput.disabled = false;
    gutterInput.parentElement.classList.remove("is-disabled");
    gutterLabel.textContent = unitToggle.checked ? "Buttonshy bleed per side (mm)" : "Buttonshy bleed per side (in)";
    if (Number(gutterInput.value) < (unitToggle.checked ? inchesToMm(0.10) : 0.10)) {
      gutterInput.value = unitToggle.checked ? formatNumber(inchesToMm(0.10), 2) : "0.10";
    }
  } else {
    gutterInput.disabled = true;
    gutterInput.parentElement.classList.add("is-disabled");
    gutterLabel.textContent = "No gutter/bleed for Traditional card grid";
  }

  const isButtonshy = layoutSelect.value === "grid2x3bleed";
  bleedColorControls.style.display = isButtonshy ? "grid" : "none";

  const duplexLayouts = layoutSelect.value === "grid3x3" || layoutSelect.value === "grid2x3bleed";
  nudgeToggle.disabled = !duplexLayouts || !hasBacks;
  if (!duplexLayouts || !hasBacks) {
    nudgeToggle.checked = false;
    nudgeControls.style.display = "none";
  }
  updateNudgeUi();

  cornerGuideModeWrap.style.display = duplexOutput ? "flex" : "none";
  cornerGuideModeHelper.style.display = duplexOutput ? "block" : "none";
  if (!duplexOutput) {
    cornerGuideModeSelect.value = "back";
  }

  previewBackToggle.disabled = gutterfold || !hasBacks || (nudgeActive && hasBacks && !gutterfold);
  if (gutterfold) {
    storedPreviewBackState = previewBackToggle.checked;
    previewBackToggle.checked = false;
    previewMeta.textContent = "Gutterfold shows fronts + backs on one sheet.";
  } else if (nudgeActive && hasBacks && !gutterfold) {
    previewBackToggle.checked = true;
    storedPreviewBackState = true;
  } else if (!hasBacks) {
    storedPreviewBackState = previewBackToggle.checked;
    previewBackToggle.checked = false;
  } else {
    previewBackToggle.checked = storedPreviewBackState;
  }

  if (gutterfold) {
    duplexNote.textContent = "Fronts and backs print on one sheet (no flip needed).";
  } else if (!hasBacks) {
    duplexNote.textContent = "Upload a back image to enable duplex output.";
  } else if (layoutSelect.value === "grid2x3bleed") {
    const state = getActiveLayoutState();
    const sheet = state ? formatOrientation(state.orientation).toLowerCase() : "selected";
    duplexNote.textContent = `⚠ Duplex print: flip on the SHORT edge (${sheet} sheet).`;
  } else {
    const state = getActiveLayoutState();
    const sheet = state ? formatOrientation(state.orientation).toLowerCase() : "selected";
    duplexNote.textContent = `⚠ Duplex print: flip on the LONG edge (${sheet} sheet).`;
  }
}

layoutSelect.addEventListener("change", () => {
  previewBackToggle.checked = false;
  updateLayoutUi();
  renderPreview().catch((error) => console.error(error)).then(() => {
    const gutterfold = layoutSelect.value === "gutterfold";
    if (gutterfold) {
      previewMeta.textContent = "Fronts and backs print on one sheet (no flip needed).";
    }
  });
});

updateLayoutUi();
updateUnitDisplay();

bleedAutoColor.addEventListener("change", () => {
  bleedColorPicker.disabled = bleedAutoColor.checked;
  customBleedColor = bleedAutoColor.checked ? null : hexToRgb(bleedColorPicker.value);
  renderPreview().catch((error) => console.error(error));
  renderThumbnails().catch((error) => console.error(error));
});

bleedColorPicker.addEventListener("input", () => {
  customBleedColor = hexToRgb(bleedColorPicker.value);
  renderPreview().catch((error) => console.error(error));
  renderThumbnails().catch((error) => console.error(error));
});

function applyTheme(theme, persist = false) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  document.body.dataset.theme = nextTheme;
  themeToggle.setAttribute("aria-label", `Switch to ${nextTheme === "dark" ? "light" : "dark"} mode`);
  const themeColorMeta = document.getElementById("themeColorMeta");
  if (themeColorMeta) {
    themeColorMeta.content = nextTheme === "dark" ? "#090b10" : "#f4f7fb";
  }
  if (persist) {
    try {
      localStorage.setItem("pnpfinder-theme", nextTheme);
    } catch (error) {
      // Appearance still changes when storage is unavailable.
    }
  }
}

applyTheme(document.documentElement.dataset.theme);

previewBackToggle.addEventListener("change", () => {
  storedPreviewBackState = previewBackToggle.checked;
  renderPreview().catch((error) => console.error(error));
});

function updateNudgeUi() {
  const enabled = nudgeToggle.checked;
  nudgeControls.style.display = enabled ? "grid" : "none";
  if (enabled) {
    previewBackToggle.checked = true;
    storedPreviewBackState = true;
    previewBackToggle.disabled = true;
    previewBackToggle.closest(".switch")?.classList.add("is-disabled");
  } else {
    previewBackToggle.disabled = false;
    previewBackToggle.closest(".switch")?.classList.remove("is-disabled");
  }
}

updateNudgeUi();

unitToggle.addEventListener("change", () => {
  updateUnitDisplay();
  renderPreview().catch((error) => console.error(error));
  renderThumbnails().catch((error) => console.error(error));
});

nudgeToggle.addEventListener("change", () => {
  updateNudgeUi();
  previewBackToggle.checked = nudgeToggle.checked;
  storedPreviewBackState = previewBackToggle.checked;
  renderPreview().catch((error) => console.error(error));
});

previewPrev.addEventListener("click", () => {
  currentPreviewPage = Math.max(0, currentPreviewPage - 1);
  renderPreview().catch((error) => console.error(error));
});

previewNext.addEventListener("click", () => {
  currentPreviewPage += 1;
  renderPreview().catch((error) => console.error(error));
});

resetNudgeBtn.addEventListener("click", () => {
  nudgeXInput.value = "0";
  nudgeYInput.value = "0";
  renderPreview().catch((error) => console.error(error));
});

themeToggle.addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme, true);
  renderPreview().catch((error) => console.error(error));
});

applyBackBtn.addEventListener("click", () => {
  const backCount = getBackFiles().length;
  if (backCount === 0) return;
  const selected = Array.from(frontThumbs.querySelectorAll("input[type=\"checkbox\"]:checked"));
  if (!selected.length) return;
  const backIndex = Number(batchBackSelect.value || 0);
  selected.forEach((input) => {
    const cardIndex = Number(input.dataset.index);
    if (!Number.isNaN(cardIndex)) {
      backAssignments[cardIndex] = backIndex;
    }
  });
  renderPreview().catch((error) => console.error(error));
  renderThumbnails().catch((error) => console.error(error));
});

selectAllFronts.addEventListener("change", () => {
  const checked = selectAllFronts.checked;
  const checkboxes = frontThumbs.querySelectorAll("input[type=\"checkbox\"]");
  checkboxes.forEach((input) => {
    input.checked = checked;
  });
});
