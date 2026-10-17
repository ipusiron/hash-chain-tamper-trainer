/* Hash Chain Tamper Trainer - MIT (c) 2026 ipusiron */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HashChainCore = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FIXED_SEED = '0'.repeat(64);
  const encoder = new TextEncoder();
  const OPERATIONS = ['rewrite', 'delete', 'swap', 'insert', 'truncate', 'header', 'rehashOne'];
  const PROTECTIONS = ['checkpoint', 'hmac', 'signature', 'timestamp'];
  const bytes = text => encoder.encode(text);
  const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
  const clone = value => JSON.parse(JSON.stringify(value));

  function subtle(api) {
    const result = api || (globalThis.crypto && globalThis.crypto.subtle);
    if (!result) throw new Error('cryptoUnavailable');
    return result;
  }

  function fieldsValid(fields) {
    return Array.isArray(fields) && fields.length === 4 && fields.every(value =>
      typeof value === 'string' && value.length > 0 && value.length <= 64 &&
      /^[\x20-\x7e]+$/.test(value) && !/[|,\r\n]/.test(value));
  }

  function checkFields(fields) {
    if (!fieldsValid(fields)) throw new Error('invalidFields');
  }

  function checkHeaders(headers) {
    if (!Array.isArray(headers) || headers.length === 0 || headers.some(line =>
      typeof line !== 'string' || !/^# [A-Za-z][A-Za-z0-9]*=[\x20-\x7e]+$/.test(line) ||
      line.length > 160 || /[|,\r\n]/.test(line))) throw new Error('invalidHeaders');
  }

  async function sha256(text, api) {
    return hex(await subtle(api).digest('SHA-256', bytes(text)));
  }

  async function hmacKey(api) {
    return subtle(api).generateKey({ name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign', 'verify']);
  }

  async function hmac(text, key, api) {
    if (!key) throw new Error('keyRequired');
    return hex(await subtle(api).sign('HMAC', key, bytes(text)));
  }

  async function signingKeys(api) {
    return subtle(api).generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  }

  async function sign(text, key, api) {
    return new Uint8Array(await subtle(api).sign({ name: 'ECDSA', hash: 'SHA-256' }, key, bytes(text)));
  }

  async function verifySignature(text, signature, key, api) {
    return subtle(api).verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, bytes(text));
  }

  // The field serialization follows Mic Gain Logger's prev|fields format.
  function hashInput(previous, fields) {
    checkFields(fields);
    return previous + '|' + fields.join(',');
  }

  function trailerInput(previous, count) {
    if (!Number.isInteger(count) || count < 0) throw new Error('invalidCount');
    return previous + '|rows=' + count;
  }

  async function digest(text, mode, key, api) {
    return mode === 'hmac' ? hmac(text, key, api) : sha256(text, api);
  }

  async function createChain(sample, options = {}) {
    checkHeaders(sample.headers);
    if (!Array.isArray(sample.rows) || sample.rows.length > 100) throw new Error('invalidCount');
    const mode = options.mode || 'sha256';
    if (!['sha256', 'hmac'].includes(mode)) throw new Error('invalidMode');
    const includeHeader = options.includeHeader !== false;
    const hasTrailer = options.hasTrailer !== false;
    const seed = includeHeader ? await sha256(sample.headers.join('\n'), options.api) : FIXED_SEED;
    let previous = seed;
    const rows = [];
    for (const fields of sample.rows) {
      const input = hashInput(previous, fields);
      const hash = await digest(input, mode, options.key, options.api);
      rows.push({ fields: fields.slice(), hash });
      previous = hash;
    }
    const trailer = hasTrailer ? {
      count: rows.length,
      hash: await digest(trailerInput(previous, rows.length), mode, options.key, options.api)
    } : null;
    return { headers: sample.headers.slice(), seed, includeHeader, hasTrailer, mode, rows, trailer };
  }

  async function rechain(chain, options = {}) {
    return createChain({ headers: chain.headers, rows: chain.rows.map(row => row.fields) }, {
      includeHeader: chain.includeHeader, hasTrailer: chain.hasTrailer, mode: chain.mode, ...options
    });
  }

  async function appendRow(chain, fields, options = {}) {
    checkFields(fields);
    return createChain({ headers: chain.headers, rows: [...chain.rows.map(row => row.fields), fields] }, {
      includeHeader: chain.includeHeader, hasTrailer: chain.hasTrailer, mode: chain.mode, ...options
    });
  }

  async function verify(chain, options = {}) {
    checkHeaders(chain.headers);
    let previous = chain.includeHeader ? await sha256(chain.headers.join('\n'), options.api) : FIXED_SEED;
    const rows = [];
    for (let i = 0; i < chain.rows.length; i += 1) {
      const input = hashInput(previous, chain.rows[i].fields);
      const expected = await digest(input, chain.mode, options.key, options.api);
      rows.push({ number: i + 1, input, expected, actual: chain.rows[i].hash, valid: expected === chain.rows[i].hash });
      previous = expected;
    }
    let trailer = { required: chain.hasTrailer, present: !!chain.trailer, valid: null, expected: null, actual: null };
    if (chain.hasTrailer) {
      const expected = await digest(trailerInput(previous, chain.rows.length), chain.mode, options.key, options.api);
      trailer = { ...trailer, expected, actual: chain.trailer ? chain.trailer.hash : null,
        valid: !!chain.trailer && expected === chain.trailer.hash && chain.trailer.count === chain.rows.length };
    }
    const first = rows.find(row => !row.valid);
    return { valid: !first && (!chain.hasTrailer || trailer.valid), firstMismatch: first ? first.number : null,
      expected: first ? first.expected : trailer.expected, actual: first ? first.actual : trailer.actual,
      rows, trailer };
  }

  async function tamper(chain, operation, options = {}) {
    if (!OPERATIONS.includes(operation)) throw new Error('invalidOperation');
    const out = clone(chain);
    const index = options.index === undefined ? 1 : options.index;
    const value = options.value === undefined ? 'CHANGED' : options.value;
    if (operation !== 'header' && operation !== 'truncate' &&
        (!Number.isInteger(index) || index < 0 || index >= out.rows.length)) throw new Error('invalidIndex');
    if (operation === 'header') out.headers[0] = '# kind=changed';
    if (['rewrite', 'rehashOne'].includes(operation)) {
      const column = options.column === undefined ? 0 : options.column;
      if (!Number.isInteger(column) || column < 0 || column > 3) throw new Error('invalidIndex');
      out.rows[index].fields[column] = value;
      checkFields(out.rows[index].fields);
    }
    if (operation === 'delete') out.rows.splice(index, 1);
    if (operation === 'swap') {
      if (index + 1 >= out.rows.length) throw new Error('noNextRow');
      [out.rows[index], out.rows[index + 1]] = [out.rows[index + 1], out.rows[index]];
    }
    if (operation === 'insert') {
      if (out.rows.length >= 100) throw new Error('invalidCount');
      const fields = options.fields || [value, ...out.rows[index].fields.slice(1)];
      checkFields(fields);
      out.rows.splice(index, 0, { fields: fields.slice(), hash: FIXED_SEED });
    }
    if (operation === 'truncate') {
      const count = options.count === undefined ? 2 : options.count;
      if (!Number.isInteger(count) || count < 1 || count > out.rows.length) throw new Error('invalidCount');
      out.rows.splice(out.rows.length - count, count);
    }
    if (operation === 'rehashOne') {
      const previous = index === 0 ? out.seed : out.rows[index - 1].hash;
      out.rows[index].hash = await digest(hashInput(previous, out.rows[index].fields), out.mode, options.key, options.api);
    }
    return out;
  }

  function tip(chain) {
    return chain.rows.length ? chain.rows[chain.rows.length - 1].hash : chain.seed;
  }

  function checkpoint(chain) {
    return { tip: tip(chain), trailer: chain.trailer ? { ...chain.trailer } : null };
  }

  async function experiment(sample, protections = [], role = 'outsider', options = {}) {
    if (!['outsider', 'recorder'].includes(role) || protections.some(p => !PROTECTIONS.includes(p))) {
      throw new Error('invalidExperiment');
    }
    const selected = new Set(protections);
    const api = options.api;
    // Keys stay inside this experiment. The role receives only its own capability.
    const mac = selected.has('hmac') ? await hmacKey(api) : null;
    const signer = selected.has('signature') ? await signingKeys(api) : null;
    const authority = selected.has('timestamp') ? await signingKeys(api) : null;
    const original = await createChain(sample, { ...options, mode: mac ? 'hmac' : 'sha256', key: mac });
    const oldTip = tip(original);
    const held = checkpoint(original);
    const oldSignature = signer ? await sign(oldTip, signer.privateKey, api) : null;
    // The verifier learns the closing deadline independently of the presented log.
    const closeTime = 2;
    const oldStamp = authority ? await sign(oldTip + '|time=' + closeTime, authority.privateKey, api) : null;
    const modified = await tamper(original, options.operation || 'rewrite', {
      index: 1, ...options.mutation, key: mac, api
    });
    const mayRechain = !mac || role === 'recorder';
    const attempted = mayRechain ? await rechain(modified, { key: mac, api }) : modified;
    const newTip = tip(attempted);
    const chainCheck = await verify(attempted, { key: mac, api });
    const checks = [{ kind: 'chain', valid: chainCheck.valid }];
    if (selected.has('checkpoint')) {
      checks.push({ kind: 'checkpoint', valid: JSON.stringify(held) === JSON.stringify(checkpoint(attempted)) });
    }
    if (signer) {
      const presented = role === 'recorder' ? await sign(newTip, signer.privateKey, api) : oldSignature;
      checks.push({ kind: 'signature', valid: await verifySignature(newTip, presented, signer.publicKey, api),
        renewed: role === 'recorder' });
    }
    if (authority) {
      const newTime = 3;
      const newStamp = await sign(newTip + '|time=' + newTime, authority.privateKey, api);
      const oldTokenValid = await verifySignature(newTip + '|time=' + closeTime, oldStamp, authority.publicKey, api);
      const newTokenValid = await verifySignature(newTip + '|time=' + newTime, newStamp, authority.publicKey, api);
      checks.push({ kind: 'timestamp', valid: oldTokenValid || (newTokenValid && newTime <= closeTime),
        oldTokenValid, newTokenValid, closeTime, newTime });
    }
    return { role, protections: [...selected], detected: checks.some(check => !check.valid), checks,
      mayRechain, oldTip, newTip, chainCheck,
      steps: [
        { number: 1, rows: original.rows.length, tip: oldTip },
        { number: 2, time: closeTime, checkpoint: held },
        { number: 3, time: 3, tip: newTip, mayRechain },
        { number: 4, valid: checks.every(check => check.valid) }
      ] };
  }

  async function comparison(sample, selected = [], options = {}) {
    const rows = [];
    for (const protections of [[], ['checkpoint'], ['hmac'], ['signature'], ['timestamp'], selected]) {
      rows.push({ protections: protections.slice(), results: [
        await experiment(sample, protections, 'outsider', options),
        await experiment(sample, protections, 'recorder', options)
      ] });
    }
    return rows;
  }

  return Object.freeze({ FIXED_SEED, OPERATIONS, PROTECTIONS, fieldsValid, sha256, hmacKey, hmac,
    signingKeys, sign, verifySignature, hashInput, trailerInput, createChain, appendRow, rechain,
    verify, tamper, tip, checkpoint, experiment, comparison });
}));
