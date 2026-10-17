'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const darkStart = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{/.exec(css);
assert.ok(darkStart, 'Dark colors must be inside the dark media query');
let darkEnd = darkStart.index + darkStart[0].length;
let depth = 1;
while (depth > 0 && darkEnd < css.length) {
  if (css[darkEnd] === '{') depth += 1;
  if (css[darkEnd] === '}') depth -= 1;
  darkEnd += 1;
}
assert.equal(depth, 0);
const darkBlock = css.slice(darkStart.index + darkStart[0].length, darkEnd - 1);
const lightBlock = css.slice(0, darkStart.index) + css.slice(darkEnd);
const roots = [lightBlock, darkBlock].map(block => {
  const matches = [...block.matchAll(/:root\s*\{([^}]+)\}/g)];
  assert.equal(matches.length, 1);
  return matches[0];
});
const palettes = roots.map(([, body]) => Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)]
  .map(([, name, color]) => [name, color])));
const pairs = [
  ['fg', 'bg', 4.5, 16.56, 15.67], ['muted', 'bg', 4.5, 6.29, 8.13],
  ['fg', 'surface', 4.5, 15.29, 13.74], ['muted', 'surface', 4.5, 5.81, 7.13],
  ['link', 'bg', 4.5, 7.06, 8.86], ['link', 'surface', 4.5, 6.52, 7.77],
  ['warn-fg', 'warn-bg', 4.5, 7.81, 10.82], ['ok-fg', 'ok-bg', 4.5, 8.25, 10.79],
  ['bg', 'accent', 4.5, 7.06, 8.86], ['bar', 'surface', 3, 15.29, 13.74],
  ['border', 'bg', 3, 3.37, 4.00], ['border', 'surface', 3, 3.11, 3.51],
  ['accent', 'surface', 3, 6.52, 7.77],
  ['cover-fg', 'cover-bg', 4.5, 16.56, 8.13], ['cover-bg', 'surface', 3, 15.29, 7.13]
];

function luminance(color) {
  assert.match(color, /^#[0-9a-f]{6}$/);
  const channels = color.slice(1).match(/../g).map(hex => parseInt(hex, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

for (const [mode, index] of [['light', 0], ['dark', 1]]) {
  for (const [front, back, threshold, light, dark] of pairs) {
    test(`Contrast: ${mode} ${front}/${back} meets ${threshold}:1`, () => {
      assert.equal(palettes.length, 2);
      const values = [luminance(palettes[index][front]), luminance(palettes[index][back])].sort((a, b) => a - b);
      const ratio = (values[1] + 0.05) / (values[0] + 0.05);
      assert.ok(ratio >= threshold, String(ratio));
      assert.equal(Number(ratio.toFixed(2)), index === 0 ? light : dark);
    });
  }
}

