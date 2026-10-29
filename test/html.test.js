 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
const app = read('app.js');

test('Five local classic scripts are deferred in dependency order', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 5);
  assert.deepEqual(scripts.map(([,a]) => /src="([^"]+)"/.exec(a)[1]),
    ['chain-core.js','samples.js','messages.js','learning-progress.js','app.js']);
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
  const learning = read('learning-progress.js');
  assert.doesNotMatch(app + learning, /localStorage\.clear|\.removeItem\(|sessionStorage|indexedDB|document\.cookie/);
  assert.match(learning, /const KEY = 'hash-chain-tamper-trainer\.learning'/);
  assert.doesNotMatch(learning, /innerHTML|outerHTML|insertAdjacentHTML|\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(html, /type="file"|type="module"/);
});
test('Unique IDs, four entrances and three free-experiment tabs and explicit hidden override', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const name of ['guide','free','learn','settings','build','tamper','protect']) {
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

test('Dynamic reference links match the exact approved list in both languages', () => {
  const messages = require('../messages.js');
  const allowed = [
  "https://www.cyberghostvpn.com/en_US/glossary/hash-chain",
  "https://doi.org/10.1007/BF00196791",
  "https://doi.org/10.1007/3-540-38424-3_32",
  "https://www.usenix.org/conference/7th-usenix-security-symposium/cryptographic-support-secure-logs-untrusted-machines",
  "https://doi.org/10.1145/317087.317089",
  "https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/efficient-data-structures-tamper-evident",
  "https://doi.org/10.1145/358790.358797",
  "https://www.rfc-editor.org/rfc/rfc1760",
  "https://www.rfc-editor.org/rfc/rfc2289",
  "https://www.rfc-editor.org/rfc/rfc3161",
  "https://www.rfc-editor.org/rfc/rfc5816",
  "https://www.rfc-editor.org/rfc/rfc6962",
  "https://www.rfc-editor.org/rfc/rfc9162",
  "https://git-scm.com/book/en/v2/Git-Internals-Git-Objects",
  "https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History",
  "https://github.com/ipusiron/mic-gain-logger/blob/main/docs/csv.md",
  "https://doi.org/10.6028/NIST.FIPS.180-4",
  "https://www.rfc-editor.org/rfc/rfc4231",
  "https://ipusiron.github.io/sha256-byte-inspector/",
  "https://ipusiron.github.io/git-secrets-playground/",
  "https://ipusiron.github.io/mic-gain-logger/",
  "https://ipusiron.github.io/basexx-visualizer/",
  "https://ipusiron.github.io/jwt-inspector/",
  "https://ipusiron.github.io/hex-dump-trainer/",
  "https://ipusiron.github.io/otp-animation/"
];
  for (const lang of ['ja','en']) {
    const urls = Object.entries(messages[lang]).filter(([key]) => /^(?:reference|tool)\.\d+\.url$/.test(key)).map(([,value])=>value);
    assert.deepEqual(urls.sort(), allowed.slice().sort());
  }
  assert.match(app, /link\.rel = 'noopener noreferrer'/);
  assert.match(app, /link\.target = '_blank'/);
});

test('Seven non-modal steps expose progress, tasks, results and navigation', () => {
  assert.match(html, /<ol id="guide-steps"/);
  assert.match(html, /<progress id="guide-progress" max="7"/);
  assert.match(app, /setAttribute\('aria-current', 'step'\)/);
  assert.doesNotMatch(html, /<dialog|aria-modal/);
  for (const id of ['guide-action','guide-task','guide-result','guide-takeaway','guide-aim','guide-background','guide-now','guide-mechanism','guide-back','guide-next','guide-reset']) assert.ok(html.includes('id="'+id+'"'));
  const messages = require('../messages.js');
  for (const lang of ['ja','en']) for (let step=1;step<=7;step+=1) {
    for (const field of ['title','task','action','learned']) assert.ok(messages[lang]['guide.'+step+'.'+field]);
  }
});
