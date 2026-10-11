/* Page controller; economic concepts by David Friedman; development by Eric McKee. */
(function () {
  'use strict';
  var M = window.PresentValueModel, G = window.PresentValueGraph;
  var state = M.initial(), selected = 'p1', nextId = 5, activePrompt = '', drag = null;
  var $ = id => document.getElementById(id);
  var currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  var money = n => currency.format(Math.abs(n) < 0.005 ? 0 : n);
  var descriptions = {
    earlier: ['Move the payment earlier than year 5. Keep its amount and the 10% rate.', 'A positive payment received earlier has a greater present value at a positive rate.'],
    rate: ['Raise the rate above 10%. Keep the $1,000 payment at year 5.', 'A higher discount rate lowers the present value of a future receipt.'],
    zero: ['Set the rate to zero. Keep both payment amounts and dates.', 'At zero interest, every discount factor is 1, so net PV equals the sum of the face amounts: $2,000.00.'],
    cancel: ['Move the outflow from year 5 to year 2. Keep the other payment, both amounts, and the 10% rate.', 'Equal opposite payments on the same date have equal opposite present values, so their net PV is $0.00.']
  };
  function announce(message) { $('live').textContent = message; }
  function error(input, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    $(input.id+'-error').textContent = message;
    $('draft-notice').hidden = !document.querySelector('input[aria-invalid="true"]');
  }
  function clearPrompt() { if (activePrompt) $('prompt-feedback').textContent = 'Not yet checked. '+descriptions[activePrompt][0]; }
  function buildTable(preserve) {
    var drafts = new Map();
    if (preserve !== false) $('payments-body').querySelectorAll('input[aria-invalid="true"]').forEach(input => drafts.set(input.id, { value:input.value, error:$(input.id+'-error').textContent }));
    $('payments-body').innerHTML = state.payments.map((p,i) => '<tr data-id="'+p.id+'">'+
      '<th scope="row"><span class="print-only">Payment '+(i+1)+'</span><button type="button" data-select="'+p.id+'" aria-label="Select payment '+(i+1)+'">Payment '+(i+1)+'</button></th>'+
      '<td><label class="sr-only" for="amount-'+p.id+'">Payment '+(i+1)+' amount in dollars</label><input id="amount-'+p.id+'" data-kind="amount" data-id="'+p.id+'" type="number" min="-10000" max="10000" step="0.01" aria-describedby="amount-'+p.id+'-error"><span class="error" id="amount-'+p.id+'-error"></span></td>'+
      '<td><label class="sr-only" for="year-'+p.id+'">Payment '+(i+1)+' year</label><input id="year-'+p.id+'" data-kind="year" data-id="'+p.id+'" type="number" min="0" max="30" step="1" aria-describedby="year-'+p.id+'-error"><span class="error" id="year-'+p.id+'-error"></span></td>'+
      '<td data-factor="'+p.id+'"></td><td data-pv="'+p.id+'"></td></tr>').join('');
    drafts.forEach(function(draft,id) { var input = $(id); if (input) { input.value = draft.value; error(input,draft.error); } });
  }
  function render() {
    $('draft-notice').hidden = !document.querySelector('input[aria-invalid="true"]');
    var result = M.calculate(state), p = result.payments.find(p => p.id === selected);
    result.payments.forEach(function (p) {
      var row = $('payments-body').querySelector('[data-id="'+p.id+'"]');
      row.classList.toggle('selected-row', p.id === selected);
      row.querySelector('button').setAttribute('aria-pressed',p.id === selected ? 'true':'false');
      for (var kind of ['amount','year']) {
        var input = $(kind+'-'+p.id);
        if (input !== document.activeElement && input.getAttribute('aria-invalid') !== 'true') input.value = p[kind];
      }
      row.querySelector('[data-factor]').textContent = p.factor.toFixed(6);
      row.querySelector('[data-pv]').textContent = money(p.pv);
    });
    if ($('rate-number') !== document.activeElement && $('rate-number').getAttribute('aria-invalid') !== 'true') $('rate-number').value = state.rate;
    $('rate-range').value = state.rate;
    $('receipts').textContent = money(result.receipts);
    $('outflows').textContent = money(result.outflows);
    $('net').textContent = money(result.net);
    $('selection').textContent = 'Payment '+(result.payments.findIndex(q => q.id === selected)+1)+' selected: '+money(p.amount)+' at year '+p.year+'.';
    $('formula').textContent = 'PV = '+money(p.amount)+' ÷ (1 + '+state.rate+' / 100)^'+p.year+' = '+money(p.pv)+'. Discount factor: '+p.factor.toFixed(6)+'.';
    $('earlier').disabled = p.year === 0;
    $('later').disabled = p.year === 30;
    $('remove').disabled = state.payments.length === 1;
    $('add').disabled = state.payments.length === 12;
    G.render($('graph'), result, selected);
  }
  function select(id) { selected = id; render(); announce($('selection').textContent); }
  function updateInput(input) {
    var kind = input.dataset.kind || 'rate', message = M.validate(input.value,kind);
    clearPrompt();
    error(input,message);
    if (message) { announce(message+' The chart keeps the last valid calculation.'); return false; }
    if (kind === 'rate') state.rate = Number(input.value);
    else state.payments.find(p => p.id === input.dataset.id)[kind] = Number(input.value);
    render(); return true;
  }
  function move(year) {
    state.payments.find(p => p.id === selected).year = year;
    var input = $('year-'+selected); error(input,''); input.value = year;
    clearPrompt(); render();
  }
  $('payments-body').addEventListener('click',function(e) { var button = e.target.closest('[data-select]'); if (button) select(button.dataset.select); });
  $('payments-body').addEventListener('input',function(e) { if (e.target.matches('input')) updateInput(e.target); });
  $('payments-body').addEventListener('change',function(e) { if (e.target.matches('input') && updateInput(e.target)) announce('Payment updated. Net present value '+$('net').textContent+'.'); });
  $('rate-number').addEventListener('input',function(e) { updateInput(e.target); });
  $('rate-number').addEventListener('change',function(e) { if (updateInput(e.target)) announce('Rate '+state.rate+' percent. Net present value '+$('net').textContent+'.'); });
  $('rate-range').addEventListener('input',function(e) { state.rate = Number(e.target.value); error($('rate-number'),''); $('rate-number').value = state.rate; clearPrompt(); render(); });
  $('rate-range').addEventListener('change',function() { announce('Rate '+state.rate+' percent. Net present value '+$('net').textContent+'.'); });
  $('earlier').addEventListener('click',function() { move(Math.max(0,state.payments.find(p => p.id === selected).year-1)); if ($('earlier').disabled) $('later').focus(); announce($('selection').textContent); });
  $('later').addEventListener('click',function() { move(Math.min(30,state.payments.find(p => p.id === selected).year+1)); if ($('later').disabled) $('earlier').focus(); announce($('selection').textContent); });
  $('add').addEventListener('click',function() { var p = { id:'p'+nextId++,amount:1000,year:5 }; state.payments.push(p); selected = p.id; clearPrompt(); buildTable(); render(); $('amount-'+p.id).focus(); announce('Payment added. '+$('selection').textContent); });
  $('remove').addEventListener('click',function() { var index = state.payments.findIndex(p => p.id === selected); state.payments.splice(index,1); selected = state.payments[Math.min(index,state.payments.length-1)].id; clearPrompt(); buildTable(); render(); $('payments-body').querySelector('[data-select="'+selected+'"]').focus(); announce('Payment removed. '+$('selection').textContent); });
  function load(newState) { state = newState; selected = 'p1'; nextId = state.payments.length+1; error($('rate-number'),''); buildTable(false); render(); }
  $('reset').addEventListener('click',function() { activePrompt = ''; $('prompt-instruction').textContent = 'Choose a prompt to load its starting example.'; $('prompt-feedback').textContent = ''; $('check-prompt').disabled = true; load(M.initial()); announce('Starting investment restored. Net present value '+$('net').textContent+'.'); });
  document.querySelectorAll('[data-prompt]').forEach(function(button) { button.addEventListener('click',function() {
    activePrompt = button.dataset.prompt; load(M.scenario(activePrompt)); $('prompt-instruction').textContent = descriptions[activePrompt][0]; clearPrompt(); $('check-prompt').disabled = false; $('rate-number').focus(); announce('Prompt loaded. '+descriptions[activePrompt][0]);
  }); });
  $('check-prompt').addEventListener('click',function() {
    var invalid = document.querySelector('input[aria-invalid="true"]');
    if (invalid) { announce('Correct the marked input before checking.'); invalid.focus(); return; }
    var done = M.checkPrompt(activePrompt,state);
    var message = (done ? 'Done. ' : 'Not yet. '+descriptions[activePrompt][0]+' ')+descriptions[activePrompt][1];
    $('prompt-feedback').textContent = message; announce(message);
  });
  var svg = $('graph');
  svg.addEventListener('pointerdown',function(e) {
    if (e.button !== 0 || !e.isPrimary || drag) return;
    var group = e.target.closest('[data-payment]'); if (!group) return;
    selected = group.dataset.payment;
    var p = state.payments.find(p => p.id === selected);
    drag = { id:selected, pointerId:e.pointerId, x:e.clientX, startYear:p.year, startPointerYear:G.yearAt(svg,e.clientX), moved:false };
    svg.setPointerCapture(e.pointerId); render();
  });
  svg.addEventListener('pointermove',function(e) {
    if (!drag || !svg.hasPointerCapture(e.pointerId)) return;
    if (Math.abs(e.clientX-drag.x) < 4 && !drag.moved) return;
    drag.moved = true;
    var year = Math.max(0,Math.min(30,Math.round(drag.startYear+G.yearAt(svg,e.clientX)-drag.startPointerYear)));
    if (year !== state.payments.find(p => p.id === selected).year) move(year);
  });
  function finishDrag(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    var previous = drag; drag = null;
    if (e.type === 'pointercancel' || e.type === 'keydown') move(previous.startYear);
    if (svg.hasPointerCapture(previous.pointerId)) svg.releasePointerCapture(previous.pointerId);
    announce($('selection').textContent);
  }
  svg.addEventListener('pointerup',finishDrag);
  svg.addEventListener('pointercancel',finishDrag);
  svg.addEventListener('lostpointercapture',finishDrag);
  document.addEventListener('keydown',function(e) {
    if (e.key === 'Escape' && drag) { e.preventDefault(); finishDrag({ type:'keydown', pointerId:drag.pointerId }); }
  });
  buildTable(); render();
})();
