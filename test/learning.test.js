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
  assert.deepEqual(JSON.parse(/const quizLessons = (\[[^;]+\]);/.exec(app)[1]), [5,3,6,6,1,2,7,8]);
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
