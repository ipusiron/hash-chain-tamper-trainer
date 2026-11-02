'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const messages = require('../messages.js');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
const app = read('app.js');
const css = read('style.css');

function extract(name) {
  const start = app.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name);
  const end = app.indexOf('\n  }\n', start);
  return app.slice(start, end + 4);
}
const helpers = vm.runInNewContext(['setText', 'replaceIfChanged', 'stepNextBlocked'].map(extract).join('\n') +
  '\n({setText, replaceIfChanged, stepNextBlocked});');

function fakeElement(text = '') {
  const element = { writes: 0, childNodes: [], _text: text };
  Object.defineProperty(element, 'textContent', {
    get() { return element._text; },
    set(value) { element.writes += 1; element._text = value; }
  });
  element.replaceChildren = (...children) => { element.writes += 1; element.childNodes = children; };
  return element;
}
const fakeNode = key => ({ key, isEqualNode: other => Boolean(other) && other.key === key });

test('setText writes a live region only when the text changes', () => {
  const element = fakeElement('ready');
  assert.equal(helpers.setText(element, 'ready'), false);
  assert.equal(element.writes, 0);
  assert.equal(helpers.setText(element, 'done'), true);
  assert.equal(helpers.setText(element, 'done'), false);
  assert.equal(element.writes, 1);
  assert.equal(element.textContent, 'done');
});

test('replaceIfChanged keeps equal children and replaces different ones once', () => {
  const element = fakeElement();
  assert.equal(helpers.replaceIfChanged(element, []), false);
  assert.equal(helpers.replaceIfChanged(element, [fakeNode('a'), fakeNode('b')]), true);
  assert.equal(helpers.replaceIfChanged(element, [fakeNode('a'), fakeNode('b')]), false);
  assert.equal(helpers.replaceIfChanged(element, [fakeNode('a')]), true);
  assert.equal(helpers.replaceIfChanged(element, [fakeNode('c')]), true);
  assert.equal(helpers.replaceIfChanged(element, []), true);
  assert.equal(element.writes, 4);
});

test('Step-by-step computing is blocked before start and after the last record', () => {
  const chain = { rows: [1, 2, 3] };
  assert.equal(helpers.stepNextBlocked(null, 0), true);
  assert.equal(helpers.stepNextBlocked(chain, 3), true);
  assert.equal(helpers.stepNextBlocked(chain, 0), false);
  assert.equal(helpers.stepNextBlocked(chain, 2), false);
});

test('The disabled next-record button has a bilingual note that names the start button', () => {
  assert.match(html, /<p id="step-next-note" class="muted disabled-note" hidden><\/p>/);
  assert.match(app, /setAttribute\('aria-describedby', 'step-next-note'\)/);
  assert.match(app, /\$\('step-next'\)\.removeAttribute\('aria-describedby'\)/);
  for (const language of ['ja', 'en']) {
    assert.match(messages[language].stepNextNote, /\{next\}/);
    assert.match(messages[language].stepNextNote, /\{start\}/);
  }
});

test('Navigation buttons name their destination, use the nav style and focus a heading', () => {
  for (const id of ['lesson-try', 'lesson-quiz', 'quiz-related', 'back-to-quiz', 'guide-back-to-quiz', 'guide-build-next', 'position-next', 'guide-back', 'guide-next']) {
    assert.match(html, new RegExp('<button id="' + id + '" class="nav-button"'), id);
  }
  assert.equal(messages.ja['lesson.try'], '作り直しと守りで試す →');
  assert.equal(messages.ja['tab.protect'], '作り直しと守り');
  for (const language of ['ja', 'en']) {
    for (const key of ['lesson.try', 'guide.openQuiz', 'quiz.related.step', 'quiz.related.lesson', 'guide.build.nextStep', 'position.nextStep', 'guide.next']) {
      assert.match(messages[language][key], / →$/, language + ' ' + key);
    }
    for (const key of ['quiz.back', 'guide.back']) assert.match(messages[language][key], /^← /, language + ' ' + key);
  }
  assert.match(html, /<h2 id="protect-heading" tabindex="-1"/);
  assert.match(html, /<h2 id="quiz-heading" tabindex="-1"/);
  assert.match(app, /showTab\('protect'\);\n    \$\('protect-heading'\)\.focus\(\);/);
  assert.match(app, /showTab\('quiz'\);\n    \$\('quiz-heading'\)\.focus\(\);/);
  assert.match(css, /\.nav-button \{[^}]*text-decoration: underline/);
});

test('Dark theme places the white illustration on a paper-colored mat', () => {
  const dark = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  assert.match(dark, /--illustration-bg: #e9e4d8;/);
  assert.doesNotMatch(css, /invert\(/);
});
