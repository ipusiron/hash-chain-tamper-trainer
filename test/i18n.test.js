 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const messages = require('../messages.js');
const samples = require('../samples.js');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const forbidden = /既に|全て|分かる|無い|インターフェース|\d+(?:か所|箇所)|に限る|想定していない|効く|走る|照合|突き合わせ|注目すべき|ここで重要なのは|(?:サーバ|ユーザ|ブラウザ|フォルダ|パラメータ|エディタ|マネージャ|リポジトリ)(?!ー)/;

test('Japanese and English keys and substitutions match', () => {
  const keys = Object.keys(messages.ja).sort();
  assert.ok(keys.length > 100);
  assert.deepEqual(keys, Object.keys(messages.en).sort());
  for (const key of keys) {
    const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(parameters(messages.ja[key]), parameters(messages.en[key]), key);
  }
});
test('All static and literal dynamic message keys exist', () => {
  const keys = [...read('index.html').matchAll(/data-i18n(?:-label)?="([^"]+)"/g)].map(match => match[1]);
  keys.push(...[...read('app.js').matchAll(/\bt\('([\w.]+)'(?:\)|,)/g)].map(match => match[1]));
  assert.ok(keys.length > 60);
  for (const key of keys) assert.ok(Object.hasOwn(messages.ja,key),key);
  for (const sample of samples) assert.ok(messages.ja[sample.labelKey]);
});
test('Application logic contains no Japanese text', () => {
  for (const file of ['app.js','chain-core.js']) assert.doesNotMatch(read(file), /[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/, file);
});
test('Japanese wording and spacing; English has no Japanese beyond language switch and noscript', () => {
  for (const [key,value] of Object.entries(messages.ja)) {
    assert.doesNotMatch(value, forbidden, key);
    assert.doesNotMatch(value, /[\u3040-\u30ff\u3400-\u9fff] +[A-Za-z0-9]|[A-Za-z0-9] +[\u3040-\u30ff\u3400-\u9fff]/, key);
  }
  for (const [key,value] of Object.entries(messages.en)) {
    if (!['language','noscript.ja'].includes(key)) assert.doesNotMatch(value, /[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/, key);
  }
});
test('Claims do not present the tool as tamper prevention or proof', () => {
  for (const [key,value] of Object.entries(messages.ja)) {
    if (key.startsWith('quote.')) continue;
    assert.doesNotMatch(value, /改ざんを防ぐ|改ざん防止|改ざんの証明(?!にならない)/, key);
  }
});

test('Japanese prose consistently uses chain and rebuilding terminology', () => {
  for (const [key, value] of Object.entries(messages.ja)) {
    if (/^quote\.[12]$/.test(key)) continue;
    assert.doesNotMatch(value, /鎖|張り直|prev/, key);
  }
  assert.doesNotMatch(read('README.md'), /鎖|張り直|prev/);
  assert.ok(messages.ja.rechain.includes('後ろのハッシュをすべて計算し直す（作り直す）'));
  assert.ok(messages.ja['lesson.10.table.1.b'].includes('「前のハッシュ|項目」'));
});
