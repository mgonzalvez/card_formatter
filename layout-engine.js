(function initCardLayoutEngine(root, factory) {
  const engine = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = engine;
  }
  if (root) {
    root.CardLayoutEngine = engine;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const EPSILON = 1e-9;

  function validateCardSize(size, minIn = 0.5, maxIn = 11.19) {
    if (!size || !Number.isFinite(size.w) || !Number.isFinite(size.h)) {
      return { valid: false, message: "Enter both width and height." };
    }
    if (size.w < minIn || size.h < minIn) {
      return { valid: false, message: `Width and height must be at least ${minIn} in.` };
    }
    if (size.w > maxIn || size.h > maxIn) {
      return { valid: false, message: `Width and height cannot exceed ${maxIn} in.` };
    }
    return { valid: true, message: "" };
  }

  function orientPage(pageSize, orientation) {
    const shortSide = Math.min(pageSize.w, pageSize.h);
    const longSide = Math.max(pageSize.w, pageSize.h);
    return orientation === "landscape"
      ? { w: longSide, h: shortSide }
      : { w: shortSide, h: longSide };
  }

  function rotateSize(size, rotated) {
    return rotated ? { w: size.h, h: size.w } : { ...size };
  }

  function getDuplexFlipAxis(layoutKey, orientation = "portrait") {
    if (layoutKey === "grid2x3bleed") {
      return orientation === "landscape" ? "horizontal" : "vertical";
    }
    return orientation === "portrait" ? "horizontal" : "vertical";
  }

  function computeCandidate(options) {
    const {
      layoutKey,
      pageKey,
      pageSize,
      orientation,
      cardSize,
      cardRotation = false,
      bleedIn = 0,
      gutterIn = 0,
      safeMarginIn = 0.25,
    } = options;

    const page = orientPage(pageSize, orientation);
    const safeW = page.w - safeMarginIn * 2;
    const safeH = page.h - safeMarginIn * 2;
    if (safeW <= 0 || safeH <= 0) return null;

    if (layoutKey === "gutterfold") {
      const box = { w: cardSize.h, h: cardSize.w };
      const availableColumnsW = safeW - gutterIn;
      const rows = Math.floor((safeH + EPSILON) / box.h);
      const fitsColumns = box.w * 2 <= availableColumnsW + EPSILON;
      if (!fitsColumns || rows < 1) return null;
      return {
        layout: layoutKey,
        page: pageKey,
        orientation,
        cardRotation: false,
        pageSize: page,
        cardBoxSize: box,
        cols: 2,
        rows,
        capacity: rows,
        centerGutter: gutterIn,
        safeFit: true,
      };
    }

    const contentBox = rotateSize(cardSize, cardRotation);
    const bleed = layoutKey === "grid2x3bleed" ? bleedIn : 0;
    const cardBox = {
      w: contentBox.w + bleed * 2,
      h: contentBox.h + bleed * 2,
    };
    const cols = Math.floor((safeW + EPSILON) / cardBox.w);
    const rows = Math.floor((safeH + EPSILON) / cardBox.h);
    if (cols < 1 || rows < 1) return null;

    return {
      layout: layoutKey,
      page: pageKey,
      orientation,
      cardRotation,
      pageSize: page,
      cardBoxSize: cardBox,
      cols,
      rows,
      capacity: cols * rows,
      centerGutter: 0,
      safeFit: true,
    };
  }

  function compareCandidates(a, b, frontCount = 0, preferences = {}) {
    if (frontCount > 0) {
      const pagesA = Math.ceil(frontCount / a.capacity);
      const pagesB = Math.ceil(frontCount / b.capacity);
      if (pagesA !== pagesB) return pagesA - pagesB;

      const unusedA = pagesA * a.capacity - frontCount;
      const unusedB = pagesB * b.capacity - frontCount;
      if (unusedA !== unusedB) return unusedA - unusedB;
    } else if (a.capacity !== b.capacity) {
      return b.capacity - a.capacity;
    }

    if (preferences.layout) {
      const aPreferred = a.layout === preferences.layout ? 1 : 0;
      const bPreferred = b.layout === preferences.layout ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;
    }
    if (preferences.page) {
      const aPreferred = a.page === preferences.page ? 1 : 0;
      const bPreferred = b.page === preferences.page ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;
    }
    if (a.cardRotation !== b.cardRotation) return Number(a.cardRotation) - Number(b.cardRotation);
    if (a.orientation !== b.orientation) return a.orientation === "portrait" ? -1 : 1;
    return b.capacity - a.capacity;
  }

  function chooseBestCandidate(candidates, frontCount = 0, preferences = {}) {
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => compareCandidates(a, b, frontCount, preferences))[0];
  }

  function enumerateCandidates(options) {
    const {
      layoutKeys,
      pageKeys,
      pageSizes,
      cardSize,
      bleedIn,
      gutterIn,
      safeMarginIn,
      allowCardRotation = true,
    } = options;
    const candidates = [];

    layoutKeys.forEach((layoutKey) => {
      pageKeys.forEach((pageKey) => {
        ["portrait", "landscape"].forEach((orientation) => {
          const rotations = layoutKey === "gutterfold" || !allowCardRotation
            ? [false]
            : [false, true];
          rotations.forEach((cardRotation) => {
            const candidate = computeCandidate({
              layoutKey,
              pageKey,
              pageSize: pageSizes[pageKey],
              orientation,
              cardSize,
              cardRotation,
              bleedIn,
              gutterIn,
              safeMarginIn,
            });
            if (candidate) candidates.push(candidate);
          });
        });
      });
    });
    return candidates;
  }

  return {
    chooseBestCandidate,
    compareCandidates,
    computeCandidate,
    enumerateCandidates,
    getDuplexFlipAxis,
    orientPage,
    validateCardSize,
  };
}));
