/* Independent vectors: Python hashlib.sha256 over UTF-8 strings, generated outside
 * this repository. Seed = SHA256(headers joined by LF); each row = SHA256(prev +
 * "|" + fields joined by commas); trailer = SHA256(prev + "|rows=" + row count).
 * No JavaScript implementation was used to produce chain-vectors.json.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../chain-core.js');
const samples = require('../samples.js');
const vectors = require('./chain-vectors.json');

for (const [text, expected] of [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad']
]) test(`SHA-256 known answer: ${JSON.stringify(text)}`, async () => assert.equal(await core.sha256(text), expected));

for (const [keyBytes, data, expected] of [
  [new Uint8Array(20).fill(0x0b), 'Hi There', 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7'],
  [new TextEncoder().encode('Jefe'), 'what do ya want for nothing?', '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843']
]) test(`RFC 4231 HMAC-SHA256: ${data}`, async () => {
  const key = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  assert.equal(await core.hmac(data, key), expected);
});

for (const sample of samples) {
  test(`Python chain vector: ${sample.id}`, async () => {
    const expected = vectors.find(vector => vector.id === sample.id);
    assert.ok(expected);
    assert.deepEqual(sample.headers, expected.headers);
    assert.deepEqual(sample.rows, expected.rows);
    const chain = await core.createChain(sample);
    assert.equal(chain.seed, expected.seed);
    assert.deepEqual(chain.rows.map(row => row.hash), expected.hashes);
    assert.equal(chain.trailer.hash, expected.trailer);
    assert.equal((await core.verify(chain)).valid, true);
    assert.ok(chain.rows.every(row => row.hash.length === 64));
  });
}

for (const [operation, firstMismatch, trailerValid] of [
  ['rewrite', 2, false], ['delete', 2, false], ['swap', 2, false], ['insert', 2, false],
  ['truncate', null, false], ['header', 1, false], ['rehashOne', 3, false]
]) test(`Tamper and rechain: ${operation}`, async () => {
  const original = await core.createChain(samples[0]);
  const snapshot = JSON.stringify(original);
  const changed = await core.tamper(original, operation);
  assert.equal(JSON.stringify(original), snapshot);
  const result = await core.verify(changed);
  assert.equal(result.valid, false);
  assert.equal(result.firstMismatch, firstMismatch);
  assert.equal(result.trailer.valid, trailerValid);
  assert.equal((await core.verify(await core.rechain(changed))).valid, true);
});

test('Recalculation propagates through every subsequent row', async () => {
  const changed = await core.tamper(await core.createChain(samples[0]), 'rewrite');
  const result = await core.verify(changed);
  assert.deepEqual(result.rows.map(row => row.valid), [true, false, false, false, false, false, false, false]);
  assert.notEqual(result.expected, result.actual);
});

for (const hasTrailer of [true, false]) {
  for (const operation of ['truncate', 'delete', 'rehashOne']) {
    test(`Last-row operation ${operation}; trailer=${hasTrailer}`, async () => {
      const chain = await core.createChain(samples[0], {hasTrailer});
      const changed = await core.tamper(chain, operation, {index:7, count:2});
      const result = await core.verify(changed);
      assert.equal(result.firstMismatch, null);
      assert.equal(result.valid, !hasTrailer);
      assert.equal(result.trailer.valid, hasTrailer ? false : null);
    });
  }
}

test('A fixed seed does not bind the header', async () => {
  const chain = await core.createChain(samples[0], {includeHeader:false});
  assert.equal(chain.seed, '0'.repeat(64));
  assert.equal((await core.verify(await core.tamper(chain, 'header'))).valid, true);
});

test('A required trailer cannot be silently removed', async () => {
  const chain = await core.createChain(samples[0]);
  chain.trailer = null;
  const result = await core.verify(chain);
  assert.equal(result.valid, false);
  assert.equal(result.trailer.present, false);
});

test('Trailer row count is checked even if its hash cell is unchanged', async () => {
  const chain = await core.createChain(samples[0]);
  chain.trailer.count = 7;
  assert.equal((await core.verify(chain)).trailer.valid, false);
});

test('Appending preserves the existing prefix and seals the new tail', async () => {
  const chain = await core.createChain(samples[0]);
  const added = await core.appendRow(chain, ['10:00', 'Room-D', 'C-1005', 'IN']);
  assert.deepEqual(added.rows.slice(0, -1), chain.rows);
  assert.equal(added.trailer.count, 9);
  assert.equal((await core.verify(added)).valid, true);
});

test('ASCII fields reject ambiguous separators, control characters and excessive lengths', async () => {
  for (const value of ['', 'a,b', 'a|b', 'a\nb', 'a\rb', 'a\tb', '\u3042', 'x'.repeat(65)]) {
    assert.equal(core.fieldsValid([value, 'B', 'C', 'D']), false);
    await assert.rejects(core.createChain({headers:samples[0].headers, rows:[[value, 'B', 'C', 'D']]}), /invalidFields/);
  }
  assert.equal(core.fieldsValid(['<tag>', 'B', 'C', 'D']), true);
});

test('Out-of-range operations are rejected', async () => {
  const chain = await core.createChain(samples[0]);
  await assert.rejects(core.tamper(chain, 'swap', {index:7}), /noNextRow/);
  await assert.rejects(core.tamper(chain, 'truncate', {count:9}), /invalidCount/);
  await assert.rejects(core.tamper(chain, 'rewrite', {index:-1}), /invalidIndex/);
  await assert.rejects(core.tamper(chain, 'unknown'), /invalidOperation/);
});

test('An empty log has a seed and a verifiable zero-row trailer', async () => {
  const chain = await core.createChain({headers:samples[0].headers, rows:[]});
  assert.equal((await core.verify(chain)).valid, true);
  assert.equal(chain.trailer.count, 0);
});
