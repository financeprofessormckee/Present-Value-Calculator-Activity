/* Page controller; economic concepts by David Friedman; development by Eric McKee. */
(function () {
  'use strict';
  var M = window.PresentValueModel, G = window.PresentValueGraph;
  var state = M.initial(), selected = 'p1', nextId = 5, activePrompt = '', drag = null;
  var Lab = window.PresentValueLab, undoStack = [], redoStack = [], lastEditKey = '';
  var comparison = null, fullTimeline = false, lockedCap = null;
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
  function snapshot() { return {state:Lab.copy(state), selected:selected, prompt:activePrompt}; }
  function remember(key) {
    if (!key || key !== lastEditKey) { undoStack.push(snapshot()); if (undoStack.length > 100) undoStack.shift(); }
    lastEditKey = key || ''; redoStack = [];
  }
  function syncPrompt() {
    $('prompt-instruction').textContent = activePrompt ? descriptions[activePrompt][0] : 'Choose a prompt to load its starting example.';
    $('check-prompt').disabled = !activePrompt;
    $('prediction').hidden = !activePrompt;
    var predictions = {earlier:'Predict: will the payment’s present value rise, fall, or stay the same?',rate:'Predict: what will happen to today’s value when the discount rate rises?',zero:'Predict: when the rate is zero, does timing still change present value?',cancel:'Predict: why do equal opposite payments on different dates fail to cancel?'};
    $('prediction').textContent = predictions[activePrompt] || '';
    document.querySelectorAll('[data-prompt]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.prompt === activePrompt)));
  }
  function restoreSnapshot(saved) {
    state = Lab.copy(saved.state); selected = saved.selected; activePrompt = saved.prompt;
    nextId = Math.max(...state.payments.map(p => Number(p.id.slice(1)))) + 1;
    lastEditKey = ''; error($('rate-number'),''); buildTable(false); syncPrompt();
    $('prompt-feedback').textContent = ''; clearPrompt(); render();
  }
  function requireValid() {
    var invalid = document.querySelector('input[aria-invalid="true"]');
    if (invalid) { invalid.focus(); announce('Correct the marked input first. The results still use its last valid value.'); return false; }
    return true;
  }
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
    var horizon = fullTimeline ? 30 : Math.min(30,Math.max(5,Math.ceil((Math.max(...state.payments.map(q=>q.year))+1)/5)*5));
    G.render($('graph'), result, selected, {yearMax:drag ? drag.horizon : horizon,minimumCap:lockedCap});
    if (lockedCap !== null) lockedCap = Number($('graph').dataset.cap);
    $('scale-note').textContent = (lockedCap === null ? 'Dollar scale adjusts automatically: ' : 'Dollar scale held (expands if needed): ') + '−'+money(Number($('graph').dataset.cap))+' to '+money(Number($('graph').dataset.cap))+'. Timeline: 0–'+$('graph').dataset.yearMax+' years.';
    $('discount-note').textContent = p.year === 0 ? 'This payment happens today, so its discount factor is 1 at any rate.' : (state.rate === 0 ? 'At a zero rate, timing does not change value: each dollar is still worth one dollar today.' : 'Each dollar '+(p.amount < 0 ? 'paid' : 'received')+' in year '+p.year+' is worth '+(p.factor*100).toFixed(1)+' cents today. '+(p.amount < 0 ? 'Moving an outflow later makes its present value less negative.' : 'Moving a receipt earlier increases its present value.'));
    $('undo').disabled = undoStack.length === 0;
    $('redo').disabled = redoStack.length === 0;
    syncPrompt(); renderComparison();
    if (document.querySelector('.sensitivity-panel').open) renderSensitivity();
  }
  function select(id) { selected = id; render(); announce($('selection').textContent); }
  function updateInput(input) {
    var kind = input.dataset.kind || 'rate', message = M.validate(input.value,kind);
    clearPrompt();
    error(input,message);
    if (message) { announce(message+' The chart keeps the last valid calculation.'); return false; }
    var previous = kind === 'rate' ? state.rate : state.payments.find(p => p.id === input.dataset.id)[kind];
    if (previous !== Number(input.value)) remember(input.id);
    if (kind === 'rate') state.rate = Number(input.value);
    else state.payments.find(p => p.id === input.dataset.id)[kind] = Number(input.value);
    render(); return true;
  }
  function move(year) {
    if (state.payments.find(p => p.id === selected).year !== year && !drag) remember();
    state.payments.find(p => p.id === selected).year = year;
    var input = $('year-'+selected); error(input,''); input.value = year;
    clearPrompt(); render();
  }
  $('payments-body').addEventListener('click',function(e) { var button = e.target.closest('[data-select]'); if (button) select(button.dataset.select); });
  $('payments-body').addEventListener('input',function(e) { if (e.target.matches('input')) updateInput(e.target); });
  $('payments-body').addEventListener('change',function(e) { if (e.target.matches('input') && updateInput(e.target)) announce('Payment updated. Net present value '+$('net').textContent+'.'); });
  $('rate-number').addEventListener('input',function(e) { updateInput(e.target); });
  $('rate-number').addEventListener('change',function(e) { if (updateInput(e.target)) announce('Rate '+state.rate+' percent. Net present value '+$('net').textContent+'.'); });
  $('rate-range').addEventListener('input',function(e) { if (state.rate !== Number(e.target.value)) remember('rate-range'); state.rate = Number(e.target.value); error($('rate-number'),''); $('rate-number').value = state.rate; clearPrompt(); render(); });
  $('rate-range').addEventListener('change',function() { announce('Rate '+state.rate+' percent. Net present value '+$('net').textContent+'.'); });
  $('earlier').addEventListener('click',function() { move(Math.max(0,state.payments.find(p => p.id === selected).year-1)); if ($('earlier').disabled) $('later').focus(); announce($('selection').textContent); });
  $('later').addEventListener('click',function() { move(Math.min(30,state.payments.find(p => p.id === selected).year+1)); if ($('later').disabled) $('earlier').focus(); announce($('selection').textContent); });
  $('add').addEventListener('click',function() { remember(); var p = { id:'p'+nextId++,amount:1000,year:5 }; state.payments.push(p); selected = p.id; clearPrompt(); buildTable(); render(); $('amount-'+p.id).focus(); announce('Payment added. '+$('selection').textContent); });
  $('remove').addEventListener('click',function() { remember(); var index = state.payments.findIndex(p => p.id === selected); state.payments.splice(index,1); selected = state.payments[Math.min(index,state.payments.length-1)].id; clearPrompt(); buildTable(); render(); $('payments-body').querySelector('[data-select="'+selected+'"]').focus(); announce('Payment removed. '+$('selection').textContent); });
  function load(newState) { state = newState; selected = state.payments[0].id; nextId = Math.max(...state.payments.map(p => Number(p.id.slice(1))))+1; error($('rate-number'),''); buildTable(false); render(); }
  $('reset').addEventListener('click',function() { remember(); activePrompt = ''; $('prompt-instruction').textContent = 'Choose a prompt to load its starting example.'; $('prompt-feedback').textContent = ''; $('check-prompt').disabled = true; load(M.initial()); announce('Starting investment restored. Net present value '+$('net').textContent+'.'); });
  document.querySelectorAll('[data-prompt]').forEach(function(button) { button.addEventListener('click',function() {
    remember(); activePrompt = button.dataset.prompt; load(M.scenario(activePrompt)); $('prompt-instruction').textContent = descriptions[activePrompt][0]; clearPrompt(); $('check-prompt').disabled = false; $('rate-number').focus(); announce('Prompt loaded. '+descriptions[activePrompt][0]);
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
    drag = { id:selected, pointerId:e.pointerId, x:e.clientX, startYear:p.year, startPointerYear:G.yearAt(svg,e.clientX), horizon:Number(svg.dataset.yearMax), before:snapshot(), moved:false };
    svg.setPointerCapture(e.pointerId); render();
  });
  svg.addEventListener('pointermove',function(e) {
    if (!drag || !svg.hasPointerCapture(e.pointerId)) return;
    if (Math.abs(e.clientX-drag.x) < 4 && !drag.moved) return;
    drag.moved = true;
    var year = Math.max(0,Math.min(drag.horizon,Math.round(drag.startYear+G.yearAt(svg,e.clientX)-drag.startPointerYear)));
    if (year !== state.payments.find(p => p.id === selected).year) move(year);
  });
  function finishDrag(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    var previous = drag;
    if (e.type === 'pointercancel' || e.type === 'keydown') move(previous.startYear);
    else if (state.payments.find(p => p.id === selected).year !== previous.startYear) {
      undoStack.push(previous.before); if (undoStack.length > 100) undoStack.shift(); redoStack = []; lastEditKey = '';
    }
    drag = null; render();
    if (svg.hasPointerCapture(previous.pointerId)) svg.releasePointerCapture(previous.pointerId);
    announce($('selection').textContent);
  }
  svg.addEventListener('pointerup',finishDrag);
  svg.addEventListener('pointercancel',finishDrag);
  svg.addEventListener('lostpointercapture',finishDrag);
  document.addEventListener('keydown',function(e) {
    if (e.key === 'Escape' && drag) { e.preventDefault(); finishDrag({ type:'keydown', pointerId:drag.pointerId }); }
  });
  document.addEventListener('change',function(e) { if (e.target.matches('input')) lastEditKey = ''; });
  $('undo').addEventListener('click',function() {
    if (!undoStack.length || !requireValid()) return;
    redoStack.push(snapshot()); restoreSnapshot(undoStack.pop());
    if ($('undo').disabled && !$('redo').disabled) $('redo').focus();
    announce('Previous experiment restored. Net present value '+$('net').textContent+'.');
  });
  $('redo').addEventListener('click',function() {
    if (!redoStack.length || !requireValid()) return;
    undoStack.push(snapshot()); restoreSnapshot(redoStack.pop());
    if ($('redo').disabled && !$('undo').disabled) $('undo').focus();
    announce('Edit reapplied. Net present value '+$('net').textContent+'.');
  });
  $('edit-selected').addEventListener('click',function() { $('amount-'+selected).focus(); });
  $('fit-timeline').addEventListener('click',function() { fullTimeline=false; updateView(); });
  $('full-timeline').addEventListener('click',function() { fullTimeline=true; updateView(); });
  function updateView() {
    $('fit-timeline').setAttribute('aria-pressed',String(!fullTimeline));
    $('full-timeline').setAttribute('aria-pressed',String(fullTimeline)); render();
  }
  $('lock-scale').addEventListener('change',function(e) { lockedCap=e.target.checked ? Number($('graph').dataset.cap) : null; render(); });
  $('save-comparison').addEventListener('click',function() {
    if (!requireValid()) return;
    comparison=Lab.copy(state); renderComparison(); announce('Comparison saved for this page. Change a payment or rate to compare the results.');
  });
  $('restore-comparison').addEventListener('click',function() {
    if (!comparison || !requireValid()) return;
    remember(); activePrompt=''; $('prompt-feedback').textContent=''; load(Lab.copy(comparison));
    announce('Saved comparison restored. Net present value '+$('net').textContent+'.');
  });
  $('clear-comparison').addEventListener('click',function() { comparison=null; renderComparison(); $('save-comparison').focus(); announce('Comparison cleared. Current payments are unchanged.'); });
  function renderComparison() {
    $('comparison').hidden=!comparison; if (!comparison) return;
    var labels={nominal:'Sum of face amounts',receipts:'Discounted receipts',outflows:'Discounted outflows',net:'Net present value'};
    $('comparison-body').innerHTML=Lab.compare(comparison,state).map(row=>'<tr><th scope="row">'+labels[row.key]+'</th><td>'+money(row.saved)+'</td><td>'+money(row.current)+'</td><td>'+money(row.change)+'</td></tr>').join('');
    $('comparison-summary').textContent='Saved: '+comparison.payments.length+' payment(s) at '+comparison.rate+'%. Current: '+state.payments.length+' payment(s) at '+state.rate+'%. Change means current minus saved.';
    $('saved-schedule').textContent=comparison.payments.map((p,i)=>'Payment '+(i+1)+': '+money(p.amount)+' at year '+p.year+'.').join(' ');
  }
  function renderSensitivity() {
    var points=Lab.sensitivity(state), values=points.map(p=>p.net), min=Math.min(0,...values), max=Math.max(0,...values);
    var spread=max-min || 1; min-=spread*0.12; max+=spread*0.12;
    var x=rate=>100+rate/25*580, y=value=>200-(value-min)/(max-min)*160;
    var parts=[];
    for (var i=0;i<=4;i++) {
      var value=min+(max-min)*i/4, height=y(value);
      parts.push('<line x1="100" x2="680" y1="'+height+'" y2="'+height+'" class="axis"/><text x="90" y="'+(height+5)+'" text-anchor="end">'+money(value)+'</text>');
    }
    for (var rate=0;rate<=25;rate+=5) parts.push('<text x="'+x(rate)+'" y="225" text-anchor="middle">'+rate+'%</text>');
    parts.push('<path class="curve" d="'+points.map((p,i)=>(i?'L':'M')+x(p.rate)+','+y(p.net)).join(' ')+'"/>');
    var current=M.calculate(state).net;
    parts.push('<line class="current-guide" x1="'+x(state.rate)+'" x2="'+x(state.rate)+'" y1="35" y2="200"/><circle class="current" cx="'+x(state.rate)+'" cy="'+y(current)+'" r="5"/><text x="390" y="255" text-anchor="middle">Effective annual interest rate</text>');
    $('sensitivity').setAttribute('viewBox','0 0 720 270'); $('sensitivity').innerHTML=parts.join('');
    $('sensitivity-summary').textContent='The circle marks the current rate: '+state.rate+'%, with net PV '+money(current)+'. Curve sampled every 0.5 percentage point; the current marker uses the exact selected rate. This is the net of all receipts and outflows.';
    var rates=Array.from(new Set([0,5,10,15,20,25,state.rate])).sort((a,b)=>a-b);
    $('sensitivity-body').innerHTML=rates.map(rate=>{var changed=Lab.copy(state); changed.rate=rate; var value=M.calculate(changed).net; return '<tr><th scope="row">'+rate+'%'+(rate===state.rate?' (current)':'')+'</th><td>'+money(value)+'</td><td>'+money(value-current)+'</td></tr>';}).join('');
  }
  document.querySelector('.sensitivity-panel').addEventListener('toggle',function(e) { if(e.target.open) renderSensitivity(); });
  $('export').addEventListener('click',function() {
    if (!requireValid()) return;
    var url=URL.createObjectURL(new Blob([Lab.csv(state)],{type:'text/csv;charset=utf-8'}));
    var link=document.createElement('a'); link.href=url; link.download='present-value-experiment.csv'; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); },1000); announce('CSV exported with unrounded calculation values.');
  });
  $('print').addEventListener('click',function() { if(requireValid()) window.print(); });
  buildTable(); render();
})();
