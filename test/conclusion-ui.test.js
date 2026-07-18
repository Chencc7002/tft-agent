import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../src/app/small-window-ui/${name}`, import.meta.url), "utf8");

test("small-window exposes conclusion controls, status, card, and independent feedback", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("styles.css");
  assert.match(html, /id="conclusion-mode-select"/u);
  assert.match(app, /answer\?\.generatedConclusion/u);
  assert.match(app, /data-conclusion-status/u);
  assert.match(app, /target: "explanation"/u);
  assert.match(app, /rating: sentiment === "good" \? "helpful" : "unhelpful"/u);
  assert.match(app, /data-feedback-reason-submit/u);
  assert.match(app, /explanation_incorrect/u);
  assert.match(app, /\.\.\.\(reason \? \{ reason \} : \{\}\)/u);
  assert.match(css, /\.generated-conclusion/u);
  assert.match(css, /\.feedback-reasons\[hidden\]/u);
  assert.match(css, /@media \(max-width: 519px\)[\s\S]*\.conclusion-footer/u);
});

