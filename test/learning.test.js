 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const messages = require('../messages.js');
const app = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');

test('Eleven bilingual lessons each have a title, explanation and a two-column table', () => {
  for (const lang of ['ja','en']) {
    assert.equal(Object.keys(messages[lang]).filter(key => /^lesson\.\d+\.title$/.test(key)).length,11);
    for (let i=1;i<=11;i+=1) {
      assert.ok(messages[lang][`lesson.${i}.body`].length>80);
      for (const row of [0,1]) for (const column of ['a','b']) assert.ok(messages[lang][`lesson.${i}.table.${row}.${column}`]);
    }
  }
});
test('Eight questions each provide three choices and an explanation', () => {
  for (const lang of ['ja','en']) {
    assert.equal(Object.keys(messages[lang]).filter(key => /^quiz\.\d+\.prompt$/.test(key)).length,8);
    for (let i=1;i<=8;i+=1) {
      assert.ok(messages[lang][`quiz.${i}.explanation`].length>30);
      assert.equal(new Set([0,1,2].map(j=>messages[lang][`quiz.${i}.choice.${j}`])).size,3);
    }
  }
  assert.deepEqual(JSON.parse(/const quizAnswers = (\[[^;]+\]);/.exec(app)[1]), [1,2,0,1,2,0,1,2]);
  assert.deepEqual(JSON.parse(/const quizDestinations = (\[[^;]+\]);/.exec(app)[1]), [{step:4},{step:5},{step:6},{step:6},{step:1},{step:3},{lesson:7},{lesson:8}]);
});
test('The supplied excerpts and their Japanese summary remain attributed', () => {
  assert.equal(messages.ja['quote.1'],'altering any part of the data would necessitate changing all subsequent hash values');
  assert.equal(messages.ja['quote.2'],'making it extremely difficult for malicious actors to tamper with the original data without detection.');
  assert.match(messages.ja['quote.summary'],/後ろのハッシュをすべて変える/);
  assert.match(messages.ja['lesson.5.body'],/作り方が公開され/);
  assert.match(messages.ja['lesson.5.body'],/先端の控えもない/);
});
test('The final-row exception, timestamp assumption and Day041 digest length are explained', () => {
  assert.match(messages.ja['lesson.3.body'],/最後の行/);
  assert.match(messages.ja['timeNote'],/別に知っている/);
  assert.match(messages.ja['simulationNote'],/秘密鍵は利用者の手元にありません/);
  assert.match(messages.ja['lesson.10.body'],/16文字/);
  assert.match(messages.ja['lesson.10.body'],/64文字/);
});

test('Every lesson starts with bilingual prerequisites and the requested tool mapping', () => {
  for (const lang of ['ja','en']) for (let i=1;i<=11;i+=1) assert.ok(messages[lang]['lesson.'+i+'.prerequisite'].length>30);
  assert.deepEqual(JSON.parse(/const lessonTools = (\[[^;]+\]);/.exec(app)[1].replace(/'/g,'"')),
    [['118'], ['114','052'], [], [], [], [], ['053'], ['029'], ['031'], ['041'], []]);
  assert.match(messages.ja['lesson.8.distinction'],/Day029.*ワンタイムパッド.*Lamport/);
  for (const term of ['原像計算困難性','第二原像計算困難性','衝突困難性']) {
    assert.ok(Object.values(messages.ja).some(value=>value.startsWith(term+'（')));
  }
  assert.doesNotMatch(Object.values(messages.ja).join('\n'),/今後の候補|連チェーン/);
});

test('Every guided step provides an aim and open prerequisites with complete source sections', () => {
  for (const lang of ['ja','en']) for (let step=1;step<=7;step+=1) {
    for (const field of ['aim','task','action','learned']) assert.ok(messages[lang][`guide.${step}.${field}`]);
  }
  assert.deepEqual(JSON.parse(/const guideSources = (\[[^;]+\]);/.exec(app)[1]), [[0,1],[2],[2],[4,5],[3],[6],[]]);
  const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.doesNotMatch(html, /guide-lesson/);
  assert.match(html, /<section id="guide-prerequisites"/);
  assert.doesNotMatch(/<section id="guide-prerequisites"[^>]*>/.exec(html)[0], /hidden/);
  for (const key of ['guide.7.prerequisite','guide.7.explanation','guide.sample','guide.hashDisplay','guide.avalanche']) assert.ok(messages.ja[key]);
});
test('Step one explanation templates include the calculated seed, first row and trailer', async () => {
  const core = require('../chain-core.js');
  const samples = require('../samples.js');
  const chain = await core.createChain(samples[0]);
  const short = value => value.slice(0,8)+'…';
  const fill = (key,values) => messages.ja[key].replace(/\{(\w+)\}/g,(_,name)=>values[name]);
  const seed = fill('guide.now.seed',{seed:short(chain.seed)});
  assert.ok(seed.includes('7b4b04ae…'));
  const row = fill('guide.now.row',{n:1,record:chain.rows[0].fields.join(','),time:'09:02',room:'Room-A',card:'C-1001',movement:'入室',prior:short(chain.seed),hash:short(chain.rows[0].hash)});
  for (const value of ['7b4b04ae…','e70fd1bc…','09:02,Room-A,C-1001,IN']) assert.ok(row.includes(value));
  const trailer = fill('guide.now.trailer',{count:8,tip:short(core.tip(chain)),trailer:short(chain.trailer.hash)});
  assert.ok(trailer.includes('rows=8') && trailer.includes(short(chain.trailer.hash)));
});

test('The Learn entrance retains exactly four advanced and reference sections', () => {
  const retained = JSON.parse(/const retainedLessons = (\[[^;]+\]);/.exec(app)[1]);
  assert.deepEqual(retained,[7,8,9,10]);
  for (const lang of ['ja','en']) for (const index of retained) {
    assert.ok(messages[lang][`lesson.${index+1}.title`]);
    assert.ok(messages[lang][`lesson.${index+1}.prerequisite`]);
    assert.ok(messages[lang][`lesson.${index+1}.body`]);
  }
  assert.match(app,/Array.from\(\{length:18\}/);
});
test('All eight quiz destinations exist and both destinations expose a return control', () => {
  const destinations = JSON.parse(/const quizDestinations = (\[[^;]+\]);/.exec(app)[1]);
  assert.equal(destinations.length,8);
  for (const [i,destination] of destinations.entries()) {
    if(i<6) assert.ok(messages.ja[`guide.${destination.step}.aim`]);
    else assert.ok([7,8].includes(destination.lesson));
  }
  const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  for (const id of ['back-to-quiz','guide-back-to-quiz']) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /id="guide-mechanism"[^>]*tabindex="-1"/);
  assert.match(html, /id="lesson-content" tabindex="-1"/);
});
