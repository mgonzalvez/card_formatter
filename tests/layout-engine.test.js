const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../layout-engine.js");

const pages = {
  letter: { w: 8.5, h: 11 },
  a4: { w: 8.27, h: 11.69 },
};

function candidate(overrides = {}) {
  return engine.computeCandidate({
    layoutKey: "grid3x3",
    pageKey: "letter",
    pageSize: pages.letter,
    orientation: "portrait",
    cardSize: { w: 2.75, h: 3.5 },
    safeMarginIn: 0.25,
    bleedIn: 0.25,
    gutterIn: 0.25,
    ...overrides,
  });
}

test("validates the accepted custom-size range", () => {
  assert.equal(engine.validateCardSize({ w: 0.5, h: 11.19 }).valid, true);
  assert.equal(engine.validateCardSize({ w: 0.49, h: 3.5 }).valid, false);
  assert.equal(engine.validateCardSize({ w: 2.5, h: 11.2 }).valid, false);
  assert.equal(engine.validateCardSize({ w: NaN, h: 3.5 }).valid, false);
});

test("lays out 2.75 by 3.5 inch dividers as 2 by 3 on Letter", () => {
  const result = candidate();
  assert.equal(result.cols, 2);
  assert.equal(result.rows, 3);
  assert.equal(result.capacity, 6);
});

test("lays out the divider safely on A4", () => {
  const result = candidate({
    pageKey: "a4",
    pageSize: pages.a4,
  });
  assert.equal(result.cols, 2);
  assert.equal(result.rows, 3);
  assert.equal(result.capacity, 6);
});

test("uses the strict safe boundary and rejects a card just beyond it", () => {
  const exact = candidate({ cardSize: { w: 8, h: 10.5 } });
  const overflow = candidate({ cardSize: { w: 8.01, h: 10.5 } });
  assert.equal(exact.capacity, 1);
  assert.equal(overflow, null);
});

test("includes Buttonshy bleed in capacity calculations", () => {
  const result = candidate({
    layoutKey: "grid2x3bleed",
    orientation: "landscape",
  });
  assert.equal(result.cardBoxSize.w, 3.25);
  assert.equal(result.cardBoxSize.h, 4);
  assert.equal(result.cols, 3);
  assert.equal(result.rows, 2);
  assert.equal(result.capacity, 6);
});

test("reserves two rotated columns and the center gutter for gutterfold", () => {
  const result = candidate({ layoutKey: "gutterfold" });
  assert.deepEqual(result.cardBoxSize, { w: 3.5, h: 2.75 });
  assert.equal(result.cols, 2);
  assert.equal(result.rows, 3);
  assert.equal(result.capacity, 3);
});

test("automatically prefers landscape paper for a landscape custom card", () => {
  const candidates = engine.enumerateCandidates({
    layoutKeys: ["grid3x3"],
    pageKeys: ["letter"],
    pageSizes: pages,
    cardSize: { w: 5, h: 3 },
    safeMarginIn: 0.25,
    bleedIn: 0,
    gutterIn: 0.25,
  });
  const best = engine.chooseBestCandidate(candidates, 0);
  assert.equal(best.orientation, "landscape");
  assert.equal(best.cardRotation, false);
  assert.equal(best.capacity, 4);
});

test("uses uploaded card count to minimize pages and unused slots", () => {
  const choices = [
    { layout: "grid3x3", page: "letter", orientation: "portrait", cardRotation: false, capacity: 9 },
    { layout: "grid2x3bleed", page: "letter", orientation: "landscape", cardRotation: false, capacity: 6 },
  ];
  assert.equal(engine.chooseBestCandidate(choices, 6).capacity, 6);
  assert.equal(engine.chooseBestCandidate(choices, 7).capacity, 9);
});

test("derives duplex mirroring from layout and paper orientation", () => {
  assert.equal(engine.getDuplexFlipAxis("grid3x3", "portrait"), "horizontal");
  assert.equal(engine.getDuplexFlipAxis("grid3x3", "landscape"), "vertical");
  assert.equal(engine.getDuplexFlipAxis("grid2x3bleed", "landscape"), "horizontal");
  assert.equal(engine.getDuplexFlipAxis("grid2x3bleed", "portrait"), "vertical");
});
