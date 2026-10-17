 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
const app = read('app.js');

test('Four local classic scripts are deferred in dependency order', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 4);
  assert.deepEqual(scripts.map(([,a]) => /src="([^"]+)"/.exec(a)[1]), ['chain-core.js','samples.js','messages.js','app.js']);
  for (const [,attrs, body] of scripts) {
    assert.match(attrs, /\bdefer\b/);
    assert.doesNotMatch(attrs, /type=/);
    assert.equal(body.trim(), '');
  }
});
test('Exact restrictive CSP, referrer and local favicon', () => {
  assert.equal(/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1],
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; connect-src 'none'");
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<link rel="icon" href="data:,">/);
});
test('No unsafe DOM writes, inline handlers, networking, workers or record persistence', () => {
  assert.doesNotMatch(html, /\s(?:on\w+|style)\s*=/i);
  assert.doesNotMatch(app, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);
  assert.doesNotMatch(app, /sessionStorage|indexedDB|document\.cookie|\bfetch\s*\(|XMLHttpRequest|WebSocket|Worker\s*\(|sendBeacon|EventSource/);
  assert.doesNotMatch(app, /history\.|location\.\w+\s*=/);
  const storage = [...app.matchAll(/localStorage\.(getItem|setItem)\('([^']+)'/g)];
  assert.equal(storage.length, 2);
  assert.ok(storage.every(match => match[2] === 'hash-chain-tamper-trainer.lang'));
  assert.doesNotMatch(html, /type="file"|type="module"/);
});
test('Unique IDs, five accessible tabs and explicit hidden override', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const name of ['build','tamper','protect','learn','quiz']) {
    assert.match(html, new RegExp(`id="tab-${name}"[^>]*role="tab"[^>]*aria-controls="panel-${name}"`));
    assert.match(html, new RegExp(`id="panel-${name}"[^>]*role="tabpanel"[^>]*aria-labelledby="tab-${name}"`));
  }
  assert.ok(read('style.css').replace(/\s/g,'').includes('[hidden]{display:none!important;}'));
});
test('External links match the allowlist and isolate opened tabs', () => {
  const allowed = ['https://github.com/ipusiron/hash-chain-tamper-trainer'];
  const links = [...html.matchAll(/<a\b([^>]+)>/g)];
  assert.equal(links.length, allowed.length);
  assert.deepEqual(links.map(([,a]) => /href="([^"]+)"/.exec(a)[1]).sort(), allowed.sort());
  for (const [,attrs] of links) {
    assert.match(attrs, /rel="noopener noreferrer"/);
    assert.match(attrs, /target="_blank"/);
  }
});
