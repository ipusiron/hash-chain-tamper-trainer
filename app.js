(function () {
  'use strict';
  const core = window.HashChainCore;
  const samples = window.HashChainSamples;
  const messages = window.HashChainMessages;
  const $ = id => document.getElementById(id);
  const tabs = ['guide', 'free', 'learn', 'settings'];
  const position = { stage: 2, hasTrailer: true, cases: [] };
  const learningModel = window.HashChainLearning;
  const learning = learningModel.create();
  let learningNotice = '';
  const expanded = new Set();
  const matrixSelection = { free: null, guide: null };
  const freeTabs = ['build', 'tamper', 'protect'];
  const lessonTools = [['056','002'], ['114','052'], [], [], [], [], ['053'], ['029'], ['031'], ['041'], []];
  const lessonRows = [4, 4, 5, 4, 4, 4, 5, 3, 4, 4, 4];
  const quizAnswers = [1, 2, 0, 1, 2, 0, 1, 2];
  const retainedLessons = [7, 8, 9, 10];
  const quizDestinations = [{"step":4}, {"step":5}, {"step":6}, {"step":6}, {"step":1}, {"step":3}, {"lesson":7}, {"lesson":8}];
  const lessonReferences = [[16], [], [], [3,4,15], [0], [15], [1,2,5,9,10], [6,7,8], [11,12,13,14], [15], Array.from({length:18}, (_, i) => i)];
  let stored;
  try { stored = localStorage.getItem('hash-chain-tamper-trainer.lang'); } catch (_) { /* Optional storage. */ }
  const query = new URLSearchParams(location.search).get('lang');
  let language = [query, stored, navigator.language.startsWith('ja') ? 'ja' : 'en']
    .find(value => value === 'ja' || value === 'en');
  const state = { base: null, working: null, verified: null, shown: null, completed: 0,
    matrix: null, rechained: null, changed: false, busy: false, error: null,
    selected: [], active: 'guide', answers: {}, lesson: 7, question: 0, returnQuestion: null, freeActive: 'build' };

  function t(key, values = {}) {
    const text = messages[language][key];
    if (text === undefined) throw new Error('Missing translation: ' + key);
    return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    if (tag === 'p' && text && text.includes('\n')) element.classList.add('multiline');
    return element;
  }


  function disclosure(id, label, ...children) {
    const details = node('details', undefined, 'learning-details');
    details.id = id;
    details.open = expanded.has(id);
    details.append(node('summary', t(label)), ...children);
    details.addEventListener('toggle', () => {
      if (details.isConnected) {
        if (details.open) expanded.add(id); else expanded.delete(id);
      }
    });
    return details;
  }

  function resultMeaning(result) {
    const box = node('aside', undefined, 'result-meaning');
    box.append(node('strong', t('clarity.meaningTitle')),
      node('p', t(result.valid ? 'clarity.meaningPass' : 'clarity.meaningFail')),
      node('p', t('clarity.meaningLimit')));
    return box;
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
      $('guide-action').disabled = guide.step === 1 && guide.shown === samples[0].rows.length;
      $('guide-build-reset').disabled = guide.shown === 0;
    }
    renderUnderstanding();
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
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
      if (el.tagName === 'P') el.classList.toggle('multiline', el.textContent.includes('\n'));
    });
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
        document.querySelector('label[for="protect-' + protection + '"] span').textContent = t('protection.' + protection);

      }
    });
  }

  function hashDetails(hash, input, digits = 12) {
    const details = node('details');
    details.append(node('summary', hash.slice(0, digits) + '\u2026'));
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

  function renderChain(container, chain, result, pending = false, digits = 12) {
    container.replaceChildren();
    if (!chain) return;
    const header = node('details');
    header.append(node('summary', t('headers')), node('pre', chain.headers.join('\n')));
    const seedTitle = node('p', t(chain.includeHeader ? 'seed' : 'seedFixed'));
    header.append(seedTitle, hashDetails(chain.seed, chain.includeHeader ? chain.headers.join('\n') : undefined, digits));
    container.append(header);
    if (result) container.append(node('p', t('clarity.verificationNote')));
    const list = node('ol', undefined, 'chain-list');
    chain.rows.forEach((row, i) => {
      const li = node('li');
      const details = node('details', undefined, 'chain-row');
      const summary = node('summary');
      const fields = node('span', undefined, 'row-fields');
      fields.append(node('strong', t('visual.row', {n:i + 1}) + ': '), node('code', row.fields.join(',')));
      const verification = result && result.rows[i];
      const input = verification ? verification.input : core.hashInput(i === 0 ? chain.seed : chain.rows[i - 1].hash, row.fields);
      const previous = input.split('|')[0];
      const heads = node('span', undefined, 'row-heads');
      heads.append(node('span', t('inputHead')), node('code', previous.slice(0, 8) + (digits === 8 ? '\u2026' : ''), 'chain-link'),
        node('span', ' → '), node('span', t('actual')), node('code', row.hash.slice(0, digits) + '\u2026', 'chain-link'));
      if (result) {
        const valid = result.rows[i].valid;
        details.classList.add(valid ? 'good' : 'bad');
        fields.append(node('span', valid ? ' ✓' : ' ×'));
        summary.setAttribute('aria-label', t('row') + ' ' + (i + 1) + ' / ' + t(valid ? 'pass' : 'fail') + ' / ' + row.fields.join(','));
      }
      summary.append(fields, heads);
      details.append(summary, node('p', t(verification ? 'clarity.verificationInput' : 'input')), node('code', input, 'hash-input'));
      if (verification) details.append(node('p', t('expected')), node('code', verification.expected, 'hash verification-hash'));
      details.append(node('p', t('fullHash')), node('code', row.hash, 'hash stored-hash'));
      li.append(details);
      list.append(li);
    });
    container.append(list);
    if (pending) container.append(node('p', t('trailerPending')));
    else if (chain.trailer) {
      container.append(node('p', t('trailer')),
        hashDetails(chain.trailer.hash, result ? undefined : core.trailerInput(core.tip(chain), chain.rows.length), digits));
      if (result && result.trailer.required) {
        const previous = result.rows.length ? result.rows[result.rows.length - 1].expected : chain.seed;
        container.append(node('p', t('clarity.verificationInput')), node('code', core.trailerInput(previous, chain.rows.length), 'hash-input'),
          node('p', t('expected')), node('code', result.trailer.expected, 'hash'));
      }
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
    const context = trace ? 'free' : 'guide';
    const evidence = node('section', undefined, 'matrix-evidence');
    evidence.tabIndex = -1;
    evidence.setAttribute('aria-live', 'polite');
    const reveal = (i, role, focus = false) => {
      matrixSelection[context] = [i, role];
      const row = matrix[i];
      const label = i === 5 ? t('protection.selected') : t('protection.' + (row.protections[0] || 'none'));
      evidence.replaceChildren(protectionEvidence(row.results[role], label));
      if (focus) evidence.focus();
    };
    matrix.forEach((row, i) => {
      const tr = node('tr');
      const label = i === 5 ? t('protection.selected') : t('protection.' + (row.protections[0] || 'none'));
      const th = node('th', label);
      th.scope = 'row';
      tr.append(th);
      row.results.forEach((result, role) => {
        const td = node('td', undefined, 'matrix-result');
        td.dataset.detected = String(result.detected);
        const button = node('button', (result.detected ? '✓ ' : '— ') + t(result.detected ? 'detected' : 'undetected'));
        button.type = 'button';
        button.dataset.matrixRow = String(i);
        button.dataset.role = String(role);
        button.setAttribute('aria-label', label + ' / ' + t('role.' + result.role) + ' / ' + t(result.detected ? 'detected' : 'undetected') + ' / ' + t('clarity.evidence'));
        button.addEventListener('click', () => reveal(i, role, true));
        td.append(button);
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    destination.append(node('p', t('clarity.matrixNote')), table, evidence);
    if (matrixSelection[context]) reveal(...matrixSelection[context]);
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


  function protectionEvidence(result, label) {
    const box = node('div');
    box.append(node('h3', t('clarity.evidenceTitle', {protection:label, role:t('role.' + result.role), result:t(result.detected ? 'detected' : 'undetected')})),
      node('p', t('clarity.holds.' + result.role)));
    const pair = node('div', undefined, 'visual-grid');
    pair.append(visualCard(t('oldTip'), visualHash(result.oldTip)), visualCard(t('newTip'), visualHash(result.newTip)));
    box.append(pair);
    for (const check of result.checks) {
      const item = node('section', undefined, 'evidence-check');
      item.dataset.check = check.kind;
      item.dataset.valid = String(check.valid);
      item.append(node('h4', t('check.' + check.kind) + ' / ' + t(check.valid ? 'pass' : 'fail')));
      if (check.kind === 'timestamp') item.append(node('p', t(check.oldTokenValid ? 'clarity.reason.timestamp.original' : 'clarity.reason.timestamp', {
        old:t(check.oldTokenValid ? 'pass' : 'fail'), fresh:t(check.newTokenValid ? 'pass' : 'fail'), deadline:check.closeTime, time:check.newTime
      })));
      else if (check.kind === 'signature') item.append(node('p', t('clarity.reason.signature.' + (check.renewed ? 'renewed' : check.valid ? 'retained' : 'old'))));
      else item.append(node('p', t('clarity.reason.' + check.kind + '.' + (check.valid ? 'pass' : 'fail'))));
      box.append(item);
    }
    box.append(node('p', t('clarity.evidenceLimit'), 'visual-conclusion'));
    return box;
  }

  function render() {
    localize();
    if (state.base) {
      $('progress').textContent = t('progress', {done:state.completed, total:state.base.rows.length});
      renderChain($('build-chain'), state.shown, null, state.completed < state.base.rows.length);
      renderChain($('tampered-chain'), state.working, state.verified);
      renderResult($('tamper-result'), state.verified);
      $('free-comparison').replaceChildren();
      if (state.verified) $('free-comparison').append(resultMeaning(state.verified), visualChainComparison(state.verified, 'free'));
      renderResult($('rechain-result'), state.rechained);
      renderMatrix();
    }
    renderLearning();
    renderGuide();
    if (state.error) $('error').textContent = t('error.' + state.error);
  }

  function showTab(name, focus = false) {
    if (name !== 'settings') $('learning-reset-confirm').hidden = true;
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
    const group = node('label',undefined,'check-option');
    const label = node('span', t('protection.' + protection));
    group.htmlFor = 'protect-' + protection;
    const input = node('input');
    input.type = 'checkbox';
    input.id = group.htmlFor;
    group.append(input, label);
    $('protection-options').append(group);
    input.addEventListener('change', () => {
      state.selected = core.PROTECTIONS.filter(key => $('protect-' + key).checked);
      state.matrix = null;
      matrixSelection.free = null;
      renderMatrix();
    });
  });
  $('calculate-matrix').addEventListener('click', () => perform(async () => {
    state.matrix = await core.comparison({headers:state.base.headers, rows:state.base.rows.map(row => row.fields)}, state.selected, options());
  }));
  $('role-select').addEventListener('change', () => renderMatrix());

  function relatedTools(lesson) {
    const tools = node('div', undefined, 'related-tools');
    tools.setAttribute('aria-label', t('lesson.relatedTools'));
    if (lesson === 7) tools.append(node('p', t('lesson.8.distinction'), 'tool-context'));
    for (const day of lessonTools[lesson]) {
      const link = node('a', undefined, 'tool-link');
      link.href = t('tool.' + day + '.url');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.append(node('strong', t('tool.' + day + '.title')),
        node('span', t('tool.open'), 'tool-link-action'));
      const icon = node('span', '↗', 'tool-link-icon');
      icon.setAttribute('aria-hidden', 'true');
      link.append(icon);
      tools.append(link);
    }
    return tools;
  }

  function lessonPrerequisite(lesson) {
    const prefix = 'lesson.' + (lesson + 1);
    const prerequisite = node('aside',undefined,'prerequisite');
    prerequisite.append(node('h4',t('lesson.prerequisite')));
    for (const paragraph of t(prefix + '.prerequisite').split('\n')) {
      prerequisite.append(node('p',paragraph));
    }
    if (lessonTools[lesson].length) {
      prerequisite.append(relatedTools(lesson));
    }
    return prerequisite;
  }

  function positionGuideLink() {
    const compare = node('button', t('position.open'));
    compare.type = 'button';
    compare.addEventListener('click', () => {
      chooseGuide(3, true);
      if (guide.results[3]) $('guide-position-heading').focus();
      else $('guide-action').focus();
    });
    return compare;
  }

  async function preparePosition() {
    const base = await core.createChain(samples[0]);
    const cases = [];
    for (const [index, value] of [[1, '09:06'], [7, '09:51']]) {
      const stages = [base];
      stages.push(await core.tamper(base, 'rewrite', {index, column: 0, value}));
      stages.push(await core.tamper(base, 'rehashOne', {index, column: 0, value}));
      const results = [];
      for (const chain of stages) results.push({
        withTrailer: await core.verify(chain),
        withoutTrailer: await core.verify({...chain, hasTrailer: false, trailer: null})
      });
      cases.push({index, base, stages, results});
    }
    position.cases = cases;
  }

  function positionPair(leftLabel, leftHash, rightLabel, rightHash, valid, outputFirst = false) {
    const pair = node('div', undefined, 'position-pair');
    const values = [['stored', leftLabel, leftHash], ['recomputed', rightLabel, rightHash]];
    if (outputFirst) values.reverse();
    for (const [key, label, hash] of values) {
      const cell = node('div', undefined, 'position-value');
      const code = node('code', shortHash(hash));
      code.title = hash;
      code.dataset.hash = hash;
      cell.dataset.side = key;
      cell.append(node('span', label), code);
      pair.append(cell);
    }
    const verdict = node('strong', t('visual.status.' + (valid ? 'pass' : 'fail')), 'position-verdict ' + (valid ? 'good' : 'bad'));
    verdict.dataset.valid = String(valid);
    pair.append(verdict);
    return pair;
  }

  function positionInput(input, rowNumber) {
    const box = node('div', undefined, 'diagram-input');
    box.dataset.input = input;
    box.append(node('strong', t('diagram.input')));
    const prefix = node('p', undefined, 'position-prefix');
    const hash = node('code', shortHash(input.slice(0, 64)));
    hash.title = input.slice(0, 64);
    hash.dataset.hash = input.slice(0, 64);
    prefix.append(node('span', t(rowNumber ? 'diagram.previous' : 'diagram.last')), hash);
    const record = node('div', undefined, 'diagram-record');
    record.append(node('span', t(rowNumber ? 'diagram.record' : 'diagram.count', {n:rowNumber})),
      node('code', input.slice(65), rowNumber ? 'position-fields' : 'diagram-count'));
    box.append(prefix, node('code', '|', 'diagram-separator'), record);
    return box;
  }

  function positionCalculation(card, input, stored, computed, valid, trailer = false) {
    const bytes = new TextEncoder().encode(input);
    card.dataset.input = input;
    card.dataset.bytes = String(bytes.length);
    card.append(positionArrow(t('diagram.utf8', {n:bytes.length})),
      node('div', 'SHA-256', 'diagram-function'), positionArrow(t('diagram.outputArrow')),
      positionPair(t(trailer ? 'position.originalTrailer' : 'diagram.stored'), stored,
        t(trailer ? 'diagram.trailerOutput' : 'diagram.output'), computed, valid, true));
    const exact = node('details', undefined, 'diagram-exact');
    exact.append(node('summary', t('diagram.exact')), node('code', input, 'hash-input'), utf8InputExample(input, true, trailer ? 'trailer' : 'record'));
    card.append(exact);
  }

  function positionRecord(row, fields, target) {
    const card = node('div', undefined, 'position-record' + (target ? ' position-target' : ''));
    card.dataset.record = String(row.number);
    card.append(node('h6', t(target ? 'position.target' : 'position.next', {n:row.number})),
      positionInput(row.input, row.number));
    positionCalculation(card, row.input, row.actual, row.expected, row.valid);
    const note = position.stage === 0 ? 'diagram.note.original' : target
      ? 'diagram.note.target.' + position.stage : 'diagram.note.next';
    card.append(node('p', t(note), 'diagram-callout'));
    return card;
  }

  function positionArrow(text) {
    const connector = node('div', undefined, 'position-connector');
    const ns = 'http://www.w3.org/2000/svg';
    const arrow = document.createElementNS(ns, 'svg');
    arrow.setAttribute('class', 'position-arrow');
    arrow.setAttribute('viewBox', '0 0 24 48');
    arrow.setAttribute('width', '24');
    arrow.setAttribute('height', '48');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.setAttribute('focusable', 'false');
    const line = document.createElementNS(ns, 'line');
    for (const [key, value] of Object.entries({x1:12, y1:2, x2:12, y2:30, stroke:'currentColor', 'stroke-width':3})) line.setAttribute(key, value);
    const tip = document.createElementNS(ns, 'polygon');
    tip.setAttribute('points', '4,30 20,30 12,44');
    tip.setAttribute('fill', 'currentColor');
    arrow.append(line, tip);
    connector.append(arrow, node('span', text));
    return connector;
  }

  function renderPosition() {
    $('guide-position').hidden = guide.step !== 3 || !guide.results[3];
    for (let i = 0; i < 3; i += 1) $('position-stage-' + i).setAttribute('aria-pressed', String(i === position.stage));
    $('position-trailer').checked = position.hasTrailer;
    $('position-status').textContent = t('position.state.' + position.stage);
    $('position-conclusion').textContent = t('position.conclusion.' + position.stage + (position.hasTrailer ? '.with' : '.without'));
    const container = $('position-cases');
    container.replaceChildren();
    for (const item of position.cases) {
      const {index, base} = item;
      const chain = item.stages[position.stage];
      const result = item.results[position.stage][position.hasTrailer ? 'withTrailer' : 'withoutTrailer'];
      const all = item.results[position.stage].withTrailer;
      const last = index === base.rows.length - 1;
      const block = node('section', undefined, 'position-case');
      block.dataset.case = last ? 'last' : 'middle';
      block.append(node('h5', t(last ? 'position.last' : 'position.middle')),
        node('p', t('position.time', {before:base.rows[index].fields[0], after:chain.rows[index].fields[0]}), 'position-time'));
      const figure = visualFigure('position.internal');
      figure.classList.add('position-flow');
      figure.append(node('p', t(last ? 'position.unchangedLast' : 'position.unchangedMiddle'), 'position-unchanged'),
        positionRecord(result.rows[index], chain.rows[index].fields, true));
      if (!last) {
        figure.append(positionArrow(t('position.forward')), positionRecord(result.rows[index + 1], chain.rows[index + 1].fields, false),
          node('p', t('position.remaining', {count:result.rows.slice(index + 2).filter(row => !row.valid).length}), 'position-remaining'));
      } else figure.append(node('p', t('position.noNext'), 'position-no-next'));
      figure.append(positionArrow(t(last ? 'position.toTrailer' : 'position.afterRemaining')));
      const trailer = node('div', undefined, 'position-trailer');
      trailer.append(node('h6', t('position.trailer')));
      if (position.hasTrailer) {
        const input = core.trailerInput(all.rows[7].expected, all.rows.length);
        trailer.append(positionInput(input, 0));
        positionCalculation(trailer, input, all.trailer.actual, all.trailer.expected, all.trailer.valid, true);
        trailer.append(node('p', t(position.stage === 0 ? 'diagram.note.original' : 'diagram.note.trailer'), 'diagram-callout'));
      } else trailer.append(node('p', t('position.noTrailer')));
      const overall = node('p', t(result.valid ? 'position.pass' : 'position.fail'), 'position-overall ' + (result.valid ? 'good' : 'bad'));
      overall.dataset.valid = String(result.valid);
      figure.append(trailer, overall);
      const snapshot = node('section', undefined, 'position-snapshot');
      snapshot.append(node('h6', t('position.snapshot')),
        node('p', t(position.stage === 0 ? 'position.recordSame' : 'position.recordDifferent', {n:index + 1})),
        positionPair(t('position.originalHash'), base.rows[index].hash, t('position.currentHash'), chain.rows[index].hash,
          base.rows[index].hash === chain.rows[index].hash),
        node('p', t('position.snapshotNote.' + position.stage)));
      const details = disclosure('position-detail-' + index, 'position.details', visualChainComparison(result, 'free'));
      const trailerDetails = node('div', undefined, 'position-trailer-detail');
      trailerDetails.append(node('p', t('position.originalTrailerInput')),
        node('code', core.trailerInput(base.rows[7].hash, 8), 'hash-input'),
        node('p', t('position.currentTrailerInput')),
        node('code', core.trailerInput(all.rows[7].expected, 8), 'hash-input'),
        visualCard(t('position.originalTrailer'), visualHash(all.trailer.actual)),
        visualCard(t('position.recomputedTrailer'), visualHash(all.trailer.expected)),
        node('p', t(position.hasTrailer ? 'position.trailerUsed' : 'position.trailerNotUsed')));
      details.append(visualCard(t('position.originalHash'), visualHash(base.rows[index].hash)), trailerDetails);
      block.append(figure, snapshot, details);
      container.append(block);
    }
  }

  for (let i = 0; i < 3; i += 1) $('position-stage-' + i).addEventListener('click', () => {
    position.stage = i;
    renderPosition();
  });
  $('position-trailer').addEventListener('change', event => {
    position.hasTrailer = event.target.checked;
    renderPosition();
  });
  $('position-next').addEventListener('click', () => chooseGuide(4, true));
  $('position-reset').addEventListener('click', () => {
    position.stage = 2;
    position.hasTrailer = true;
    renderPosition();
  });

  function lessonBody(lesson, content) {
    const prefix = 'lesson.' + (lesson + 1);
    const paragraphs = t(prefix + '.body').split('\n');
    content.append(node('p',paragraphs[0]));
    const points = node('ul',undefined,'lesson-points');
    paragraphs.slice(1).forEach(text => points.append(node('li',text)));
    content.append(points);
    if (retainedLessons.includes(lesson)) content.append(lessonExample(lesson));
    if (lesson === 7) content.append(node('p',t('lesson.8.distinction'),'privacy'));
    if (lesson === 4) {
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
    for (let i = 0; i < lessonRows[lesson]; i += 1) {
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
    if (lesson === 2) content.append(positionGuideLink());
    const links = node('ul');
    lessonReferences[lesson].forEach(index => {
      const li = node('li');
      const link = node('a', t('reference.' + index + '.title'));
      link.href = t('reference.' + index + '.url');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.append(link);
      links.append(li);
    });
    content.append(links);
    if (lessonTools[lesson].length) content.append(relatedTools(lesson));
  }

  function renderLearning() {
    replaceOptions($('lesson-select'), retainedLessons.map(i => [i, t('lesson.' + (i + 1) + '.title').replace(/^\d+\. /,'')]));
    $('lesson-select').value = String(state.lesson);
    $('back-to-quiz').hidden = state.returnQuestion === null;
    const content = $('lesson-content');
    const prefix = 'lesson.' + (state.lesson + 1);
    content.replaceChildren(node('h3', t(prefix + '.title').replace(/^\d+\. /,'')),$('back-to-quiz'),lessonPrerequisite(state.lesson));
    lessonBody(state.lesson, content);
    replaceOptions($('question-select'), quizAnswers.map((_, i) => [i, t('quiz.question', {n:i + 1}) + ' / ' + t(i < 6 ? 'clarity.quiz.core' : 'clarity.quiz.advanced')]));
    $('question-select').value = String(state.question);
    $('quiz-level').textContent = t(state.question < 6 ? 'clarity.quiz.core' : 'clarity.quiz.advanced');
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
      state.lesson = retainedLessons[(retainedLessons.indexOf(state.lesson) + increment + retainedLessons.length) % retainedLessons.length];
      renderLearning();
    });
  }
  $('question-select').addEventListener('change', () => {
    state.question = Number($('question-select').value);
    renderLearning();
  });
  $('quiz-related').addEventListener('click', () => {
    state.returnQuestion = state.question;
    const destination = quizDestinations[state.question];
    if (destination.step) {
      chooseGuide(destination.step);
      $('guide-mechanism').focus({preventScroll:true});
      $('guide-mechanism').scrollIntoView({block:'start'});
    } else {
      state.lesson = destination.lesson;
      renderLearning();
      showTab('learn');
      $('lesson-content').focus({preventScroll:true});
      $('lesson-content').scrollIntoView({block:'start'});
    }
  });
  function returnToQuiz() {
    if (state.returnQuestion !== null) state.question = state.returnQuestion;
    state.returnQuestion = null;
    renderLearning();
    showTab('quiz');
    $('question-select').focus();
  }
  $('back-to-quiz').addEventListener('click', returnToQuiz);
  $('guide-back-to-quiz').addEventListener('click', returnToQuiz);
  $('quiz-reset').addEventListener('click', () => {
    delete state.answers[state.question];
    renderLearning();
    renderGuide();
  });
  $('lesson-try').addEventListener('click', () => showTab('protect', true));

  const guide = { step: 1, base: null, partial: null, firstHash: null, shown: 0, modified: null, single: null, rebuilt: null,
    results: {}, selected: [], matrix: null, quizOpen: false, prepared: false, cut: null, trailerRebuilt: null, predictions: {} };
  const guideSources = [[0, 1], [2], [2], [4, 5], [3], [6], []];
  const guidePrerequisites = [[0, 1], [0, 2], [2], [4, 5], [3], [6], []];

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
    if (step === 3) {
      await guideSingle();
      position.stage = 2;
      position.hasTrailer = true;
    }
    if (step === 4) {
      guide.rebuilt = await core.rechain(await guideSingle());
      guide.results[4] = await core.verify(guide.rebuilt);
    }
    if (step === 5) {
      const cut = await core.tamper(base, 'truncate', {count:2});
      guide.cut = cut;
      guide.trailerRebuilt = null;
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

  function shortHash(hash) { return hash.slice(0, 8) + '\u2026'; }

  function observation(key, values = {}) { return {key, values}; }

  function appendObservationProse(container, text) {
    text.split(/(SHA-256)/g).forEach(part => container.append(part === 'SHA-256'
      ? node('span', part, 'observation-token') : document.createTextNode(part)));
  }

  function observationParagraph(template, values) {
    const paragraph = node('p');
    const results = ['first', 'result', 'without', 'with', 'outsider', 'recorder'];
    let cursor = 0;
    for (const match of template.matchAll(/\{(\w+)\}/g)) {
      appendObservationProse(paragraph, template.slice(cursor, match.index));
      const name = match[1];
      const value = String(values[name]);
      if (/^[a-f0-9]{8}\u2026$/.test(value)) {
        const emphasis = node('strong');
        emphasis.append(node('code', value, 'observation-hash'));
        paragraph.append(emphasis);
      } else if (['record', 'before', 'after'].includes(name)) {
        const record = node('code', undefined, 'observation-record');
        value.split(',').forEach((field, index) => {
          if (index) record.append(document.createTextNode(','), node('wbr'));
          record.append(document.createTextNode(field));
        });
        paragraph.append(record);
      } else if (results.includes(name)) {
        paragraph.append(node('strong', value));
      } else if (['time', 'room', 'card'].includes(name)) {
        paragraph.append(node('span', value, 'observation-token'));
      } else {
        paragraph.append(document.createTextNode(value));
      }
      cursor = match.index + match[0].length;
    }
    appendObservationProse(paragraph, template.slice(cursor));
    return paragraph;
  }

  function emphasizeTakeaway(container, step) {
    const text = t('guide.' + step + '.learned');
    const focus = t('guide.' + step + '.focus');
    const index = text.indexOf(focus);
    container.replaceChildren();
    if (index < 0) { container.textContent = text; return; }
    container.append(document.createTextNode(text.slice(0, index)), node('strong', focus),
      document.createTextNode(text.slice(index + focus.length)));
  }

  function guideObservation() {
    const step = guide.step;
    if (step === 1 && guide.partial) {
      const chain = guide.partial;
      if (!guide.shown) return [observation('guide.now.seed', {seed:shortHash(chain.seed)})];
      const n = guide.shown;
      const row = chain.rows[n - 1];
      const previous = n === 1 ? chain.seed : chain.rows[n - 2].hash;
      const [time, room, card, direction] = row.fields;
      const values = {n, record:row.fields.join(','), time, room, card,
        movement:t('guide.movement.' + direction), prior:shortHash(previous), hash:shortHash(row.hash)};
      const text = [observation('guide.now.row', values)];
      if (n < samples[0].rows.length) text.push(observation('guide.now.next', {n:n + 1, hash:shortHash(row.hash)}));
      else text.push(observation('guide.now.trailer', {count:n, tip:shortHash(row.hash), trailer:shortHash(chain.trailer.hash)}));
      return text;
    }
    if ((step === 2 || step === 3) && guide.results[step]) {
      const result = guide.results[step];
      return [observation('guide.now.' + step, {first:result.firstMismatch, before:guide.base.rows[1].fields.join(','),
        after:guide.modified.rows[1].fields.join(','), old:shortHash(guide.base.rows[1].hash),
        hash:shortHash(guide.results[2].rows[1].expected),
        expected:shortHash(result.expected), actual:shortHash(result.actual)})];
    }
    if (step === 4 && guide.results[4]) return [observation('guide.now.4', {first:guide.results[3].firstMismatch,
      count:guide.results[4].rows.length, result:t(guide.results[4].valid ? 'pass' : 'fail'),
      tip:shortHash(core.tip(guide.rebuilt))})];
    if (step === 5 && guide.results[5]) {
      const [without, withTrailer] = guide.results[5];
      return [observation('guide.now.5', {count:without.rows.length, original:guide.base.rows.length,
        without:t(without.valid ? 'pass' : 'fail'), with:t(withTrailer.valid ? 'pass' : 'fail'),
        expected:shortHash(withTrailer.expected), actual:shortHash(withTrailer.actual)})];
    }
    if (step === 6 && guide.matrix) return guide.matrix.slice(-1).map((row, i) => observation('guide.now.6', {
      protection:t('protection.selected'),
      outsider:t(row.results[0].detected ? 'detected' : 'undetected'),
      recorder:t(row.results[1].detected ? 'detected' : 'undetected')}));
    if (step === 7 && guide.quizOpen) {
      const answered = Object.hasOwn(state.answers, state.question);
      return [observation('guide.now.7', {count:Object.keys(state.answers).length, total:quizAnswers.length, n:state.question + 1,
        result:answered ? t(state.answers[state.question] === quizAnswers[state.question] ? 'quiz.correct' : 'quiz.incorrect') : t('guide.unanswered')})];
    }
    return [observation('guide.waiting')];
  }

  function dataIntroduction() {
    const figure = visualFigure('data.title');
    figure.id = 'guide-data-intro';
    figure.append(node('p', t('data.intro')));
    const record = samples[0].rows[0].join(',');
    const seed = guide.partial.seed;
    const input = core.hashInput(seed, samples[0].rows[0]);
    const hash = guide.shown > 0 ? guide.partial.rows[0].hash : null;
    const flow = node('div', undefined, 'data-flow');
    const recordCard = visualCard(t('data.record'), record, t('data.recordNote'));
    recordCard.dataset.dataKind = 'record';
    const inputCard = visualCard(t('data.input'), input, t('data.inputNote'));
    inputCard.dataset.dataKind = 'input';
    const output = hash ? visualHash(hash) : node('p', t('data.pending'), 'muted');
    const hashCard = visualCard(t('data.hash'), output, t('data.hashNote'));
    hashCard.dataset.dataKind = 'hash'; hashCard.dataset.computed = String(!!hash);
    flow.append(recordCard, positionArrow(t('data.join')), inputCard,
      positionArrow(t('data.calculate', {count:new TextEncoder().encode(input).length})), hashCard);
    figure.append(flow, node('p', t('data.seedNote'), 'data-note'));
    const pair = node('div', undefined, 'data-kept-pair');
    pair.append(node('strong', t('data.pair')), node('p', t('data.pairNote')));
    const row = node('div', undefined, 'visual-grid');
    row.append(visualCard(t('data.recordShort'), record),
      visualCard(t('data.attached'), hash ? visualHash(hash) : t('data.pending')));
    pair.append(row); figure.append(pair);
    const verification = node('div', undefined, 'data-verification');
    verification.append(node('strong', t('data.verifyTitle')), node('p', t('data.verifyIntro')));
    const roles = node('div', undefined, 'visual-grid');
    roles.append(visualCard(t('data.attached'), undefined, t('data.attachedNote')),
      visualCard(t('data.recomputed'), undefined, t('data.recomputedNote')));
    verification.append(roles, node('p', t('data.compare'), 'visual-conclusion'),
      node('p', t('data.noUpdate')));
    figure.append(verification, node('p', t('data.scope'), 'muted'));
    return figure;
  }

  function chainOverview() {
    const figure = node('figure', undefined, 'chain-overview');
    figure.id = 'guide-chain-overview';
    figure.tabIndex = -1;
    const caption = node('figcaption', t('overview.title'));
    caption.id = 'guide-chain-overview-caption';
    figure.setAttribute('aria-labelledby', caption.id);
    figure.append(caption, node('p', t('overview.intro')));
    const layout = node('div', undefined, 'overview-layout');
    const bundle = node('div', undefined, 'overview-bundle');
    bundle.append(node('strong', t('overview.recorder')), node('p', t('overview.bundle')));
    const header = node('div', undefined, 'overview-part');
    header.append(node('strong', t('overview.header')), node('pre', samples[0].headers.join('\n')));
    const list = node('ol', undefined, 'overview-records');
    samples[0].rows.forEach((fields, i) => {
      const pair = node('li', undefined, 'overview-pair');
      pair.dataset.record = String(i + 1);
      const record = node('div');
      record.append(node('strong', t('visual.row', {n:i + 1})), node('code', fields.join(',')));
      const output = node('div');
      output.append(node('span', t('guide.flowRow', {n:i + 1})));
      const hash = guide.partial && i < guide.shown ? guide.partial.rows[i].hash : null;
      pair.dataset.computed = String(!!hash);
      if (hash) {
        const value = node('code', shortHash(hash), 'overview-hash');
        value.title = hash;
        output.append(value);
      } else output.append(node('span', t('overview.pending'), 'muted'));
      pair.append(record, output);
      list.append(pair);
    });
    const trailer = node('div', undefined, 'overview-part overview-trailer');
    trailer.append(node('strong', t('overview.trailer')));
    const complete = guide.shown === samples[0].rows.length && guide.partial && guide.partial.trailer;
    if (complete) {
      trailer.append(node('code', 'rows=' + guide.partial.rows.length), node('code', guide.partial.trailer.hash, 'hash'));
    } else trailer.append(node('p', t('overview.trailerPending')));
    bundle.append(header, list, trailer, node('p', t('overview.hashNote'), 'muted'));
    const people = node('div', undefined, 'overview-people');
    const verifier = node('div', undefined, 'overview-person');
    verifier.append(node('strong', t('overview.verifier')));
    const checks = node('ol');
    for (const key of ['receive', 'recompute', 'compare']) checks.append(node('li', t('overview.' + key)));
    verifier.append(checks);
    const keeper = node('div', undefined, 'overview-person overview-independent');
    keeper.append(node('strong', t('overview.keeper')), node('p', t('overview.checkpoint')));
    if (complete) keeper.append(node('code', core.tip(guide.partial), 'hash overview-tip'));
    else keeper.append(node('p', t('overview.tipPending'), 'muted'));
    keeper.append(node('p', t('overview.independent')));
    people.append(verifier, keeper);
    layout.append(bundle, people);
    figure.append(layout, node('p', t('overview.input'), 'privacy'), node('p', t('overview.scope'), 'muted'));
    return figure;
  }

  $('guide-overview-jump').addEventListener('click', () => {
    const figure = $('guide-chain-overview');
    if (!figure) return;
    let parent = figure.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') { parent.open = true; expanded.add(parent.id); } parent = parent.parentElement; }
    figure.focus({preventScroll:true});
    figure.scrollIntoView({block:'start'});
  });

  function sampleIllustration() {
    const fields = samples[0].rows[0];
    const figure = node('figure', undefined, 'sample-illustration');
    const caption = node('figcaption', t('guide.sampleFigure.title'));
    caption.id = 'sample-illustration-caption';
    figure.setAttribute('aria-labelledby', caption.id);
    const layout = node('div', undefined, 'sample-illustration-layout');
    const scene = node('div', undefined, 'sample-scene');
    const labels = node('div', undefined, 'sample-scene-labels');
    labels.append(node('strong', fields[0]), node('strong', fields[1]));
    const image = node('img');
    image.src = 'assets/access-entry.webp';
    image.alt = t('guide.sampleFigure.alt');
    image.width = 1536;
    image.height = 1024;
    image.loading = 'lazy';
    image.decoding = 'async';
    scene.append(labels, image);
    const meanings = node('dl', undefined, 'sample-fields');
    for (let i = 0; i < fields.length; i += 1) {
      const field = node('div', undefined, 'sample-field');
      const term = node('dt');
      term.append(node('span', String(i + 1), 'sample-field-number'),
        node('span', t('guide.sampleFigure.field.' + i)));
      const value = node('dd');
      value.append(node('code', fields[i]), node('span', t('guide.sampleFigure.meaning.' + i)));
      field.append(term, value);
      meanings.append(field);
    }
    layout.append(scene, meanings);
    const record = node('p', undefined, 'sample-record');
    record.append(node('strong', t('guide.sampleFigure.record')), node('code', fields.join(',')));
    figure.append(caption, layout, record);
    return figure;
  }

  function visualFigure(key, values = {}) {
    const figure = node('figure', undefined, 'lesson-visual');
    figure.append(node('figcaption', t(key, values)));
    return figure;
  }

  function visualCard(title, value, note) {
    const card = node('div', undefined, 'visual-card');
    card.append(node('strong', title, 'visual-label'));
    if (value !== undefined) card.append(typeof value === 'string' ? node('code', value, 'visual-value') : value);
    if (note) card.append(node('p', note));
    return card;
  }

  function visualHash(hash) {
    const code = node('code', undefined, 'visual-hash');
    for (let i = 0; i < hash.length; i += 8) {
      code.append(node(i === 0 ? 'strong' : 'span', hash.slice(i, i + 8)));
    }
    return code;
  }

  function hashDisplayExample() {
    if (!guide.partial) return node('div');
    const hash = guide.partial.seed;
    const figure = visualFigure('visual.display.title');
    const pair = node('div', undefined, 'visual-grid');
    const short = node('code', undefined, 'visual-short');
    short.append(node('strong', hash.slice(0, 8)), node('span', '\u2026'));
    pair.append(visualCard(t('visual.display.short'), short, t('visual.display.omitted')),
      visualCard(t('visual.display.full'), visualHash(hash), t('visual.display.match')));
    figure.append(pair, node('p', t('visual.display.note'), 'visual-conclusion'));
    return figure;
  }

  function visualRows(result, title, removed = 0) {
    const block = node('div', undefined, 'visual-row-group');
    block.append(node('strong', title, 'visual-label'));
    const list = node('ol', undefined, 'visual-rows');
    const count = result ? result.rows.length : samples[0].rows.length;
    for (let i = 0; i < count; i += 1) {
      const gone = i >= count - removed;
      const valid = result ? result.rows[i].valid : null;
      const status = gone ? 'removed' : valid === null ? 'retained' : valid ? 'pass' : 'fail';
      const li = node('li', undefined, 'visual-row visual-' + status);
      li.dataset.row = String(i + 1);
      li.dataset.status = status;
      li.append(node('span', t('visual.row', {n:i + 1})),
        node('strong', t('visual.status.' + status)));
      list.append(li);
    }
    block.append(list);
    return block;
  }

  function visualChainComparison(result, stage) {
    const block = node('div', undefined, 'visual-row-group chain-comparison');
    block.dataset.stage = String(stage);
    block.append(node('strong', t(stage === 'free' ? 'clarity.freeTitle' : 'compare.title.' + stage), 'visual-label'),
      node('p', t(stage === 'free' ? 'clarity.freeNote' : 'compare.note.' + stage)));
    const headings = node('div', undefined, 'comparison-headings');
    headings.append(node('strong', t(stage === 'free' ? 'clarity.freeLeft' : 'compare.left.' + stage)),
      node('span', t('compare.judge')), node('strong', t('compare.right')));
    const list = node('ol', undefined, 'visual-rows comparison-rows');
    for (const row of result.rows) {
      const li = node('li', undefined, 'comparison-row');
      li.dataset.row = String(row.number);
      li.dataset.status = row.valid ? 'pass' : 'fail';
      li.append(node('strong', t('visual.row', {n:row.number}), 'comparison-record'));
      const stored = node('div', undefined, 'comparison-cell comparison-stored');
      const recalculated = node('div', undefined, 'comparison-cell comparison-recalculated');
      for (const [cell, label, hash] of [[stored, 'compare.stored', row.actual], [recalculated, 'compare.recalculated', row.expected]]) {
        const value = node('code', shortHash(hash), 'comparison-hash');
        value.title = hash;
        cell.append(node('span', t(label), 'comparison-cell-label'), value);
      }
      const status = node('div', undefined, 'comparison-status');
      const symbol = node('span', row.valid ? '=' : '≠', 'comparison-symbol');
      symbol.setAttribute('aria-hidden', 'true');
      status.append(symbol, node('strong', t('visual.status.' + (row.valid ? 'pass' : 'fail'))));
      const full = node('details', undefined, 'comparison-full');
      full.append(node('summary', t('compare.full', {n:row.number})));
      const pair = node('div', undefined, 'visual-grid');
      pair.append(visualCard(t('compare.stored'), visualHash(row.actual)),
        visualCard(t('compare.recalculated'), visualHash(row.expected)));
      full.append(node('p', t('clarity.verificationInput')), node('code', row.input, 'hash-input'), pair);
      li.append(stored, status, recalculated, full);
      list.append(li);
    }
    block.append(headings, list, node('p', t('compare.display'), 'muted'));
    return block;
  }

  function utf8InputExample(input, isRow, kind = '') {
    const bytes = new TextEncoder().encode(input);
    const values = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    const block = node('div', undefined, 'visual-bytes');
    block.append(node(kind ? 'strong' : 'h4', t('visual.bytes.title', {count:bytes.length})),
      node('p', t('visual.bytes.note')));
    const code = node('code', undefined, 'visual-byte-stream');
    values.forEach((value, i) => {
      if (i) code.append(' ');
      code.append(node('span', value, 'visual-byte' + (isRow && i < 2 ? ' byte-character' : '') +
        (isRow && i === 64 ? ' byte-separator' : '')));
    });
    block.append(code);
    if (isRow) {
      block.append(node('p', t('visual.bytes.characters', {a:input[0], b:input[1], x:values[0], y:values[1]})),
        node('p', t(kind === 'trailer' ? 'diagram.trailerBytes' : 'visual.bytes.parts', {record:bytes.length - 65, count:bytes.length})));
    } else block.append(node('p', t('visual.bytes.header')));
    block.append(node('p', t('visual.bytes.use', {count:bytes.length}), 'visual-byte-note'));
    return block;
  }


  function propagationFigure() {
    const figure = visualFigure('clarity.propagation');
    figure.classList.add('propagation');
    const grid = node('div', undefined, 'visual-grid');
    for (const [name, previous, hash] of [
      ['original', guide.base.rows[1].hash, guide.base.rows[2].hash],
      ['recomputed', guide.results[2].rows[1].expected, guide.results[2].rows[2].expected]
    ]) {
      const card = node('div', undefined, 'visual-card');
      card.dataset.path = name;
      const prefix = node('code', shortHash(previous), 'propagation-prefix'); prefix.title = previous;
      const output = node('code', shortHash(hash), 'propagation-output'); output.title = hash;
      card.append(node('h4', t('clarity.' + name)), node('p', t('clarity.prefix')), prefix,
        node('p', t('clarity.sameRecord')), node('code', guide.base.rows[2].fields.join(','), 'propagation-fields'),
        node('p', t('clarity.output3')), output);
      const input = core.hashInput(previous, guide.base.rows[2].fields);
      const full = node('details');
      full.append(node('summary', t('visual.exact')), node('code', input, 'hash-input'));
      card.append(full); grid.append(card);
    }
    figure.append(grid, node('p', t('clarity.propagationNote'), 'visual-conclusion'));
    return figure;
  }

  function trailerComparison() {
    const pair = node('div', undefined, 'visual-grid trailer-comparison');
    const result = guide.results[5][1];
    for (const [key, input, hash] of [
      ['clarity.trailerOriginal', core.trailerInput(core.tip(guide.base), guide.base.rows.length), result.trailer.actual],
      ['clarity.trailerCut', core.trailerInput(result.rows[result.rows.length - 1].expected, result.rows.length), result.trailer.expected]
    ]) {
      const card = node('div', undefined, 'visual-card');
      const value = node('code', undefined, 'hash-input');
      const split = input.lastIndexOf('|');
      value.append(input.slice(0, split), node('wbr'), node('strong', input.slice(split), 'observation-token'));
      card.append(node('h4', t(key)), node('p', t('clarity.trailerInput')), value,
        node('p', t('clarity.trailerHash')), visualHash(hash));
      pair.append(card);
    }
    return pair;
  }

  function guideVisual() {
    const step = guide.step;
    const figure = visualFigure('visual.step.' + step);
    figure.dataset.step = String(step);
    if (step === 1 && guide.partial) {
      const chain = guide.partial;
      const n = guide.shown;
      const flow = node('div', undefined, 'visual-calculation');
      let input;
      let hash;
      if (n === 0) {
        input = chain.headers.join('\n');
        hash = chain.seed;
        flow.append(visualCard(t('visual.headerInput'), input, t('visual.headerNote')));
      } else {
        const previous = n === 1 ? chain.seed : chain.rows[n - 2].hash;
        const row = chain.rows[n - 1];
        input = core.hashInput(previous, row.fields);
        hash = row.hash;
        const parts = node('div', undefined, 'visual-input-parts');
        parts.append(visualCard(t('visual.previousFull'), visualHash(previous)),
          visualCard(t('visual.separator'), '|'),
          visualCard(t('visual.currentRecord', {n}), row.fields.join(',')));
        flow.append(visualCard(t('visual.input'), parts, t('visual.joinNote')));
      }
      flow.append(visualCard(t('visual.calculate'), 'SHA-256', t('visual.encoding')),
        visualCard(t(n ? 'visual.outputRow' : 'visual.outputSeed', {n}), visualHash(hash)));
      const exact = node('details', undefined, 'visual-exact');
      exact.append(node('summary', t('visual.exact')), node('code', input, 'visual-exact-input'), utf8InputExample(input, n > 0));
      figure.append(flow, exact, node('p', t(n ? 'visual.next' : 'visual.seedNext', {n:n + 1}), 'visual-conclusion'));
      if (n === samples[0].rows.length) {
        figure.lastElementChild.textContent = t('visual.finish');
        figure.append(visualCard(t('visual.trailerInput'), core.trailerInput(hash, n)),
          visualCard(t('visual.trailerOutput'), visualHash(chain.trailer.hash)));
      }
      return figure;
    }
    if (step >= 2 && step <= 4) {
      const before = samples[0].rows[1];
      const after = guide.modified ? guide.modified.rows[1].fields : before.map((value, i) => i ? value : '09:06');
      const pair = node('div', undefined, 'visual-grid');
      pair.append(visualCard(t('visual.recordBefore'), core.hashInput(guide.firstHash, before)),
        visualCard(t('visual.recordAfter'), core.hashInput(guide.firstHash, after), t('visual.changeTime')));
      figure.append(disclosure('guide-input-pair-' + step, 'clarity.inputs', pair));
      const result = guide.results[step];
      if (!result) {
        figure.append(node('p', t('visual.plan.' + step), 'visual-conclusion'));
        return figure;
      }
      figure.append(propagationFigure());
      if (step === 4) figure.append(disclosure('guide-previous-comparison', 'clarity.previousStage', visualChainComparison(guide.results[3], 3)));
      figure.append(visualChainComparison(result, step));
      figure.append(node('p', t('visual.result.' + step), 'visual-conclusion'));
      return figure;
    }
    if (step === 5) {
      figure.append(visualRows(null, t('visual.cut'), 2));
      const pair = node('div', undefined, 'visual-grid');
      pair.append(visualCard(t('visual.originalCount'), 'rows=' + samples[0].rows.length), visualCard(t('visual.remainingCount'), 'rows=' + (samples[0].rows.length - 2)));
      figure.append(pair);
      if (guide.results[5]) {
        const [without, withTrailer] = guide.results[5];
        const results = node('div', undefined, 'visual-grid');
        results.append(visualCard(t('guide.withoutTrailer'), t(without.valid ? 'pass' : 'fail'), t('visual.cutWithout')),
          visualCard(t('guide.withTrailer'), t(withTrailer.valid ? 'pass' : 'fail'), t('visual.cutWith')));
        figure.append(results, trailerComparison());
        const rebuild = node('button', t('clarity.rebuildTrailer'));
        rebuild.type = 'button'; rebuild.id = 'guide-trailer-rebuild';
        rebuild.addEventListener('click', async () => {
          await perform(async () => { guide.trailerRebuilt = await core.verify(await core.rechain(guide.cut)); });
          const result = $('guide-trailer-rebuilt');
          if (result) result.focus();
        });
        figure.append(rebuild);
        if (guide.trailerRebuilt) {
          const updated = node('section'); updated.id = 'guide-trailer-rebuilt'; updated.tabIndex = -1;
          updated.append(node('h4', t('clarity.rebuiltTrailer')));
          const verification = node('div'); renderResult(verification, guide.trailerRebuilt, true);
          updated.append(verification, node('p', t('clarity.rebuiltNote')), resultMeaning(guide.trailerRebuilt));
          figure.append(updated);
        }
      }
      figure.append(node('p', t('visual.cutLimit'), 'visual-conclusion'));
      return figure;
    }
    if (step === 6) {
      const roles = node('div', undefined, 'visual-grid visual-three');
      for (const role of ['outsider', 'recorder', 'holder']) {
        roles.append(visualCard(t('visual.role.' + role), undefined, t('visual.role.' + role + '.note')));
      }
      figure.append(roles);
      if (guide.matrix) {
        const selected = guide.matrix[guide.matrix.length - 1];
        figure.append(node('p', t('visual.selected', {protections:selected.protections.length
          ? selected.protections.map(value => t('protection.' + value)).join(' + ') : t('protection.none')})));
        const results = node('div', undefined, 'visual-grid');
        selected.results.forEach((result, i) => results.append(visualCard(t('role.' + (i ? 'recorder' : 'outsider')),
          t(result.detected ? 'detected' : 'undetected'))));
        figure.append(results);
      }
      figure.append(node('p', t('visual.rolesNote'), 'visual-conclusion'));
      return figure;
    }
    if (step === 7) {
      const prompts = node('ol', undefined, 'visual-prompts');
      for (let i = 1; i <= 3; i += 1) {
        const li = node('li');
        li.append(node('strong', t('visual.question.' + i)), node('p', t('visual.question.' + i + '.note')));
        prompts.append(li);
      }
      figure.append(prompts);
    }
    return figure;
  }

  function lessonExample(lesson) {
    const figure = visualFigure('visual.lesson.' + (lesson + 1) + '.title');
    const items = node('ol', undefined, 'visual-examples');
    for (let i = 1; i <= 3; i += 1) {
      const li = node('li');
      const key = 'visual.lesson.' + (lesson + 1) + '.' + i;
      li.append(visualCard(t(key + '.title'), t(key + '.value'), t(key + '.note')));
      items.append(li);
    }
    figure.append(items, node('p', t('visual.lesson.' + (lesson + 1) + '.note'), 'visual-conclusion'));
    return figure;
  }

  function renderGuideExplanation() {
    const step = guide.step;
    $('guide-aim').textContent = t('guide.' + step + '.aim');
    const background = $('guide-background');
    background.replaceChildren();
    background.append(node('p', t('clarity.prerequisite.' + step)));
    if (step === 1) background.append(sampleIllustration(), dataIntroduction());
    const more = disclosure('guide-background-more-' + step, 'clarity.more');
    if (step === 1) more.append(disclosure('guide-overview-details', 'clarity.overview', chainOverview()),
      node('p', t('clarity.aimDetail.1')), node('p', t('guide.sampleFigure.direction')));
    for (const lesson of guidePrerequisites[step - 1]) {
      const content = lessonPrerequisite(lesson);
      content.querySelector('h4').remove();
      content.className = 'guide-background-part';
      content.dataset.sourceLesson = String(lesson + 1);
      more.append(content);
    }
    if (step === 1) {
      more.append(node('p',t('guide.sample')),node('p',t('guide.hashDisplay')),hashDisplayExample());
    }
    if (step === 2) more.append(node('p',t('guide.avalanche')));
    if (step === 7) more.append(node('p',t('guide.7.prerequisite')));
    background.append(more);
    $('guide-now').replaceChildren(...guideObservation().flatMap(({key, values}) =>
      messages[language][key].split('\n').map(template => observationParagraph(template, values))));
    $('guide-meaning').replaceChildren();
    if (step >= 2 && step <= 4 && guide.results[step]) $('guide-meaning').append(resultMeaning(guide.results[step]));
    const detail = guideVisual();
    $('guide-visual').replaceChildren(step === 3 && guide.results[3]
      ? disclosure('guide-record2-detail', 'position.record2Detail', detail) : detail);
    const explanation = $('guide-explanation');
    explanation.replaceChildren();
    for (const lesson of guideSources[step - 1]) {
      const section = node('section');
      section.dataset.sourceLesson = String(lesson + 1);
      section.append(node('h4',t('lesson.' + (lesson + 1) + '.title').replace(/^\d+\. /,'')));
      lessonBody(lesson,section);
      understandingSection(section, 's' + step + '-lesson-' + (lesson + 1));
      explanation.append(section);
    }
    if (step === 2) explanation.prepend(node('p',t('guide.avalanche')));
    if (step === 7) {
      const review = node('section');
      review.append(node('h4', t('guide.review')), node('p',t('guide.7.explanation')));
      for (const key of ['guide.3.learned','guide.4.learned','guide.5.learned','guide.6.learned']) {
        review.append(node('p',t(key)));
      }
      understandingSection(review, 's7-review');
      explanation.append(review);
    }
    for (const [id, part] of [['guide-aim-section', 'aim'], ['guide-prerequisites', 'prerequisites'],
      ['guide-task-section', 'task'], ['guide-observation-section', 'observation'], ['guide-takeaway', 'takeaway']]) {
      understandingSection($(id), 's' + step + '-' + part);
    }
  }

  function renderBuildProgress() {
    const active = guide.step === 1;
    const total = samples[0].rows.length;
    $('guide-build-progress').hidden = !active;
    $('guide-build-reset').hidden = !active;
    $('guide-build-next').hidden = !active || guide.shown !== total;
    if (!active) {
      $('guide-action').removeAttribute('aria-describedby');
      return;
    }
    $('guide-action').setAttribute('aria-describedby', 'guide-build-status');
    $('guide-build-caption').textContent = t('guide.build.caption', {total});
    const rows = samples[0].rows.map((row, i) => {
      const status = i < guide.shown ? 'done' : i === guide.shown ? 'next' : 'waiting';
      const item = node('li', undefined, 'build-row build-' + status);
      item.dataset.status = status;
      if (status === 'next') item.setAttribute('aria-current', 'step');
      const symbol = node('span', status === 'done' ? '✓' : status === 'next' ? '●' : '○', 'build-symbol');
      symbol.setAttribute('aria-hidden', 'true');
      item.append(symbol, node('strong', t('guide.flowRow', {n:i + 1})), node('code', row[0]), node('span', t('guide.build.' + status)));
      return item;
    });
    $('guide-build-rows').replaceChildren(...rows);
    $('guide-build-status').textContent = t(guide.shown === total ? 'guide.build.finished' : 'guide.build.status', {done:guide.shown, total, n:guide.shown + 1});
    $('guide-action').textContent = t(guide.shown === total ? 'guide.build.complete' : 'guide.build.calculate', {n:guide.shown + 1, total});
  }


  function renderExperimentContext() {
    const step = guide.step;
    const done = step === 1 ? guide.shown > 0 : step === 6 ? !!guide.matrix : !!guide.results[step];
    const stateBox = $('guide-state');
    stateBox.replaceChildren();
    stateBox.hidden = step < 2 || step > 4;
    if (!stateBox.hidden) stateBox.append(node('strong', t('clarity.state')),
      node('p', t(done ? 'clarity.state.' + step : 'clarity.state.wait')),
      node('p', t('clarity.state.checkpoint')));
    const holder = $('guide-prediction');
    holder.replaceChildren(); holder.hidden = step === 7;
    if (step === 7) return;
    const form = node('fieldset');
    form.append(node('legend', t('clarity.predict.' + step)));
    const feedback = node('p'); feedback.setAttribute('role', 'status');
    const answer = step === 1 ? true : step === 2 ? !guide.results[2]?.rows[2].valid : step === 3 ? guide.results[3]?.valid :
      step === 4 ? guide.results[4]?.valid : step === 5 ? !guide.results[5]?.[1].valid : guide.matrix?.[2].results[1].detected;
    const explain = () => {
      feedback.textContent = done && Object.hasOwn(guide.predictions, step)
        ? t(guide.predictions[step] === answer ? 'clarity.predict.match' : 'clarity.predict.different') : '';
    };
    for (const value of [true, false]) {
      const label = node('label', undefined, 'check-option prediction-choice');
      const input = node('input'); input.type = 'radio'; input.name = 'prediction-' + step;
      input.value = String(value); input.checked = guide.predictions[step] === value;
      input.addEventListener('change', () => { guide.predictions[step] = value; explain(); });
      label.append(input, node('span', t(value ? 'clarity.predict.yes' : 'clarity.predict.no'))); form.append(label);
    }
    explain();
    holder.append(disclosure('guide-prediction-' + step, 'clarity.predict', form, feedback));
  }

  function renderGuide() {
    const step = guide.step;
    renderPosition();
    $('guide-heading').textContent = t('guide.' + step + '.title');
    renderGuideExplanation();
    $('guide-task').textContent = t('guide.' + step + '.task');
    $('guide-action').textContent = t('guide.' + step + '.action');
    renderBuildProgress();
    renderExperimentContext();
    $('guide-counter').textContent = t('guide.counter', {n:step});
    $('guide-progress').value = step;
    $('guide-progress').setAttribute('aria-label', t('guide.counter', {n:step}));
    renderUnderstanding();
    $('guide-back-to-quiz').hidden = state.returnQuestion === null || step === 7;
    $('guide-reset').hidden = step < 2 || step > 4;
    $('guide-overview-jump').hidden = step !== 1 || guide.shown !== samples[0].rows.length;
    $('guide-options').hidden = step !== 6;
    $('guide-quiz').hidden = step !== 7 || !guide.quizOpen;
    $('panel-quiz').hidden = !guide.quizOpen;
    $('guide-prepared').hidden = !guide.prepared || step < 2 || step > 4;
    const done = step === 1 ? guide.shown > 0 : step === 6 ? !!guide.matrix : step === 7 ? Object.keys(state.answers).length > 0 : !!guide.results[step];
    $('guide-takeaway').hidden = !done;
    emphasizeTakeaway($('guide-understood'), step);
    const output = $('guide-result');
    output.replaceChildren();
    if (step === 1 && guide.partial) {
      output.append(node('p', t('progress', {done:guide.shown,total:8})));
      const flow = node('ol', undefined, 'chain-flow');
      [guide.partial.seed, ...guide.partial.rows.slice(0,2).map(row => row.hash)].slice(0,guide.shown + 1).forEach((hash,i) => {
        const li = node('li');
        li.append(node('span', i === 0 ? t('seed') : t('guide.flowRow',{n:i})), node('code',hash.slice(0,8) + '\u2026', 'chain-link'));
        if (i > 0) li.append(node('span', t('guide.fromPrevious')), node('code', (i === 1 ? guide.partial.seed : guide.partial.rows[0].hash).slice(0,8) + '\u2026', 'chain-link'));
        flow.append(li);
      });
      const detail = disclosure('guide-calculated-records-1', 'clarity.rows', flow);
      const rows = node('div');
      renderChain(rows, {...guide.partial, rows:guide.partial.rows.slice(0,guide.shown), trailer:guide.shown === 8 ? guide.partial.trailer : null}, null, guide.shown < 8, 8);
      detail.append(rows); output.append(detail);
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
      output.append(disclosure('guide-calculated-records-' + step, 'clarity.rows', rows));
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

  function understandingSection(section, key) {
    section.classList.add('learning-section');
    section.dataset.learningKey = key;
    let header = section.querySelector('.section-heading');
    if (!header) {
      const heading = section.querySelector('h3, h4');
      header = node('div', undefined, 'section-heading');
      heading.before(header);
      const label = node('label', undefined, 'section-check');
      const input = node('input');
      input.type = 'checkbox';
      input.addEventListener('change', () => {
        learning.setChecked(section.dataset.learningKey, input.checked);
        renderUnderstanding();
      });
      label.append(input, node('span'));
      header.append(heading, label);
    }
    const input = header.querySelector('input');
    input.id = 'understood-' + key;
    input.setAttribute('aria-label', t('learning.checkNamed', {title:header.querySelector('h3, h4').textContent}));
    let criterion = section.querySelector(':scope > .learning-criterion');
    if (!criterion) { criterion = node('p', undefined, 'learning-criterion'); section.append(criterion); }
    const part = key.split('-')[1];
    const criterionKey = ['observation', 'takeaway'].includes(part) ? String(guide.step) : part;
    criterion.textContent = t('clarity.criterion', {text:t('clarity.criterion.' + criterionKey)});
    criterion.id = 'criterion-' + key;
    input.setAttribute('aria-describedby', criterion.id);
  }

  function renderUnderstanding() {
    const current = learning.snapshot();
    const count = current.checked.length;
    const stepKeys = learningModel.SECTIONS[guide.step - 1];
    $('guide-understood-count').textContent = t('learning.stepCount', {
      n:stepKeys.filter(key => current.checked.includes(key)).length, total:stepKeys.length});
    $('settings-understood-count').textContent = t('learning.count', {n:count, total:learningModel.KEYS.length});
    document.querySelectorAll('[data-learning-key]').forEach(section => {
      const checked = current.checked.includes(section.dataset.learningKey);
      section.classList.toggle('is-understood', checked);
      const input = section.querySelector('.section-check input');
      input.checked = checked;
      input.disabled = false;
      section.querySelector('.section-check span').textContent = t(checked ? 'learning.done' : 'learning.check');
    });
    $('learning-save').checked = current.save;
    for (const id of ['learning-save', 'learning-reset-cancel', 'learning-reset-apply']) {
      $(id).disabled = false;
    }
    $('learning-reset').disabled = count === 0 && current.legacySteps.length === 0;
    $('learning-legacy').hidden = current.legacySteps.length === 0;
    $('learning-legacy').textContent = current.legacySteps.length ? t('learning.legacy', {steps:current.legacySteps.join(', ')}) : '';
    $('learning-save-status').textContent = t(current.save ? 'learning.savingOn' : 'learning.savingOff');
    $('learning-message').textContent = learningNotice ? t(learningNotice) : '';
    $('learning-reset-question').textContent = t('learning.question', {n:count}) +
      (current.legacySteps.length ? ' ' + t('learning.clearLegacy') : '');
    $('learning-storage-warning').hidden = !current.error;
    $('learning-storage-warning').textContent = current.error ? t('learning.error.' + current.error) : '';
    for (let i = 1; i <= 7; i += 1) {
      const button = $('guide-step-' + i);
      const title = i + '. ' + t('guide.' + i + '.title');
      const keys = learningModel.SECTIONS[i - 1];
      const n = keys.filter(key => current.checked.includes(key)).length;
      const progress = t('learning.parts', {n, total:keys.length});
      button.replaceChildren(node('span', (n === keys.length ? '✓ ' : '') + title), node('span', progress, 'step-check-count'));
      button.setAttribute('aria-label', title + ' — ' + progress);
      if (i === guide.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  }

  $('learning-save').addEventListener('change', event => {
    learning.setSaving(event.target.checked);
    learningNotice = '';
    renderUnderstanding();
  });
  function closeLearningReset() {
    $('learning-reset-confirm').hidden = true;
    $('learning-reset').focus();
  }
  $('learning-reset').addEventListener('click', () => {
    learningNotice = '';
    renderUnderstanding();
    $('learning-reset-confirm').hidden = false;
    $('learning-reset-cancel').focus();
  });
  $('learning-reset-cancel').addEventListener('click', closeLearningReset);
  $('learning-reset-confirm').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeLearningReset(); }
  });
  $('learning-reset-apply').addEventListener('click', () => {
    learning.reset();
    $('learning-reset-confirm').hidden = true;
    learningNotice = 'learning.cleared';
    renderUnderstanding();
    $('learning-settings-heading').focus();
  });

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
      matrixSelection.guide = null;
      renderGuide();
    });
  }
  const wideSteps = window.matchMedia('(min-width: 760px)');
  const stepLayout = () => { $('guide-picker').open = wideSteps.matches; };
  wideSteps.addEventListener('change',stepLayout);
  stepLayout();
  $('guide-action').addEventListener('click', () => perform(runGuide));
  $('guide-build-reset').addEventListener('click', async () => {
    await perform(async () => {
      const empty = await core.createChain({headers:samples[0].headers, rows:[]}, {hasTrailer:false});
      guide.partial = empty;
      guide.shown = 0;
    });
    if (!state.error) $('guide-action').focus();
  });
  $('guide-build-next').addEventListener('click', () => chooseGuide(2, true));
  $('guide-next').addEventListener('click', () => chooseGuide(Math.min(7,guide.step + 1),true));
  $('guide-back').addEventListener('click', () => chooseGuide(Math.max(1,guide.step - 1),true));
  $('guide-reset').addEventListener('click', () => {
    guide.modified = guide.single = guide.rebuilt = null;
    guide.results = {};
    guide.prepared = false;
    renderGuide();
  });
  $('lesson-quiz').addEventListener('click', () => showTab('quiz',true));


  localize();
  showTab('guide');
  if (!window.crypto || !window.crypto.subtle) {
    state.error = 'cryptoUnavailable';
    render();
    setBusy(true);
    document.body.setAttribute('aria-busy', 'false');
  } else perform(async () => {
    await rebuild();
    await preparePosition();
    guide.partial = await core.createChain({headers:samples[0].headers, rows:[]}, {hasTrailer:false});
    guide.firstHash = await core.sha256(core.hashInput(guide.partial.seed, samples[0].rows[0]));
  });
}());
