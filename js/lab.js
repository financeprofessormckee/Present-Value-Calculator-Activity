/* Optional experiment tools. Pure functions; no storage, network, or DOM access. */
(function(root,factory) {
  if(typeof module==='object' && module.exports) module.exports=factory(require('./model.js'));
  else root.PresentValueLab=factory(root.PresentValueModel);
})(typeof self!=='undefined' ? self : this,function(M) {
  'use strict';
  function copy(state) {
    var error=M.validateState(state); if(error) throw new RangeError(error);
    return {rate:Number(state.rate),payments:state.payments.map(p=>({id:p.id,amount:Number(p.amount),year:Number(p.year)}))};
  }
  function sensitivity(state) {
    var scenario=copy(state), points=[];
    for(var i=0;i<=250;i+=5) {
      scenario.rate=i/10;
      points.push({rate:scenario.rate,net:M.calculate(scenario).net});
    }
    return points;
  }
  function compare(saved,current) {
    var a=M.calculate(saved), b=M.calculate(current);
    return ['nominal','receipts','outflows','net'].map(key=>({key:key,saved:a[key],current:b[key],change:b[key]-a[key]}));
  }
  function csv(state) {
    var result=M.calculate(state);
    var rows=[['Payment','Amount ($)','Year','Annual rate (%)','Discount factor','Present value ($)']];
    result.payments.forEach((p,i)=>rows.push([i+1,p.amount,p.year,Number(state.rate),p.factor,p.pv]));
    rows.push(['Discounted receipts','','','','',result.receipts]);
    rows.push(['Discounted outflows (positive magnitude)','','','','',result.outflows]);
    rows.push(['Net present value','','','','',result.net]);
    return rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
  }
  return {copy:copy,sensitivity:sensitivity,compare:compare,csv:csv};
});
