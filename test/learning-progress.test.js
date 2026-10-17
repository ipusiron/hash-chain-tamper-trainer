'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const learning = require('../learning-progress.js');
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}
const empty = {save:true, checked:[], legacySteps:[], error:null};
const stored = storage => JSON.parse(storage.getItem(learning.KEY));
test('First visit is unchecked with saving on and no initial writes', () => {
  const storage = memory();
  assert.deepEqual(learning.create(() => storage).snapshot(), empty);
  assert.equal(storage.data.size, 0);
});
test('All 44 named sections across seven steps are independent and survive reload', () => {
  assert.deepEqual(learning.SECTIONS.map(keys => keys.length), [7,6,6,7,6,6,6]);
  assert.equal(learning.KEYS.length, 44);
  assert.equal(new Set(learning.KEYS).size, 44);
  const storage = memory(), store = learning.create(() => storage);
  for (const key of learning.KEYS) store.setChecked(key, true);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, learning.KEYS);
  assert.deepEqual(stored(storage), {version:2,save:true,checked:learning.KEYS,legacySteps:[]});
});
test('Checking and unchecking one heading does not change its siblings or another step', () => {
  const storage = memory(), store = learning.create(() => storage);
  store.setChecked('s1-aim', true); store.setChecked('s1-lesson-2', true);
  store.setChecked('s2-aim', true); store.setChecked('s1-aim', false);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, ['s1-lesson-2','s2-aim']);
});
test('Saving off removes persisted sections but retains current in-memory checks', () => {
  const storage = memory(), store = learning.create(() => storage);
  store.setChecked('s1-aim', true); store.setSaving(false); store.setChecked('s3-task', true);
  assert.deepEqual(store.snapshot().checked, ['s1-aim','s3-task']);
  assert.deepEqual(stored(storage), {version:2,save:false});
  assert.deepEqual(learning.create(() => storage).snapshot(), {...empty,save:false});
});
test('Re-enabling saving persists the current section checks', () => {
  const storage = memory(), store = learning.create(() => storage);
  store.setSaving(false); store.setChecked('s7-review', true); store.setSaving(true);
  assert.deepEqual(learning.create(() => storage).snapshot().checked, ['s7-review']);
});
test('Reset clears section and previous-step records while preserving preferences and other data', () => {
  for (const save of [true,false]) {
    const storage = memory({'hash-chain-tamper-trainer.lang':'en','another-tool':'keep',
      [learning.KEY]:JSON.stringify({version:1,save:true,checked:[true,false,false,false,false,false,false]})});
    const store = learning.create(() => storage);
    store.setSaving(save); store.setChecked('s1-task', true); store.reset();
    assert.deepEqual(store.snapshot(), {...empty,save});
    assert.deepEqual(learning.create(() => storage).snapshot(), {...empty,save});
    assert.equal(storage.getItem('hash-chain-tamper-trainer.lang'),'en');
    assert.equal(storage.getItem('another-tool'),'keep');
  }
});
test('Old whole-step checks remain a separate record and never check individual headings', () => {
  const raw = JSON.stringify({version:1,save:true,checked:[true,false,true,false,false,false,true]});
  const storage = memory({[learning.KEY]:raw}), store = learning.create(() => storage);
  assert.deepEqual(store.snapshot(), {...empty,legacySteps:[1,3,7]});
  assert.equal(storage.getItem(learning.KEY),raw);
  store.setChecked('s1-task',true);
  assert.deepEqual(learning.create(() => storage).snapshot(), {...empty,checked:['s1-task'],legacySteps:[1,3,7]});
});
test('Old saving-off preference remains off without fabricating checks', () => {
  const storage = memory({[learning.KEY]:JSON.stringify({version:1,save:false})});
  assert.deepEqual(learning.create(() => storage).snapshot(), {...empty,save:false});
});
test('Blocked storage still permits checking and resetting in memory', () => {
  const store = learning.create(() => {throw new Error('SecurityError');});
  assert.equal(store.snapshot().error,'read');
  assert.deepEqual(store.setChecked('s1-aim',true).checked,['s1-aim']);
  assert.equal(store.snapshot().error,'write');
  assert.deepEqual(store.reset().checked,[]);
});
test('Failed writes preserve current checks and allow a later retry', () => {
  const storage = memory(), store = learning.create(() => storage);
  store.setChecked('s2-aim',true);
  const set = storage.setItem;
  storage.setItem = () => {throw new Error('QuotaExceededError');};
  assert.equal(store.reset().error,'write');
  assert.deepEqual(store.snapshot().checked,[]);
  assert.deepEqual(learning.create(() => storage).snapshot().checked,['s2-aim']);
  storage.setItem = set;
  assert.equal(store.reset().error,null);
  assert.deepEqual(learning.create(() => storage).snapshot().checked,[]);
});
test('Malformed, oversized, future, duplicate and unknown saved entries are rejected', () => {
  const valid = {version:2,save:true,checked:[],legacySteps:[]};
  const values = ['{','null','[]','x'.repeat(4097), ...[
    {...valid,version:3},{...valid,save:'true'},{...valid,checked:['unknown']},
    {...valid,checked:['s1-aim','s1-aim']},{...valid,checked:[true]},
    {...valid,legacySteps:[0]},{...valid,legacySteps:[1,1]},{...valid,legacySteps:['1']},
    {...valid,records:[]},{...valid,save:false},{version:1,save:true,checked:[true]},
    {version:1,save:true,checked:['true',false,false,false,false,false,false]}
  ].map(JSON.stringify)];
  for(const raw of values) {
    assert.deepEqual(learning.create(() => memory({[learning.KEY]:raw})).snapshot(), {...empty,error:'invalid'});
  }
});
test('Invalid operations and mutations of snapshots cannot modify checks or their definition', () => {
  const storage = memory(), store = learning.create(() => storage);
  for(const key of [0,1,null,'s8-aim','s1-not-here']) assert.throws(() => store.setChecked(key,true),TypeError);
  assert.throws(() => store.setChecked('s1-aim','true'),TypeError);
  assert.throws(() => store.setSaving('false'),TypeError);
  store.snapshot().checked.push('s1-aim'); store.snapshot().legacySteps.push(1);
  assert.deepEqual(store.snapshot(),empty);
  assert.throws(() => learning.SECTIONS[0].push('bad'),TypeError);
  assert.equal(storage.data.size,0);
});
