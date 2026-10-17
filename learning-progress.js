(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HashChainLearning = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'hash-chain-tamper-trainer.learning';
  const SECTIONS = Object.freeze([
    ['aim', 'prerequisites', 'task', 'observation', 'lesson-1', 'lesson-2', 'takeaway'],
    ['aim', 'prerequisites', 'task', 'observation', 'lesson-3', 'takeaway'],
    ['aim', 'prerequisites', 'task', 'observation', 'lesson-3', 'takeaway'],
    ['aim', 'prerequisites', 'task', 'observation', 'lesson-5', 'lesson-6', 'takeaway'],
    ['aim', 'prerequisites', 'task', 'observation', 'lesson-4', 'takeaway'],
    ['aim', 'prerequisites', 'task', 'observation', 'lesson-7', 'takeaway'],
    ['aim', 'prerequisites', 'task', 'observation', 'review', 'takeaway']
  ].map((parts, index) => Object.freeze(parts.map(part => 's' + (index + 1) + '-' + part))));
  const KEYS = Object.freeze(SECTIONS.flat());
  const uniqueArray = (value, valid) => Array.isArray(value) &&
    new Set(value).size === value.length && value.every(valid);

  function create(getStorage = () => globalThis.localStorage) {
    let save = true;
    let checked = [];
    let legacySteps = [];
    let error = null;
    try {
      const raw = getStorage().getItem(KEY);
      if (raw !== null) {
        try {
          if (typeof raw !== 'string' || raw.length > 4096) throw new Error('Invalid data');
          const data = JSON.parse(raw);
          if (!data || ![1, 2].includes(data.version) || typeof data.save !== 'boolean') throw new Error('Invalid data');
          const keys = data.save ? (data.version === 1 ? ['version', 'save', 'checked'] :
            ['version', 'save', 'checked', 'legacySteps']) : ['version', 'save'];
          if (Object.keys(data).length !== keys.length || !keys.every(key => Object.hasOwn(data, key))) {
            throw new Error('Invalid data');
          }
          if (data.save) {
            if (data.version === 1) {
              if (!Array.isArray(data.checked) || data.checked.length !== 7 ||
                !data.checked.every(value => typeof value === 'boolean')) throw new Error('Invalid data');
            } else if (!uniqueArray(data.checked, key => KEYS.includes(key)) ||
              !uniqueArray(data.legacySteps, step => Number.isInteger(step) && step >= 1 && step <= 7)) {
              throw new Error('Invalid data');
            }
          }
          save = data.save;
          if (save && data.version === 1) {
            legacySteps = data.checked.flatMap((value, i) => value ? [i + 1] : []);
          } else if (save) {
            checked = KEYS.filter(key => data.checked.includes(key));
            legacySteps = data.legacySteps.slice().sort((a, b) => a - b);
          }
        } catch (_) { error = 'invalid'; }
      }
    } catch (_) { error = 'read'; }

    function snapshot() { return {save, checked: checked.slice(), legacySteps: legacySteps.slice(), error}; }
    function persist() {
      const data = save ? {version: 2, save, checked, legacySteps} : {version: 2, save};
      try {
        getStorage().setItem(KEY, JSON.stringify(data));
        error = null;
      } catch (_) { error = 'write'; }
    }
    return Object.freeze({
      snapshot,
      setChecked(key, value) {
        if (!KEYS.includes(key) || typeof value !== 'boolean') {
          throw new TypeError('Invalid understanding check');
        }
        checked = KEYS.filter(item => item === key ? value : checked.includes(item));
        if (save) persist();
        return snapshot();
      },
      setSaving(value) {
        if (typeof value !== 'boolean') throw new TypeError('Invalid saving preference');
        save = value;
        persist();
        return snapshot();
      },
      reset() {
        checked = [];
        legacySteps = [];
        persist();
        return snapshot();
      }
    });
  }
  return Object.freeze({KEY, KEYS, SECTIONS, create});
}));
