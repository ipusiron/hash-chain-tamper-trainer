(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HashChainLearning = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'hash-chain-tamper-trainer.learning';
  const empty = () => Array(7).fill(false);

  function create(getStorage = () => globalThis.localStorage) {
    let save = true;
    let checked = empty();
    let error = null;
    try {
      const raw = getStorage().getItem(KEY);
      if (raw !== null) {
        try {
          if (typeof raw !== 'string' || raw.length > 512) throw new Error('Invalid data');
          const data = JSON.parse(raw);
          if (!data || data.version !== 1 || typeof data.save !== 'boolean') throw new Error('Invalid data');
          const keys = data.save ? ['version', 'save', 'checked'] : ['version', 'save'];
          if (Object.keys(data).length !== keys.length || !keys.every(key => Object.hasOwn(data, key))) {
            throw new Error('Invalid data');
          }
          if (data.save && (!Array.isArray(data.checked) || data.checked.length !== 7 ||
            !data.checked.every(value => typeof value === 'boolean'))) throw new Error('Invalid data');
          save = data.save;
          checked = save ? data.checked.slice() : empty();
        } catch (_) { error = 'invalid'; }
      }
    } catch (_) { error = 'read'; }

    function snapshot() { return {save, checked: checked.slice(), error}; }
    function persist() {
      const data = save ? {version: 1, save, checked} : {version: 1, save};
      try {
        getStorage().setItem(KEY, JSON.stringify(data));
        error = null;
      } catch (_) { error = 'write'; }
    }
    return Object.freeze({
      snapshot,
      setChecked(step, value) {
        if (!Number.isInteger(step) || step < 1 || step > 7 || typeof value !== 'boolean') {
          throw new TypeError('Invalid understanding check');
        }
        checked[step - 1] = value;
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
        checked = empty();
        persist();
        return snapshot();
      }
    });
  }
  return Object.freeze({KEY, create});
}));
