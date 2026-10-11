/* Proposal 24: economic concepts by David Friedman; development by Eric McKee.
   DOM-free present-value mathematics. Classic script also usable under Node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PresentValueModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LIMITS = { minPayments: 1, maxPayments: 12, amountMax: 10000, yearMax: 30, rateMax: 25 };
  function validate(value, kind) {
    if (typeof value !== 'number' && typeof value !== 'string') return 'Enter a number.';
    if (value === null || value === undefined || String(value).trim() === '' || !Number.isFinite(Number(value))) return 'Enter a number.';
    var n = Number(value);
    if (kind === 'amount') {
      if (Math.abs(n) > LIMITS.amountMax) return 'Use an amount from −10,000 to 10,000 dollars.';
      if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-7) return 'Use whole cents (at most two decimal places).';
    } else if (kind === 'year') {
      if (n < 0 || n > LIMITS.yearMax || !Number.isInteger(n)) return 'Use a whole year from 0 to 30.';
    } else if (kind === 'rate') {
      if (n < 0 || n > LIMITS.rateMax) return 'Use a rate from 0 to 25 percent.';
      if (Math.abs(n * 10 - Math.round(n * 10)) > 1e-7) return 'Use steps of 0.1 percentage point.';
    } else return 'Unknown input type.';
    return '';
  }
  function validateState(state) {
    if (!state || !Array.isArray(state.payments) || state.payments.length < 1 || state.payments.length > 12) return 'Use 1–12 payments.';
    var error = validate(state.rate, 'rate');
    if (error) return error;
    var ids = new Set();
    for (var p of state.payments) {
      if (!p || typeof p.id !== 'string' || !/^p\d+$/.test(p.id) || ids.has(p.id)) return 'Payments need unique IDs.';
      ids.add(p.id);
      error = validate(p.amount, 'amount') || validate(p.year, 'year');
      if (error) return error;
    }
    return '';
  }
  function calculate(state) {
    var error = validateState(state);
    if (error) throw new RangeError(error);
    var receipts = 0, outflows = 0, nominal = 0;
    var payments = state.payments.map(function (p) {
      var factor = 1 / Math.pow(1 + Number(state.rate) / 100, Number(p.year));
      var pv = Number(p.amount) * factor;
      if (pv >= 0) receipts += pv; else outflows -= pv;
      nominal += Number(p.amount);
      return { id: p.id, amount: Number(p.amount), year: Number(p.year), factor: factor, pv: pv };
    });
    return { payments: payments, receipts: receipts, outflows: outflows, net: receipts - outflows, nominal: nominal };
  }
  function make(rate, pairs) {
    return { rate: rate, payments: pairs.map(function (p, i) { return { id: 'p' + (i + 1), amount: p[0], year: p[1] }; }) };
  }
  function initial() { return make(10, [[-2000, 0], [1000, 1], [1000, 2], [1000, 3]]); }
  function scenario(id) {
    if (id === 'earlier' || id === 'rate') return make(10, [[1000, 5]]);
    if (id === 'zero') return make(10, [[1000, 1], [1000, 3]]);
    if (id === 'cancel') return make(10, [[1000, 2], [-1000, 5]]);
    throw new RangeError('Unknown prompt.');
  }
  function checkPrompt(id, state) {
    if (validateState(state)) return false;
    var p = state.payments;
    if (id === 'earlier') return p.length === 1 && p[0].amount === 1000 && p[0].year < 5 && state.rate === 10;
    if (id === 'rate') return p.length === 1 && p[0].amount === 1000 && p[0].year === 5 && state.rate > 10;
    if (id === 'zero') return p.length === 2 && p[0].amount === 1000 && p[0].year === 1 && p[1].amount === 1000 && p[1].year === 3 && state.rate === 0;
    if (id === 'cancel') return p.length === 2 && p[0].amount === 1000 && p[0].year === 2 && p[1].amount === -1000 && p[1].year === 2 && state.rate === 10;
    return false;
  }
  return { LIMITS: LIMITS, validate: validate, validateState: validateState, calculate: calculate, initial: initial, scenario: scenario, checkPrompt: checkPrompt };
});
