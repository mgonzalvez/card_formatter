const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("every app element reference resolves to one unique HTML id", () => {
  const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const appIds = [...app.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
  const duplicates = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
  const missing = [...new Set(appIds.filter((id) => !htmlIds.includes(id)))];
  assert.deepEqual(duplicates, []);
  assert.deepEqual(missing, []);
});

test("loads the layout engine before the main application", () => {
  const engineIndex = html.indexOf('<script src="layout-engine.js"></script>');
  const appIndex = html.indexOf('<script src="app.js"></script>');
  assert.ok(engineIndex > -1);
  assert.ok(appIndex > engineIndex);
});

test("defines the custom option and agreed dimension constraints", () => {
  assert.match(html, /<option value="custom">Custom…<\/option>/);
  assert.match(html, /id="customCardWidth"[^>]+min="0\.5"[^>]+max="11\.19"/);
  assert.match(html, /id="customCardHeight"[^>]+min="0\.5"[^>]+max="11\.19"/);
});
