/* SVG presentation; economic concepts by David Friedman, development by Eric McKee. */
(function () {
  'use strict';
  var W = 1000, H = 560, X0 = 270, X1 = 955, Y0 = 265, HEIGHT = 195;
  function render(svg, result, selected) {
    var cap = Math.max(result.receipts, result.outflows, ...result.payments.map(p => Math.abs(p.amount)));
    // Scale cents as faithfully as thousands; an all-zero graph still needs an axis.
    cap = cap === 0 ? 1 : Math.max(0.02, cap);
    var magnitude = Math.pow(10, Math.floor(Math.log10(cap)));
    cap = Math.ceil(cap / magnitude) * magnitude;
    var cash = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:cap < 10 ? 2 : 0 });
    var y = v => Y0 - v / cap * HEIGHT;
    var x = year => X0 + year / 30 * (X1 - X0);
    // Keep every bar and hit target separate, including at years 0 and 30.
    // Stems retain the real dates instead of suggesting that offsets change time.
    var positions = result.payments.map((p,i) => ({id:p.id, year:p.year, order:i, x:x(p.year)}))
      .sort((a,b) => a.year-b.year || a.order-b.order);
    positions.forEach((p,i) => { p.x = Math.max(X0+14, p.x, i ? positions[i-1].x+28 : 0); });
    for (var i = positions.length-1; i >= 0; i--) positions[i].x = Math.min(positions[i].x, i === positions.length-1 ? X1-14 : positions[i+1].x-28);
    var parts = ['<defs><pattern id="pv-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2 2L2-2M0 7L7 0M5 9L9 5" stroke="#595959" stroke-width="1.5"/></pattern></defs>'];
    function line(a,b,c,d,cls) { parts.push('<line x1="'+a+'" y1="'+b+'" x2="'+c+'" y2="'+d+'" class="'+cls+'"/>'); }
    function text(a,b,t,cls) { parts.push('<text x="'+a+'" y="'+b+'" class="'+cls+'">'+t+'</text>'); }
    text(105,26,'PV stacked at today','graph-title');
    text(600,26,'Payments across time','graph-title');
    for (var v of [-cap,-cap/2,0,cap/2,cap]) {
      line(45,y(v),980,y(v),v === 0 ? 'axis' : 'grid');
      text(248,y(v)-5,cash.format(v),'tick dollar-tick');
    }
    line(X0,45,X0,492,'axis');
    for (var year=0; year<=30; year+=5) {
      line(x(year),480,x(year),487,'axis');
      text(x(year),511,String(year),'tick');
    }
    text(600,545,'Years from today (0 = today)','axis-title');
    var positive=0, negative=0;
    result.payments.forEach(function(p,i) {
      var color = p.amount < 0 ? 'outflow' : 'receipt';
      var bx = positions.find(q => q.id === p.id).x;
      var top = Math.min(y(p.amount),Y0), height = Math.abs(y(p.amount)-Y0);
      var pvtop = Math.min(y(p.pv),Y0), pvheight = Math.abs(y(p.pv)-Y0);
      var start = p.pv >= 0 ? positive : negative, end = start+p.pv;
      if (p.pv >= 0) positive=end; else negative=end;
      var stacktop = Math.min(y(start),y(end));
      parts.push('<g class="'+color+(p.id===selected ? ' selected' : '')+'" data-payment="'+p.id+'">');
      parts.push('<title>Payment '+(i+1)+', year '+p.year+', amount '+p.amount.toFixed(2)+', PV '+p.pv.toFixed(2)+'</title>');
      if (p.pv !== 0) parts.push('<rect x="70" y="'+stacktop+'" width="70" height="'+Math.abs(y(start)-y(end))+'" class="stack"/>');
      if (p.id === selected) line(140,y(end),bx,y(p.pv),'guide');
      line(bx,Math.max(Y0,top+height)+24,bx,467,'date-stem');
      line(bx,467,x(p.year),480,'date-stem');
      if (p.amount === 0) line(bx-8,Y0,bx+8,Y0,'zero-marker');
      else {
        parts.push('<rect x="'+(bx-8)+'" y="'+top+'" width="16" height="'+height+'" class="nominal payment-bar"/>');
        parts.push('<rect x="'+(bx-8)+'" y="'+pvtop+'" width="16" height="'+pvheight+'" class="discounted payment-bar"/>');
      }
      text(bx,p.amount<0 ? top+height+20 : top-10,String(i+1),'payment-label');
      parts.push('<rect x="'+(bx-13)+'" y="'+Math.max(35,top-25)+'" width="26" height="'+Math.max(44,height+50)+'" class="hit-area"/>');
      parts.push('</g>');
    });
    svg.setAttribute('viewBox','0 0 '+W+' '+H);
    svg.innerHTML=parts.join('');
    var summary=result.payments.map((p,i) => 'Payment '+(i+1)+': '+p.amount.toFixed(2)+' dollars at year '+p.year+', present value '+p.pv.toFixed(2)+' dollars.').join(' ');
    document.getElementById('graph-summary').textContent='Bars show face amounts as outlines and present values as hatching. Positive and negative present values stack separately at today. '+summary+' Net present value '+result.net.toFixed(2)+' dollars. The table and formula below provide the same values.';
  }
  function yearAt(svg,clientX) {
    var pt=svg.createSVGPoint(); pt.x=clientX; pt.y=0;
    var local=pt.matrixTransform(svg.getScreenCTM().inverse());
    // Keep fractional, unclamped pointer positions so offset bars drag correctly at both edges.
    return (local.x-X0)/(X1-X0)*30;
  }
  window.PresentValueGraph={render:render,yearAt:yearAt};
})();
