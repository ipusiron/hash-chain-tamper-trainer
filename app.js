(function () {
  'use strict';
  const core = window.HashChainCore;
  const samples = window.HashChainSamples;
  const messages = window.HashChainMessages;
  const $ = id => document.getElementById(id);
  const tabs = ['guide', 'free', 'learn'];
  const freeTabs = ['build', 'tamper', 'protect'];
  const lessonTools = [['056','002'], ['114','052'], [], [], [], [], ['053'], ['029'], ['031'], ['041'], []];
  const lessonRows = [4, 4, 4, 4, 4, 4, 5, 3, 4, 4, 4];
  const quizAnswers = [1, 2, 0, 1, 2, 0, 1, 2];
  const quizLessons = [5, 3, 6, 6, 1, 2, 7, 8];
  const lessonReferences = [[16], [], [], [3,4,15], [0], [15], [1,2,5,9,10], [6,7,8], [11,12,13,14], [15], Array.from({length:18}, (_, i) => i)];
  let stored;
  try { stored = localStorage.getItem('hash-chain-tamper-trainer.lang'); } catch (_) { /* Optional storage. */ }
  const query = new URLSearchParams(location.search).get('lang');
  let language = [query, stored, navigator.language.startsWith('ja') ? 'ja' : 'en']
    .find(value => value === 'ja' || value === 'en');
  const state = { base: null, working: null, verified: null, shown: null, completed: 0,
    matrix: null, rechained: null, changed: false, busy: false, error: null,
    selected: [], active: 'guide', answers: {}, lesson: 0, question: 0, returnQuestion: null, returnGuide: null, freeActive: 'build' };

  function t(key, values = {}) {
    const text = messages[language][key];
    if (text === undefined) throw new Error('Missing translation: ' + key);
    return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function option(value, label) {
    const element = node('option', label);
    element.value = value;
    return element;
  }

  function replaceOptions(select, values) {
    const old = select.value;
    select.replaceChildren(...values.map(([value, label]) => option(value, label)));
    if (values.some(([value]) => String(value) === old)) select.value = old;
  }

  function sample() { return samples[Number($('sample-select').value) || 0]; }
  function options() {
    return { includeHeader: $('header-select').value === 'yes', hasTrailer: $('trailer-select').value === 'yes' };
  }

  function setBusy(busy) {
    state.busy = busy;
    document.body.setAttribute('aria-busy', String(busy));
    document.querySelectorAll('button, select, input').forEach(element => {
      if (element.id !== 'lang-toggle' && element.getAttribute('role') !== 'tab') element.disabled = busy;
    });
    if (!busy) {
      $('step-next').disabled = !state.base || state.completed >= state.base.rows.length;
      $('add-row').disabled = !state.base || state.base.rows.length >= 100;
      $('guide-back').disabled = guide.step === 1;
      $('guide-next').disabled = guide.step === 7;
      $('guide-action').disabled = guide.step === 1 && guide.shown === 8;
    }
  }

  async function perform(action) {
    if (state.busy) return;
    setBusy(true);
    state.error = null;
    $('error').textContent = '';
    $('announcement').textContent = t('busy');
    try {
      await action();
      render();
      $('announcement').textContent = t('ready');
    } catch (error) {
      state.error = Object.hasOwn(messages.en, 'error.' + error.message) ? error.message : 'generic';
      $('error').textContent = t('error.' + state.error);
      $('announcement').textContent = '';
    } finally {
      setBusy(false);
    }
  }

  function localize() {
    document.documentElement.lang = language;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
    replaceOptions($('sample-select'), samples.map((item, i) => [i, t(item.labelKey)]));
    replaceOptions($('operation'), core.OPERATIONS.map(operation => [operation, t('op.' + operation)]));
    replaceOptions($('target-column'), sample().columns.map((column, i) => [i, t('col.' + column)]));
    if (state.base) replaceOptions($('target-row'), state.base.rows.map((_, i) => [i, String(i + 1)]));
    sample().columns.forEach((column, i) => {
      const label = document.querySelector('label[for="field-' + i + '"]');
      if (label) label.textContent = t('col.' + column);
    });
    core.PROTECTIONS.forEach(protection => {
      const select = $('protect-' + protection);
      if (select) {
        document.querySelector('label[for="protect-' + protection + '"]').textContent = t('protection.' + protection);

      }
    });
  }

  function hashDetails(hash, input) {
    const details = node('details');
    details.append(node('summary', hash.slice(0, 12) + '\u2026'));
    if (input !== undefined) {
      details.append(node('p', t('input')));
      const code = node('code', undefined, 'hash-input');
      const split = input.indexOf('|');
      if (split >= 0) {
        code.append(node('span', input.slice(0, split), 'previous'), document.createTextNode(input.slice(split)));
      } else code.textContent = input;
      details.append(code);
    }
    details.append(node('p', t('fullHash')), node('code', hash, 'hash'));
    return details;
  }

  function renderChain(container, chain, result, pending = false) {
    container.replaceChildren();
    if (!chain) return;
    const header = node('details');
    header.append(node('summary', t('headers')), node('pre', chain.headers.join('\n')));
    const seedTitle = node('p', t(chain.includeHeader ? 'seed' : 'seedFixed'));
    header.append(seedTitle, hashDetails(chain.seed, chain.includeHeader ? chain.headers.join('\n') : undefined));
    container.append(header);
    const list = node('ol', undefined, 'chain-list');
    chain.rows.forEach((row, i) => {
      const li = node('li');
      const details = node('details', undefined, 'chain-row');
      const summary = node('summary');
      const fields = node('span', undefined, 'row-fields');
      fields.append(node('strong', String(i + 1) + '. '), node('code', row.fields.join(',')));
      const previous = i === 0 ? chain.seed : chain.rows[i - 1].hash;
      const heads = node('span', undefined, 'row-heads');
      heads.append(node('span', t('inputHead')), node('code', previous.slice(0, 8), 'chain-link'),
        node('span', ' → '), node('code', row.hash.slice(0, 12) + '\u2026', 'chain-link'));
      if (result) {
        const valid = result.rows[i].valid;
        details.classList.add(valid ? 'good' : 'bad');
        fields.append(node('span', valid ? ' ✓' : ' ×'));
        summary.setAttribute('aria-label', t('row') + ' ' + (i + 1) + ' / ' + t(valid ? 'pass' : 'fail') + ' / ' + row.fields.join(','));
      }
      summary.append(fields, heads);
      details.append(summary, node('p', t('input')), node('code', core.hashInput(previous, row.fields), 'hash-input'),
        node('p', t('fullHash')), node('code', row.hash, 'hash'));
      li.append(details);
      list.append(li);
    });
    container.append(list);
    if (pending) container.append(node('p', t('trailerPending')));
    else if (chain.trailer) {
      container.append(node('p', t('trailer')),
        hashDetails(chain.trailer.hash, core.trailerInput(core.tip(chain), chain.rows.length)));
    } else container.append(node('p', t('trailerNone')));
  }

  function renderResult(container, result, compact = false) {
    container.replaceChildren();
    if (!result) return;
    const key = result.firstMismatch ? 'status.row' : result.valid ? 'status.ok' :
      result.trailer.present ? 'status.trailer' : 'status.missing';
    container.dataset.valid = String(result.valid);
    container.dataset.first = result.firstMismatch === null ? '' : String(result.firstMismatch);
    container.className = 'result ' + (result.valid ? 'good' : 'bad');
    container.append(node('h3', (result.valid ? '✓ ' : '× ') + t(key, { n: result.firstMismatch || result.rows.length })));
    container.append(node('p', t(!result.trailer.required ? 'trailer.absent' : result.trailer.valid ? 'trailer.ok' : 'trailer.bad')));
    if (!result.valid) {
      const evidence = compact ? node('details') : node('div');
      if (compact) evidence.append(node('summary', t('details')));
      evidence.append(node('p', t('expected')), node('code', result.expected || '-', 'hash'),
        node('p', t('actual')), node('code', result.actual || '-', 'hash'));
      container.append(evidence);
    }
  }

  function renderMatrix(destination = $('matrix'), matrix = state.matrix, trace = true) {
    destination.replaceChildren();
    if (trace) $('experiment-trace').replaceChildren();
    if (!matrix) return;
    const table = node('table');
    const thead = node('thead');
    const heading = node('tr');
    for (const key of ['matrixTitle', 'role.outsider', 'role.recorder']) {
      const th = node('th', t(key));
      th.scope = 'col';
      heading.append(th);
    }
    thead.append(heading);
    const tbody = node('tbody');
    matrix.forEach((row, i) => {
      const tr = node('tr');
      const label = i === 5 ? t('protection.selected') : t('protection.' + (row.protections[0] || 'none'));
      const th = node('th', label);
      th.scope = 'row';
      tr.append(th);
      row.results.forEach(result => {
        const td = node('td', (result.detected ? '✓ ' : '— ') + t(result.detected ? 'detected' : 'undetected'), 'matrix-result');
        td.dataset.detected = String(result.detected);
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    destination.append(table);
    if (!trace) return;
    const result = state.matrix[5].results[Number($('role-select').value)];
    const timeline = node('ol', undefined, 'timeline');
    result.steps.forEach(step => {
      const li = node('li');
      li.append(node('strong', t('step.' + step.number)));
      if (step.number === 1) li.append(node('p', t('oldTip')), node('code', result.oldTip, 'hash'));
      if (step.number === 2) li.append(node('p', state.selected.map(key => t('protection.' + key)).join(' / ') || t('protection.none')));
      if (step.number === 3) {
        li.append(node('p', t(result.mayRechain ? 'canRechain' : 'cannotRechain')),
          node('p', t('newTip')), node('code', result.newTip, 'hash'));
      }
      if (step.number === 4) result.checks.forEach(check => {
        li.append(node('p', t('check.' + check.kind) + ' / ' + t(check.valid ? 'pass' : 'fail')));
        if (check.kind === 'signature') li.append(node('p', t(check.renewed ? 'renewedSignature' : 'oldSignature')));
        if (check.kind === 'timestamp') li.append(node('p', t('timeEvidence', {
          old: t(check.oldTokenValid ? 'pass' : 'fail'), fresh: t(check.newTokenValid ? 'pass' : 'fail')
        })));
      });
      timeline.append(li);
    });
    $('experiment-trace').append(timeline);
  }

  function render() {
    localize();
    if (state.base) {
      $('progress').textContent = t('progress', {done:state.completed, total:state.base.rows.length});
      renderChain($('build-chain'), state.shown, null, state.completed < state.base.rows.length);
      renderChain($('tampered-chain'), state.working, state.verified);
      renderResult($('tamper-result'), state.verified);
      renderResult($('rechain-result'), state.rechained);
      renderMatrix();
    }
    renderLearning();
    renderGuide();
    if (state.error) $('error').textContent = t('error.' + state.error);
  }

  function showTab(name, focus = false) {
    if (name === 'quiz') {
      guide.step = 7;
      guide.quizOpen = true;
      name = 'guide';
      renderGuide();
      setBusy(state.busy);
    }
    if (freeTabs.includes(name)) {
      state.freeActive = name;
      name = 'free';
    }
    state.active = name;
    for (const tab of tabs) {
      $('tab-' + tab).setAttribute('aria-selected', String(tab === name));
      $('tab-' + tab).tabIndex = tab === name ? 0 : -1;
      $('panel-' + tab).hidden = tab !== name;
    }
    for (const tab of freeTabs) {
      $('tab-' + tab).setAttribute('aria-selected', String(tab === state.freeActive));
      $('tab-' + tab).tabIndex = tab === state.freeActive ? 0 : -1;
      $('panel-' + tab).hidden = tab !== state.freeActive;
    }
    if (focus) $('tab-' + name).focus();
  }

  async function rebuild() {
    state.base = await core.createChain(sample(), options());
    state.working = state.base;
    state.shown = state.base;
    state.completed = state.base.rows.length;
    state.verified = await core.verify(state.working);
    state.rechained = null;
    state.changed = false;
    state.matrix = null;
    $('cut-count').max = String(state.base.rows.length);
    $('cut-count').value = '2';
    $('add-fields').replaceChildren();
    sample().columns.forEach((column, i) => {
      const group = node('div');
      const label = node('label', t('col.' + column));
      label.htmlFor = 'field-' + i;
      const input = node('input');
      input.id = 'field-' + i;
      input.value = sample().rows[0][i];
      input.maxLength = 64;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('aria-describedby', 'fields-note');
      group.append(label, input);
      $('add-fields').append(group);
    });
    replaceOptions($('target-row'), state.base.rows.map((_, i) => [i, String(i + 1)]));
    $('target-row').value = '1';
  }

  for (const tab of [...tabs, ...freeTabs]) {
    $('tab-' + tab).addEventListener('click', () => showTab(tab));
    $('tab-' + tab).addEventListener('keydown', event => {
      const group = freeTabs.includes(tab) ? freeTabs : tabs;
      const index = group.indexOf(tab);
      const target = {ArrowRight:group[(index + 1) % group.length], ArrowLeft:group[(index + group.length - 1) % group.length], Home:group[0], End:group[group.length - 1]}[event.key];
      if (target) { event.preventDefault(); showTab(target); $('tab-' + target).focus(); }
    });
  }
  $('lang-toggle').addEventListener('click', () => {
    language = language === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('hash-chain-tamper-trainer.lang', language); } catch (_) { /* Optional storage. */ }
    render();
    $('announcement').textContent = t(state.busy ? 'busy' : 'ready');
  });
  for (const id of ['sample-select', 'header-select', 'trailer-select']) $(id).addEventListener('change', () => perform(rebuild));
  $('step-start').addEventListener('click', () => perform(async () => {
    state.completed = 0;
    state.shown = await core.createChain({headers:state.base.headers, rows:[]}, {...options(), hasTrailer:false});
  }));
  $('step-next').addEventListener('click', () => perform(async () => {
    state.completed += 1;
    state.shown = await core.createChain({headers:state.base.headers, rows:state.base.rows.slice(0, state.completed).map(row => row.fields)},
      {...options(), hasTrailer:options().hasTrailer && state.completed === state.base.rows.length});
  }));
  $('step-all').addEventListener('click', () => perform(async () => {
    state.shown = await core.rechain(state.base);
    state.completed = state.base.rows.length;
  }));
  $('add-row').addEventListener('click', () => perform(async () => {
    state.base = await core.appendRow(state.base, [0,1,2,3].map(i => $('field-' + i).value));
    state.working = state.base;
    state.shown = state.base;
    state.completed = state.base.rows.length;
    state.verified = await core.verify(state.working);
    state.matrix = null;
    state.rechained = null;
    state.changed = false;
    $('cut-count').max = String(state.base.rows.length);
  }));
  $('apply-tamper').addEventListener('click', () => perform(async () => {
    state.working = await core.tamper(state.base, $('operation').value, {
      index:Number($('target-row').value), column:Number($('target-column').value),
      value:$('new-value').value, count:Number($('cut-count').value)
    });
    state.verified = await core.verify(state.working);
    state.changed = true;
    state.rechained = null;
  }));
  $('verify').addEventListener('click', () => perform(async () => { state.verified = await core.verify(state.working); }));
  $('reset-tamper').addEventListener('click', () => perform(async () => {
    state.working = state.base;
    state.verified = await core.verify(state.working);
    state.changed = false;
    state.rechained = null;
  }));
  $('rechain').addEventListener('click', () => perform(async () => {
    const source = state.changed ? state.working : await core.tamper(state.base, 'rewrite');
    state.working = await core.rechain(source);
    state.verified = await core.verify(state.working);
    state.rechained = state.verified;
    state.changed = true;
  }));
  core.PROTECTIONS.forEach(protection => {
    const group = node('div',undefined,'check-option');
    const label = node('label', t('protection.' + protection));
    label.htmlFor = 'protect-' + protection;
    const input = node('input');
    input.type = 'checkbox';
    input.id = label.htmlFor;
    group.append(input, label);
    $('protection-options').append(group);
    input.addEventListener('change', () => {
      state.selected = core.PROTECTIONS.filter(key => $('protect-' + key).checked);
      state.matrix = null;
      renderMatrix();
    });
  });
  $('calculate-matrix').addEventListener('click', () => perform(async () => {
    state.matrix = await core.comparison({headers:state.base.headers, rows:state.base.rows.map(row => row.fields)}, state.selected, options());
  }));
  $('role-select').addEventListener('change', () => renderMatrix());

  function renderLearning() {
    replaceOptions($('lesson-select'), lessonRows.map((_, i) => [i, t('lesson.' + (i + 1) + '.title')]));
    $('lesson-select').value = String(state.lesson);
    $('back-to-quiz').hidden = state.returnQuestion === null;
    $('back-to-guide').hidden = state.returnGuide === null;
    const content = $('lesson-content');
    const prefix = 'lesson.' + (state.lesson + 1);
    const prerequisite = node('aside',undefined,'prerequisite');
    prerequisite.append(node('h4',t('lesson.prerequisite')),node('p',t(prefix + '.prerequisite')));
    if (lessonTools[state.lesson].length) {
      const tools = node('div',undefined,'related-tools');
      tools.setAttribute('aria-label',t('lesson.relatedTools'));
      lessonTools[state.lesson].forEach(day => {
        const link = node('a',t('tool.' + day + '.title'));
        link.href = t('tool.' + day + '.url');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        tools.append(link);
      });
      prerequisite.append(tools);
    }
    content.replaceChildren(node('h3', t(prefix + '.title')),prerequisite);
    const paragraphs = t(prefix + '.body').split('\n');
    content.append(node('p',paragraphs[0]));
    const points = node('ul',undefined,'lesson-points');
    paragraphs.slice(1).forEach(text => points.append(node('li',text)));
    content.append(points);
    if (state.lesson === 7) content.append(node('p',t('lesson.8.distinction'),'privacy'));
    if (state.lesson === 4) {
      for (const key of ['quote.1','quote.2']) {
        const quote = node('blockquote', t(key));
        quote.lang = 'en';
        content.append(quote);
      }
      content.append(node('p', t('quote.summary')));
    }
    const table = node('table');
    const thead = node('thead');
    const tbody = node('tbody');
    for (let i = 0; i < lessonRows[state.lesson]; i += 1) {
      const tr = node('tr');
      for (const column of ['a','b']) {
        const cell = node(i === 0 ? 'th' : 'td', t(prefix + '.table.' + i + '.' + column));
        if (i === 0) cell.scope = 'col';
        tr.append(cell);
      }
      (i === 0 ? thead : tbody).append(tr);
    }
    table.append(thead, tbody);
    content.append(table);
    const links = node('ul');
    lessonReferences[state.lesson].forEach(index => {
      const li = node('li');
      const link = node('a', t('reference.' + index + '.title'));
      link.href = t('reference.' + index + '.url');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.append(link);
      links.append(li);
    });
    content.append(links);
    replaceOptions($('question-select'), quizAnswers.map((_, i) => [i, t('quiz.question', {n:i + 1})]));
    $('question-select').value = String(state.question);
    const questionPrefix = 'quiz.' + (state.question + 1);
    $('quiz-prompt').textContent = t(questionPrefix + '.prompt');
    $('quiz-choices').replaceChildren();
    for (let i = 0; i < 3; i += 1) {
      const button = node('button', t(questionPrefix + '.choice.' + i));
      button.type = 'button';
      button.dataset.choice = String(i);
      button.setAttribute('aria-pressed', String(state.answers[state.question] === i));
      button.addEventListener('click', () => {
        state.answers[state.question] = i;
        renderLearning();
        renderGuide();
        document.querySelector('#quiz-choices [data-choice="' + i + '"]').focus();
      });
      $('quiz-choices').append(button);
    }
    $('quiz-feedback').replaceChildren();
    const answered = Object.hasOwn(state.answers, state.question);
    if (answered) {
      const correct = state.answers[state.question] === quizAnswers[state.question];
      $('quiz-feedback').dataset.correct = String(correct);
      $('quiz-feedback').className = 'result ' + (correct ? 'good' : 'bad');
      $('quiz-feedback').append(node('p', t(correct ? 'quiz.correct' : 'quiz.incorrect')),
        node('p', t(questionPrefix + '.explanation')));
    } else {
      $('quiz-feedback').className = '';
      delete $('quiz-feedback').dataset.correct;
    }
  }

  $('lesson-select').addEventListener('change', () => {
    state.lesson = Number($('lesson-select').value);
    renderLearning();
  });
  for (const [id, increment] of [['lesson-previous', -1], ['lesson-next', 1]]) {
    $(id).addEventListener('click', () => {
      state.lesson = (state.lesson + increment + lessonRows.length) % lessonRows.length;
      renderLearning();
    });
  }
  $('question-select').addEventListener('change', () => {
    state.question = Number($('question-select').value);
    renderLearning();
  });
  $('quiz-related').addEventListener('click', () => {
    state.returnQuestion = state.question;
    state.lesson = quizLessons[state.question];
    renderLearning();
    showTab('learn');
    $('lesson-select').focus();
  });
  $('back-to-quiz').addEventListener('click', () => {
    if (state.returnQuestion !== null) state.question = state.returnQuestion;
    state.returnQuestion = null;
    renderLearning();
    showTab('quiz');
    $('question-select').focus();
  });
  $('quiz-reset').addEventListener('click', () => {
    delete state.answers[state.question];
    renderLearning();
  });
  $('lesson-try').addEventListener('click', () => showTab('protect', true));

  const guide = { step: 1, base: null, partial: null, shown: 0, modified: null, single: null, rebuilt: null,
    results: {}, selected: [], matrix: null, quizOpen: false, prepared: false };
  const guideLessons = [1, 2, 2, 5, 3, 6, 0];

  async function guideBase() {
    if (!guide.base) guide.base = await core.createChain(samples[0]);
    return guide.base;
  }

  async function guideModified() {
    const base = await guideBase();
    if (!guide.modified) {
      guide.modified = await core.tamper(base, 'rewrite', {index:1, column:0, value:'09:06'});
      guide.results[2] = await core.verify(guide.modified);
    }
    return guide.modified;
  }

  async function guideSingle() {
    const modified = await guideModified();
    if (!guide.single) {
      guide.single = await core.tamper(modified, 'rehashOne', {index:1, column:0, value:'09:06'});
      guide.results[3] = await core.verify(guide.single);
    }
    return guide.single;
  }

  async function runGuide() {
    const step = guide.step;
    guide.prepared = (step === 2 && !guide.base) || (step === 3 && !guide.modified) || (step === 4 && !guide.single);
    if (step === 1) {
      guide.shown = Math.min(8, guide.shown + 1);
      guide.partial = await core.createChain({headers:samples[0].headers, rows:samples[0].rows.slice(0,guide.shown)}, {hasTrailer:guide.shown === 8});
      if (guide.shown === 8) guide.base = guide.partial;
      return;
    }
    const base = await guideBase();
    if (step === 2) {
      guide.modified = guide.single = guide.rebuilt = null;
      delete guide.results[3];
      delete guide.results[4];
      await guideModified();
    }
    if (step === 3) await guideSingle();
    if (step === 4) {
      guide.rebuilt = await core.rechain(await guideSingle());
      guide.results[4] = await core.verify(guide.rebuilt);
    }
    if (step === 5) {
      const cut = await core.tamper(base, 'truncate', {count:2});
      guide.results[5] = [await core.verify({...cut, hasTrailer:false, trailer:null}), await core.verify(cut)];
    }
    if (step === 6) guide.matrix = await core.comparison(samples[0], guide.selected);
    if (step === 7) guide.quizOpen = true;
  }

  function chooseGuide(step, focus = false) {
    guide.step = step;
    showTab('guide');
    renderGuide();
    setBusy(state.busy);
    if (focus) $('guide-heading').focus();
  }

  function guideResult(container, result, title) {
    const section = node('div');
    if (title) section.append(node('h3', title));
    const output = node('div');
    renderResult(output, result, true);
    section.append(output);
    container.append(section);
  }

  function renderGuide() {
    const step = guide.step;
    $('guide-heading').textContent = t('guide.' + step + '.title');
    $('guide-task').textContent = t('guide.' + step + '.task');
    $('guide-action').textContent = t('guide.' + step + '.action');
    $('guide-counter').textContent = t('guide.counter', {n:step});
    $('guide-progress').value = step;
    $('guide-progress').setAttribute('aria-label', t('guide.counter', {n:step}));
    for (let i = 1; i <= 7; i += 1) {
      const button = $('guide-step-' + i);
      button.textContent = i + '. ' + t('guide.' + i + '.title');
      if (i === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    $('guide-reset').hidden = step < 2 || step > 4;
    $('guide-options').hidden = step !== 6;
    $('guide-quiz').hidden = step !== 7 || !guide.quizOpen;
    $('panel-quiz').hidden = !guide.quizOpen;
    $('guide-prepared').hidden = !guide.prepared || step < 2 || step > 4;
    const done = step === 1 ? guide.shown > 0 : step === 6 ? !!guide.matrix : step === 7 ? Object.keys(state.answers).length > 0 : !!guide.results[step];
    $('guide-takeaway').hidden = !done;
    $('guide-understood').textContent = t('guide.' + step + '.learned');
    const output = $('guide-result');
    output.replaceChildren();
    if (step === 1 && guide.shown) {
      output.append(node('p', t('progress', {done:guide.shown,total:8})));
      const flow = node('ol', undefined, 'chain-flow');
      [guide.partial.seed, ...guide.partial.rows.slice(0,2).map(row => row.hash)].slice(0,guide.shown + 1).forEach((hash,i) => {
        const li = node('li');
        li.append(node('span', i === 0 ? t('seed') : t('guide.flowRow',{n:i})), node('code',hash.slice(0,8), 'chain-link'));
        if (i > 0) li.append(node('span', t('guide.fromPrevious')), node('code', (i === 1 ? guide.partial.seed : guide.partial.rows[0].hash).slice(0,8), 'chain-link'));
        flow.append(li);
      });
      output.append(flow);
      const rows = node('div');
      renderChain(rows, {...guide.partial, rows:guide.partial.rows.slice(0,guide.shown), trailer:guide.shown === 8 ? guide.partial.trailer : null}, null, guide.shown < 8);
      output.append(rows);
    }
    if ((step === 2 || step === 3) && guide.results[step]) {
      guideResult(output, guide.results[step]);
      if (step === 2) {
        output.append(node('p', t('guide.oneCharacter')));
        const comparison = node('div', undefined, 'hash-comparison');
        const before = guide.base.rows[1].hash;
        const after = guide.results[2].rows[1].expected;
        for (const [label,hash] of [[t('guide.before'),before],[t('guide.after'),after]]) {
          const block = node('div');
          const code = node('code',undefined,'avalanche');
          Array.from(hash).forEach((digit,i) => code.append(node('span',digit,before[i] !== after[i] ? 'changed-digit' : '')));
          block.append(node('p',label), code);
          comparison.append(block);
        }
        output.append(comparison,node('p', t('guide.changedDigits', {n:Array.from(before).filter((digit,i) => digit !== after[i]).length})));
      }
      const rows = node('div');
      renderChain(rows, step === 2 ? guide.modified : guide.single, guide.results[step]);
      output.append(rows);
    }
    if (step === 4 && guide.results[4]) {
      const comparison = node('div', undefined, 'comparison');
      guideResult(comparison, guide.results[3], t('guide.3.title'));
      guideResult(comparison, guide.results[4], t('guide.4.title'));
      output.append(comparison,node('p', t('guide.core'), 'core-message'));
    }
    if (step === 5 && guide.results[5]) {
      const comparison = node('div',undefined,'comparison');
      guideResult(comparison,guide.results[5][0],t('guide.withoutTrailer'));
      guideResult(comparison,guide.results[5][1],t('guide.withTrailer'));
      output.append(comparison);
    }
    if (step === 6 && guide.matrix) {
      const timeline = node('ol',undefined,'stage-flow');
      for (let i = 1; i <= 4; i += 1) timeline.append(node('li',t('step.'+i)));
      output.append(timeline);
      const matrix = node('div');
      matrix.id = 'guide-matrix';
      renderMatrix(matrix,guide.matrix,false);
      output.append(matrix);
      for (const key of ['checkpointNote','hmacNote','timeNote','simulationNote']) output.append(node('p',t(key),key === 'simulationNote' ? 'privacy' : 'muted'));
    }
  }

  for (let i = 1; i <= 7; i += 1) {
    const li = node('li');
    const button = node('button');
    button.id = 'guide-step-' + i;
    button.type = 'button';
    button.addEventListener('click', () => {
      chooseGuide(i, !wideSteps.matches);
      if (!wideSteps.matches) $('guide-picker').open = false;
    });
    button.addEventListener('keydown', event => {
      const target = {ArrowRight:i % 7 + 1, ArrowLeft:(i + 5) % 7 + 1, Home:1, End:7}[event.key];
      if (target) { event.preventDefault(); chooseGuide(target); $('guide-step-' + target).focus(); }
    });
    li.append(button);
    $('guide-steps').append(li);
  }
  for (const protection of core.PROTECTIONS) {
    const label = node('label',undefined,'check-option');
    const input = node('input');
    input.id = 'guide-protect-' + protection;
    input.type = 'checkbox';
    const caption = node('span');
    caption.dataset.i18n = 'protection.' + protection;
    label.append(input,caption);
    $('guide-options').append(label);
    input.addEventListener('change', () => {
      guide.selected = core.PROTECTIONS.filter(key => $('guide-protect-' + key).checked);
      guide.matrix = null;
      renderGuide();
    });
  }
  const wideSteps = window.matchMedia('(min-width: 760px)');
  const stepLayout = () => { $('guide-picker').open = wideSteps.matches; };
  wideSteps.addEventListener('change',stepLayout);
  stepLayout();
  $('guide-action').addEventListener('click', () => perform(runGuide));
  $('guide-next').addEventListener('click', () => chooseGuide(Math.min(7,guide.step + 1),true));
  $('guide-back').addEventListener('click', () => chooseGuide(Math.max(1,guide.step - 1),true));
  $('guide-reset').addEventListener('click', () => {
    guide.modified = guide.single = guide.rebuilt = null;
    guide.results = {};
    guide.prepared = false;
    renderGuide();
  });
  $('guide-lesson').addEventListener('click', () => {
    state.lesson = guideLessons[guide.step - 1];
    state.returnGuide = guide.step;
    renderLearning();
    showTab('learn');
    $('lesson-select').focus();
  });
  $('back-to-guide').addEventListener('click', () => {
    const step = state.returnGuide || guide.step;
    state.returnGuide = null;
    chooseGuide(step,true);
  });
  $('lesson-quiz').addEventListener('click', () => showTab('quiz',true));


  localize();
  showTab('guide');
  if (!window.crypto || !window.crypto.subtle) {
    state.error = 'cryptoUnavailable';
    render();
    setBusy(true);
    document.body.setAttribute('aria-busy', 'false');
  } else perform(rebuild);
}());
