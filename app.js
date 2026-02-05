const { PDFDocument, rgb, degrees } = PDFLib;

const frontFilesInput = document.getElementById("frontFiles");
const backFilesInput = document.getElementById("backFiles");
const layoutSelect = document.getElementById("layoutSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const cardSizeSelect = document.getElementById("cardSizeSelect");
const fitSelect = document.getElementById("fitSelect");
const gutterInput = document.getElementById("gutterInput");
const crosshairLengthInput = document.getElementById("crosshairLength");
const crosshairStrokeInput = document.getElementById("crosshairStroke");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const previewCanvas = document.getElementById("previewCanvas");
const previewMeta = document.getElementById("previewMeta");
const previewBackToggle = document.getElementById("previewBackToggle");
const autoLayoutBtn = document.getElementById("autoLayoutBtn");
const frontThumbs = document.getElementById("frontThumbs");
const backThumbs = document.getElementById("backThumbs");
const thumbMeta = document.getElementById("thumbMeta");
const batchBackSelect = document.getElementById("batchBackSelect");
const applyBackBtn = document.getElementById("applyBackBtn");
const selectAllFronts = document.getElementById("selectAllFronts");
const thumbToolbar = document.querySelector(".thumb-toolbar");
const backAssignHelper = document.getElementById("backAssignHelper");
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
let storedPreviewBackState = previewBackToggle.checked;
let backAssignments = [];
let lastUnitMetric = false;

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
  mini: { w: 1.75, h: 2.5 },
};

function setStatus(message) {
  statusEl.textContent = message;
}

function inchesToPoints(inches) {
  return inches * POINTS_PER_IN;
}

function inchesToMm(inches) {
  return inches * 25.4;
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
  return Math.min(0.75, Math.max(0.25, inches));
}

function getBleedValueInInches() {
  const raw = Number(gutterInput.value || 0);
  if (Number.isNaN(raw)) return 0.25;
  const inches = unitToggle.checked ? raw / 25.4 : raw;
  return Math.min(0.75, Math.max(0.25, inches));
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
    gutterInput.min = formatNumber(inchesToMm(0.25), 2);
    gutterInput.max = formatNumber(inchesToMm(0.75), 2);
    gutterInput.step = "0.5";
  } else {
    gutterInput.min = "0.25";
    gutterInput.max = "0.75";
    gutterInput.step = "0.05";
  }

  const sizeEntries = [
    { key: "poker", label: "Poker" },
    { key: "square", label: "Square" },
    { key: "bridge", label: "Bridge" },
    { key: "mini", label: "Mini" },
  ];
  const current = cardSizeSelect.value;
  cardSizeSelect.innerHTML = "";
  sizeEntries.forEach((entry) => {
    const size = cardSizes[entry.key];
    const option = document.createElement("option");
    option.value = entry.key;
    option.textContent = `${entry.label} (${formatSizeLabel(size, useMetric)})`;
    cardSizeSelect.appendChild(option);
  });
  cardSizeSelect.value = current || "poker";

  if (useMetric) {
    layoutHelper.textContent =
      "Note: Buttonshy Games Style uses a landscape page and extends image edges by 6.35 mm per side (adjustable). " +
      "Cut guides remain at the original card size. Traditional card grid uses a portrait page and flips on the long edge when duplex.";
  } else {
    layoutHelper.textContent =
      "Note: Buttonshy Games Style uses a landscape page and extends image edges by 0.25\" per side (adjustable). " +
      "Cut guides remain at the original card size. Traditional card grid uses a portrait page and flips on the long edge when duplex.";
  }
  updateSummary();
}

