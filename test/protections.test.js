 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../chain-core.js');
const sample = require('../samples.js')[0];

test('Generated HMAC and private signing keys cannot be exported', async () => {
  const mac = await core.hmacKey();
  const signing = await core.signingKeys();
  assert.equal(mac.extractable, false);
  assert.equal(signing.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('raw', mac));
  await assert.rejects(crypto.subtle.exportKey('pkcs8', signing.privateKey));
});

test('ECDSA accepts the original and rejects changed data and a different key', async () => {
  const keys = await core.signingKeys();
  const other = await core.signingKeys();
  const signature = await core.sign('original', keys.privateKey);
  assert.equal(await core.verifySignature('original', signature, keys.publicKey), true);
  assert.equal(await core.verifySignature('changed', signature, keys.publicKey), false);
  assert.equal(await core.verifySignature('original', signature, other.publicKey), false);
});

test('HMAC chain fails with a different key', async () => {
  const key = await core.hmacKey();
  const chain = await core.createChain(sample, {mode:'hmac', key});
  assert.equal((await core.verify(chain, {key})).valid, true);
  assert.equal((await core.verify(chain, {key:await core.hmacKey()})).firstMismatch, 1);
});

const expected = [
  [[], [false, false]], [['checkpoint'], [true, true]], [['hmac'], [true, false]],
  [['signature'], [true, false]], [['timestamp'], [true, true]]
];
for (const [protections, results] of expected) {
  for (const [i, role] of ['outsider', 'recorder'].entries()) {
    test(`Protection ${protections.join('+') || 'none'} / ${role}`, async () => {
      const result = await core.experiment(sample, protections, role);
      assert.equal(result.detected, results[i]);
      assert.equal(result.detected, result.checks.some(check => !check.valid));
      assert.deepEqual(result.steps.map(step => step.number), [1,2,3,4]);
      assert.equal(result.mayRechain, !(role === 'outsider' && protections.includes('hmac')));
    });
  }
}

for (let mask = 0; mask < 16; mask += 1) {
  const selected = core.PROTECTIONS.filter((_, i) => mask & (1 << i));
  test(`Combination ${mask}: ${selected.join('+') || 'none'}`, async () => {
    for (const role of ['outsider', 'recorder']) {
      const result = await core.experiment(sample, selected, role);
      const found = role === 'outsider' ? mask !== 0 : selected.includes('checkpoint') || selected.includes('timestamp');
      assert.equal(result.detected, found);
    }
  });
}

test('A new time-stamp is validly signed but later than the independently known deadline', async () => {
  const result = await core.experiment(sample, ['timestamp'], 'recorder');
  const stamp = result.checks.find(check => check.kind === 'timestamp');
  assert.equal(stamp.oldTokenValid, false);
  assert.equal(stamp.newTokenValid, true);
  assert.equal(stamp.closeTime, 2);
  assert.equal(stamp.newTime, 3);
  assert.equal(stamp.valid, false);
});

test('Comparison is derived from six actual experiment pairs', async () => {
  const rows = await core.comparison(sample, ['hmac', 'signature']);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.slice(0,5).map(row => row.results.map(result => result.detected)), expected.map(row => row[1]));
  assert.deepEqual(rows[5].results.map(result => result.detected), [true,false]);
});
