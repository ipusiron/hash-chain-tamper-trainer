'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const learning = require('../learning-progress.js');

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}
const empty = Array(7).fill(false);

test('First visit starts unchecked with saving on and does not write data', () => {
  const storage = memory();
  assert.deepEqual(learning.create(() => storage).snapshot(), {save:true, checked:empty, error:null});
  assert.equal(storage.data.size, 0);
});
test('Manual checks for all seven steps survive a fresh page store', () => {
  const storage = memory();
  const store = learning.create(() => storage);
  for (let step = 1; step <= 7; step++) store.setChecked(step, true);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, Array(7).fill(true));
  assert.deepEqual([...storage.data.keys()], [learning.KEY]);
  assert.deepEqual(JSON.parse(storage.getItem(learning.KEY)), {version:1, save:true, checked:Array(7).fill(true)});
});
test('Unchecking one step preserves the other checks on reload', () => {
  const storage = memory();
  const store = learning.create(() => storage);
  store.setChecked(2, true); store.setChecked(5, true); store.setChecked(2, false);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, [false,false,false,false,true,false,false]);
});
test('Saving off removes stored checks, retains current checks and stays off after reload', () => {
  const storage = memory();
  const store = learning.create(() => storage);
  store.setChecked(1, true); store.setSaving(false); store.setChecked(3, true);
  assert.deepEqual(store.snapshot().checked, [true,false,true,false,false,false,false]);
  assert.deepEqual(JSON.parse(storage.getItem(learning.KEY)), {version:1, save:false});
  assert.deepEqual(learning.create(() => storage).snapshot(), {save:false, checked:empty, error:null});
});
test('Re-enabling saving persists the checks currently on screen', () => {
  const storage = memory();
  const store = learning.create(() => storage);
  store.setSaving(false); store.setChecked(7, true); store.setSaving(true);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, [false,false,false,false,false,false,true]);
});
test('Reset clears only understanding checks and preserves saving, language and unrelated site data', () => {
  for (const saving of [true, false]) {
    const storage = memory({'hash-chain-tamper-trainer.lang':'en', 'another-tool':'keep'});
    const store = learning.create(() => storage);
    store.setSaving(saving); store.setChecked(4, true); store.reset();
    assert.deepEqual(store.snapshot(), {save:saving, checked:empty, error:null});
    assert.deepEqual(learning.create(() => storage).snapshot(), store.snapshot());
    assert.equal(storage.getItem('hash-chain-tamper-trainer.lang'), 'en');
    assert.equal(storage.getItem('another-tool'), 'keep');
  }
});
test('Unavailable storage still permits checking, saving changes and reset in memory', () => {
  const store = learning.create(() => { throw new Error('SecurityError'); });
  assert.equal(store.snapshot().error, 'read');
  assert.equal(store.setChecked(1, true).checked[0], true);
  assert.equal(store.snapshot().error, 'write');
  assert.equal(store.setSaving(false).save, false);
  assert.deepEqual(store.reset().checked, empty);
});
test('Failed writes report the failure, preserve current checks and allow a later retry', () => {
  const storage = memory();
  const store = learning.create(() => storage);
  store.setChecked(2, true);
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(store.reset().error, 'write');
  assert.deepEqual(store.snapshot().checked, empty);
  assert.equal(learning.create(() => storage).snapshot().checked[1], true);
  storage.setItem = write;
  assert.equal(store.reset().error, null);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, empty);
});
test('Malformed, oversized, future and wrongly typed persisted data are never restored', () => {
  for (const raw of ['{', 'null', '[]', 'x'.repeat(513), JSON.stringify({version:2,save:true,checked:empty}),
    JSON.stringify({version:1,save:'true',checked:empty}), JSON.stringify({version:1,save:true,checked:[true]}),
    JSON.stringify({version:1,save:true,checked:['true',...empty.slice(1)]}),
    JSON.stringify({version:1,save:false,checked:empty}), JSON.stringify({version:1,save:true,checked:empty,records:[]})]) {
    const store = learning.create(() => memory({[learning.KEY]:raw}));
    assert.deepEqual(store.snapshot(), {save:true, checked:empty, error:'invalid'});
  }
});
test('Invalid operations and mutated snapshots cannot change the stored checks', () => {
  const storage = memory();
  const store = learning.create(() => storage);
  for (const step of [0, 8, 1.5, '1']) assert.throws(() => store.setChecked(step, true), TypeError);
  assert.throws(() => store.setChecked(1, 'true'), TypeError);
  assert.throws(() => store.setSaving('false'), TypeError);
  store.snapshot().checked.fill(true);
  assert.deepEqual(store.snapshot().checked, empty);
  assert.equal(storage.data.size, 0);
});