function updateSummary() {
  const layoutKey = layoutSelect.value;
  const useMetric = unitToggle.checked;
  const cardSize = cardSizes[cardSizeSelect.value] || cardSizes.poker;
  const backCount = getBackFiles().length;

  summaryLabel1.textContent = "Layout";
  summaryValue1.textContent = formatLayoutName(layoutKey);

  summaryLabel2.textContent = "Card size";
  summaryValue2.textContent = formatSizeLabel(cardSize, useMetric);

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

function getPageSizePoints(pageSizeKey) {
  const size = pageSizes[pageSizeKey] || pageSizes.letter;
  return { w: inchesToPoints(size.w), h: inchesToPoints(size.h) };
}

function getCardSizePoints() {
  const size = cardSizes[cardSizeSelect.value] || cardSizes.poker;
  return { w: inchesToPoints(size.w), h: inchesToPoints(size.h) };
}

function getCardSizeInches() {
  return cardSizes[cardSizeSelect.value] || cardSizes.poker;
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

function getDuplexFlipAxis(layoutKey) {
  if (layoutKey === "grid2x3bleed") {
    return "vertical";
  }
  return "horizontal";
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

async function getNormalizedDataUrl(file) {
  const img = await loadImageFromFile(file);
  if (img.width > img.height) {
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

async function createBleedDataUrlFromDataUrl(dataUrl, bleedIn, cardSizeInches) {
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

    const canvas = document.createElement("canvas");
    canvas.width = img.width + bleedPxX * 2;
    canvas.height = img.height + bleedPxY * 2;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(img, 0, 0, 1, img.height, 0, bleedPxY, bleedPxX, img.height);
    ctx.drawImage(img, img.width - 1, 0, 1, img.height, bleedPxX + img.width, bleedPxY, bleedPxX, img.height);
    ctx.drawImage(img, 0, 0, img.width, 1, bleedPxX, 0, img.width, bleedPxY);
    ctx.drawImage(img, 0, img.height - 1, img.width, 1, bleedPxX, bleedPxY + img.height, img.width, bleedPxY);

    ctx.drawImage(img, 0, 0, 1, 1, 0, 0, bleedPxX, bleedPxY);
    ctx.drawImage(img, img.width - 1, 0, 1, 1, bleedPxX + img.width, 0, bleedPxX, bleedPxY);
    ctx.drawImage(img, 0, img.height - 1, 1, 1, 0, bleedPxY + img.height, bleedPxX, bleedPxY);
    ctx.drawImage(img, img.width - 1, img.height - 1, 1, 1, bleedPxX + img.width, bleedPxY + img.height, bleedPxX, bleedPxY);

    ctx.drawImage(img, bleedPxX, bleedPxY);

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Bleed extension failed, using original image.", error);
    return dataUrl;
  }
}

async function embedNormalizedImage(pdfDoc, file, bleedIn, cardSizeInches) {
  let dataUrl = await getNormalizedDataUrl(file);
  if (bleedIn > 0) {
    dataUrl = await createBleedDataUrlFromDataUrl(dataUrl, bleedIn, cardSizeInches);
  }
  const response = await fetch(dataUrl);
  const bytes = await response.arrayBuffer();
  return pdfDoc.embedPng(bytes);
}

function drawImageFit(page, image, box, fitMode) {
  const imgW = image.width;
  const imgH = image.height;
  const scale = fitMode === "contain"
    ? Math.min(box.width / imgW, box.height / imgH)
    : Math.max(box.width / imgW, box.height / imgH);

  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const x = box.x + (box.width - drawW) / 2;
  const y = box.y + (box.height - drawH) / 2;

  page.drawImage(image, { x, y, width: drawW, height: drawH });
}

function drawImageFitRotated(page, image, box, fitMode, rotationDeg) {
  const imgW = image.width;
  const imgH = image.height;
  const scale = fitMode === "contain"
    ? Math.min(box.width / imgH, box.height / imgW)
    : Math.max(box.width / imgH, box.height / imgW);

  const drawW = imgW * scale;
  const drawH = imgH * scale;

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
    width: drawW,
    height: drawH,
    rotate: degrees(rotationDeg),
  });
}

function drawCrosshairs(page, box, lengthPx, strokePt, insetPt = 0) {
  const length = lengthPx; // treat px as pt for consistent PDF sizing
  const dashArray = [8, 6];
  const light = rgb(1, 1, 1);
  const dark = rgb(0, 0, 0);
  const half = length / 2;

  const corners = [
    { x: box.x + insetPt, y: box.y + insetPt },
    { x: box.x + box.width - insetPt, y: box.y + insetPt },
    { x: box.x + insetPt, y: box.y + box.height - insetPt },
    { x: box.x + box.width - insetPt, y: box.y + box.height - insetPt },
  ];

  corners.forEach((corner) => {
    const horizontal = {
      start: { x: corner.x + (corner.x === box.x ? -half : half), y: corner.y },
      end: { x: corner.x + (corner.x === box.x ? half : -half), y: corner.y },
    };
    const vertical = {
      start: { x: corner.x, y: corner.y + (corner.y === box.y ? -half : half) },
      end: { x: corner.x, y: corner.y + (corner.y === box.y ? half : -half) },
    };

    [horizontal, vertical].forEach((line) => {
      page.drawLine({
        ...line,
        thickness: strokePt + 2,
        color: light,
        dashArray,
      });
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

function suggestAlternatives(pageKey, layoutKey, cardKey) {
  const suggestions = [];
  const pageOptions = Object.keys(pageSizes);
  const layoutOptions = ["grid3x3", "gutterfold", "grid2x3bleed"];

  layoutOptions.forEach((layout) => {
    pageOptions.forEach((page) => {
      const layoutConfig = getLayoutConfig(layout);
      const pageSize = getPageSizeForLayout(layout, page);
      const cardSize = getCardSizeForLayout(layout);
      const check = layoutFits(pageSize, layoutConfig, cardSize);
      if (check.fits) {
        suggestions.push({ layout, page });
      }
    });
  });

  const unique = [];
  suggestions.forEach((item) => {
    if (!unique.find((entry) => entry.layout === item.layout && entry.page === item.page)) {
      unique.push(item);
    }
  });

  return unique.slice(0, 3);
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

  const candidates = [];
  layoutOptions.forEach((layout) => {
    pageOptions.forEach((page) => {
      const layoutConfig = getLayoutConfig(layout);
      const pageSize = getPageSizeForLayout(layout, page);
      const cardSize = getCardSizeForLayout(layout);
      const check = layoutFits(pageSize, layoutConfig, cardSize);
      if (check.fits) {
        const cardsPerPage = layoutConfig.cols * layoutConfig.rows;
        const priority = (layout === currentLayout ? 2 : 0) + (page === currentPage ? 1 : 0);
        candidates.push({ layout, page, cardsPerPage, priority });
      }
    });
  });

  candidates.sort((a, b) => {
    if (b.cardsPerPage !== a.cardsPerPage) return b.cardsPerPage - a.cardsPerPage;
    return b.priority - a.priority;
  });

  return candidates[0] || null;
}

async function loadPreviewImages(files, options = {}) {
  const { bleedIn = 0, cardSizeInches = null } = options;
  const images = [];
  for (const file of files) {
    try {
      let dataUrl = await getNormalizedDataUrl(file);
      if (bleedIn > 0 && cardSizeInches) {
        dataUrl = await createBleedDataUrlFromDataUrl(dataUrl, bleedIn, cardSizeInches);
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
  const frontImages = await loadPreviewImages(frontList, { bleedIn, cardSizeInches });
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
    const backImages = await loadPreviewImages(backList, { bleedIn, cardSizeInches });
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
  const layoutConfig = getLayoutConfig(layoutKey);
  const pageSize = getPageSizeForLayout(layoutKey, pageSizeSelect.value);
  const cardSize = getCardSizeForLayout(layoutKey);
  const cardSizeInches = getCardSizeInches();
  const bleedIn = layoutKey === "grid2x3bleed" ? getBleedValueInInches() : 0;
  const crosshairInsetPt = inchesToPoints(bleedIn);
  const fits = layoutFits(pageSize, layoutConfig, cardSize);
  const safeFits = layoutFitsWithinSafeArea(pageSize, layoutConfig, cardSize);
  const positions = getPositions(layoutConfig, pageSize.w, pageSize.h, cardSize.w, cardSize.h, layoutSelect.value);
  const flipAxis = getDuplexFlipAxis(layoutSelect.value);
  const backPositions = getMirroredPositions(positions, pageSize.w, pageSize.h, flipAxis);
  const fitMode = fitSelect.value;
  const crosshairLength = Number(crosshairLengthInput.value || 50);
  const crosshairStroke = Number(crosshairStrokeInput.value || 3);
  const backFiles = getBackFiles();
  const backCount = backFiles.length;
  normalizeAssignments(frontFiles.length, backCount);
  const hasBacks = backCount > 0;
  const duplexEnabled = hasBacks && !isGutterfold(layoutSelect.value);
  const previewBack = previewBackToggle.checked && duplexEnabled;

  if (!fits.fits || !safeFits.fits) {
    const suggestions = suggestAlternatives(pageSizeSelect.value, layoutSelect.value, cardSizeSelect.value);
    const suggestionText = suggestions.length
      ? suggestions.map((s) => `${formatLayoutName(s.layout)} on ${formatPageName(s.page)}`).join(" · ")
      : "Try a smaller card size or different layout.";
    const reason = !fits.fits ? "Layout exceeds page size." : "Layout exceeds safe print margins.";
    previewMeta.textContent = `${reason} Suggestions: ${suggestionText}`;
    setStatus("Layout is unsafe to print. Adjust layout or page size.");
  } else {
    previewMeta.textContent = "Preview updates automatically.";
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

  let cardImages = [];
  if (previewBack) {
    if (backFiles.length) {
      const backImages = await loadPreviewImages(backFiles, { bleedIn, cardSizeInches });
      const perPage = positions.length;
      for (let i = 0; i < perPage; i += 1) {
        const backIndex = getAssignedBackIndex(i, backCount);
        cardImages.push(backIndex !== null ? backImages[backIndex] : backImages[0]);
      }
    } else {
      cardImages = [];
      previewMeta.textContent = "No back image available for preview. Upload a back image.";
    }
  } else {
    cardImages = frontFiles.length
      ? await loadPreviewImages(frontFiles.slice(0, positions.length), { bleedIn, cardSizeInches })
      : [];
  }

  if (isGutterfold(layoutSelect.value)) {
    const leftPositions = positions.filter((_, index) => index % 2 === 0);
    const rightPositions = positions.filter((_, index) => index % 2 === 1);
    const frontImagesGutter = frontFiles.length ? await loadPreviewImages(frontFiles.slice(0, leftPositions.length)) : [];
    const backImagesGutter = backFiles.length ? await loadPreviewImages(backFiles, { bleedIn, cardSizeInches }) : [];

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
        const drawScale = fitMode === "contain"
          ? Math.min(h / img.width, w / img.height)
          : Math.max(h / img.width, w / img.height);
        const drawW = img.width * drawScale;
        const drawH = img.height * drawScale;
        const dx = (h - drawW) / 2;
        const dy = (w - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = "#f3ebe0";
        ctx.fillRect(x, y, w, h);
      }

      drawPreviewCrosshairs(ctx, x, y, w, h, crosshairLength, crosshairStroke, 0);
    });

    rightPositions.forEach((box, index) => {
      const x = pageX + box.x * scale;
      const y = pageY + (pageSize.h - box.y - box.height) * scale;
      const w = box.width * scale;
      const h = box.height * scale;
      ctx.strokeStyle = "#e0d6c7";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      const backIndex = getAssignedBackIndex(index, backCount);
      const img = backIndex !== null ? backImagesGutter[backIndex] : backImagesGutter[0];
      if (img) {
        ctx.save();
        ctx.translate(x, y + h);
        ctx.rotate(-Math.PI / 2);
        const drawScale = fitMode === "contain"
          ? Math.min(h / img.width, w / img.height)
          : Math.max(h / img.width, w / img.height);
        const drawW = img.width * drawScale;
        const drawH = img.height * drawScale;
        const dx = (h - drawW) / 2;
        const dy = (w - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = "#f3ebe0";
        ctx.fillRect(x, y, w, h);
      }

      drawPreviewCrosshairs(ctx, x, y, w, h, crosshairLength, crosshairStroke, 0);
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

  drawPositions.forEach((box, index) => {
    const x = pageX + box.x * scale;
    const y = pageY + (pageSize.h - box.y - box.height) * scale;
    const w = box.width * scale;
    const h = box.height * scale;

    ctx.strokeStyle = "#e0d6c7";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    const img = cardImages[index] || cardImages[0];
    if (img) {
      const imgScale = fitMode === "contain"
        ? Math.min(w / img.width, h / img.height)
        : Math.max(w / img.width, h / img.height);
      const drawW = img.width * imgScale;
      const drawH = img.height * imgScale;
      const drawX = x + (w - drawW) / 2;
      const drawY = y + (h - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
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

    drawPreviewCrosshairs(ctx, x, y, w, h, crosshairLength, crosshairStroke, crosshairInsetPt * scale);
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
    const horizontal = {
      start: { x: corner.x + (corner.x === x + insetPx ? -half : half), y: corner.y },
      end: { x: corner.x + (corner.x === x + insetPx ? half : -half), y: corner.y },
    };
    const vertical = {
      start: { x: corner.x, y: corner.y + (corner.y === y + insetPx ? -half : half) },
      end: { x: corner.x, y: corner.y + (corner.y === y + insetPx ? half : -half) },
    };

    [horizontal, vertical].forEach((line) => {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = strokePt + 2;
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();

      ctx.strokeStyle = "#000000";
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

  const pdfDoc = await PDFDocument.create();
  const layoutKey = layoutSelect.value;
  const layoutConfig = getLayoutConfig(layoutKey);
  const pageSize = getPageSizeForLayout(layoutKey, pageSizeSelect.value);
  const cardSize = getCardSizeForLayout(layoutKey);
  const cardSizeInches = getCardSizeInches();
  const bleedIn = layoutKey === "grid2x3bleed" ? getBleedValueInInches() : 0;
  const crosshairInsetPt = inchesToPoints(bleedIn);
  const layoutCheck = layoutFits(pageSize, layoutConfig, cardSize);
  const safeCheck = layoutFitsWithinSafeArea(pageSize, layoutConfig, cardSize);
  if (!layoutCheck.fits || !safeCheck.fits) {
    setStatus("Layout exceeds safe print margins. Please adjust layout or page size.");
    return;
  }
  const positions = getPositions(layoutConfig, pageSize.w, pageSize.h, cardSize.w, cardSize.h, layoutKey);
  const flipAxis = getDuplexFlipAxis(layoutKey);
  const backPositions = getMirroredPositions(positions, pageSize.w, pageSize.h, flipAxis);
  const fitMode = fitSelect.value;
  const crosshairLength = Number(crosshairLengthInput.value || 50);
  const crosshairStroke = Number(crosshairStrokeInput.value || 3);
  const duplex = backCount > 0 && !isGutterfold(layoutKey);

  const frontEmbeds = [];
  for (const file of frontFiles) {
    frontEmbeds.push(await embedNormalizedImage(pdfDoc, file, bleedIn, cardSizeInches));
  }

  const backEmbeds = [];
  for (const file of backFiles) {
    backEmbeds.push(await embedNormalizedImage(pdfDoc, file, bleedIn, cardSizeInches));
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
        drawImageFitRotated(page, image, box, fitMode, 90);
        drawCrosshairs(page, box, crosshairLength, crosshairStroke, crosshairInsetPt);
      });

      rightPositions.forEach((box, index) => {
        if (!box) return;
        const globalIndex = pageIndex * perPage + index;
        const backIndex = getAssignedBackIndex(globalIndex, backCount);
        const backEmbed = backIndex !== null ? backEmbeds[backIndex] : null;
        if (backEmbed) {
          drawImageFitRotated(page, backEmbed, box, fitMode, 270);
        }
        drawCrosshairs(page, box, crosshairLength, crosshairStroke, crosshairInsetPt);
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
      drawImageFit(page, image, box, fitMode);
      drawCrosshairs(page, box, crosshairLength, crosshairStroke, crosshairInsetPt);
    });

    if (duplex) {
      const backPage = pdfDoc.addPage([pageSize.w, pageSize.h]);
      pageImages.forEach((_, index) => {
        const box = backPositions[index];
        if (!box) return;
        const globalIndex = pageIndex * perPage + index;
        const backIndex = getAssignedBackIndex(globalIndex, backCount);
        const backEmbed = backIndex !== null ? backEmbeds[backIndex] : null;
        if (backEmbed) {
          drawImageFit(backPage, backEmbed, box, fitMode);
        }
        drawCrosshairs(backPage, box, crosshairLength, crosshairStroke, crosshairInsetPt);
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
    fitSelect,
    gutterInput,
    crosshairLengthInput,
    crosshairStrokeInput,
    previewBackToggle,
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

wirePreviewUpdates();
renderPreview().catch((error) => console.error(error));
renderThumbnails().catch((error) => console.error(error));

autoLayoutBtn.addEventListener("click", () => {
  const choice = pickAutoLayout();
  if (!choice) {
    setStatus("No layout fits the selected card size.");
    return;
  }
  layoutSelect.value = choice.layout;
  pageSizeSelect.value = choice.page;
  setStatus(`Auto-layout set: ${formatLayoutName(choice.layout)} on ${formatPageName(choice.page)}.`);
  renderPreview().catch((error) => console.error(error));
  updateLayoutUi();
});

function updateLayoutUi() {
  const gutterfold = isGutterfold(layoutSelect.value);
  const backFiles = getBackFiles();
  const hasBacks = backFiles.length > 0;

  exportHeading.textContent = `5. Export ${formatLayoutName(layoutSelect.value)}`;
  updateSummary();

  if (layoutSelect.value === "gutterfold") {
    gutterInput.disabled = false;
    gutterInput.parentElement.classList.remove("is-disabled");
    gutterLabel.textContent = unitToggle.checked ? "Gutterfold center gutter (mm)" : "Gutterfold center gutter (in)";
  } else if (layoutSelect.value === "grid2x3bleed") {
    gutterInput.disabled = false;
    gutterInput.parentElement.classList.remove("is-disabled");
    gutterLabel.textContent = unitToggle.checked ? "Buttonshy bleed per side (mm)" : "Buttonshy bleed per side (in)";
  } else {
    gutterInput.disabled = true;
    gutterInput.parentElement.classList.add("is-disabled");
    gutterLabel.textContent = "No gutter/bleed for Traditional card grid";
  }

  previewBackToggle.disabled = gutterfold || !hasBacks;
  if (gutterfold) {
    storedPreviewBackState = previewBackToggle.checked;
    previewBackToggle.checked = false;
    previewMeta.textContent = "Gutterfold shows fronts + backs on one sheet.";
  } else if (!hasBacks) {
    storedPreviewBackState = previewBackToggle.checked;
    previewBackToggle.checked = false;
  } else {
    previewBackToggle.checked = storedPreviewBackState;
  }

  if (gutterfold) {
    duplexNote.textContent = "Gutterfold prints fronts and backs on one sheet (no flip).";
  } else if (!hasBacks) {
    duplexNote.textContent = "Upload a back image to enable duplex output.";
  } else if (layoutSelect.value === "grid2x3bleed") {
    duplexNote.textContent = "Flip on short edge for Buttonshy Games Style.";
  } else {
    duplexNote.textContent = "Flip on long edge for Traditional card grid.";
  }
}

layoutSelect.addEventListener("change", () => {
  previewBackToggle.checked = false;
  updateLayoutUi();
  renderPreview().catch((error) => console.error(error));
});

updateLayoutUi();
updateUnitDisplay();

previewBackToggle.addEventListener("change", () => {
  storedPreviewBackState = previewBackToggle.checked;
});

unitToggle.addEventListener("change", () => {
  updateUnitDisplay();
  renderPreview().catch((error) => console.error(error));
  renderThumbnails().catch((error) => console.error(error));
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
