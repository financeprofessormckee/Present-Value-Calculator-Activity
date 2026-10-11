'use strict';
const M = require('../js/model.js');
let checks = 0;
function ok(condition, message) { checks++; if (!condition) throw new Error(message); }
function close(a,b,message) { ok(Math.abs(a-b) < 1e-9, message + ': '+a+' vs '+b); }
const single = (amount, year, rate) => ({ rate, payments:[{id:'p1',amount,year}] });
const value = (amount,year,rate) => M.calculate(single(amount,year,rate)).net;
close(value(1000,1,10),1000/1.1,'One year');
ok(value(1000,1,10).toFixed(2)==='909.09','Currency display');
const three = {rate:10,payments:[1,2,3].map((year,i)=>({id:'p'+(i+1),amount:1000,year}))};
ok(M.calculate(three).net.toFixed(2)==='2486.85','Three receipts');
ok(M.calculate(M.initial()).net.toFixed(2)==='486.85','Initial investment');
close(value(-1000,1,10),-1000/1.1,'Outflow');
close(value(1000,0,25),1000,'Today');
close(value(0,30,25),0,'Zero flow');
close(value(1234.56,30,0),1234.56,'Zero rate');
const cancellation = M.scenario('cancel'); cancellation.payments[1].year=2;
close(M.calculate(cancellation).net,0,'Coincident signed cancellation');
ok(M.calculate(cancellation).receipts>0 && M.calculate(cancellation).outflows>0,'Separate signed totals');
const pennies = {rate:10,payments:Array.from({length:12},(_,i)=>({id:'p'+i,amount:0.01,year:1}))};
close(M.calculate(pennies).net,0.12/1.1,'No intermediate rounding');
ok(M.calculate(pennies).net.toFixed(2)==='0.11','Rounding only at display');
for (const [kind,invalids] of Object.entries({amount:['',null,undefined,Infinity,NaN,10000.01,-10000.01,1.001],year:['',-1,31,1.5,Infinity],rate:['',-0.1,25.1,0.05,Infinity]})) {
  for(const v of invalids) ok(Boolean(M.validate(v,kind)),kind+' rejects '+v);
}
for(const [kind,vals] of Object.entries({amount:[-10000,10000,0,0.01,-0.01],year:[0,30],rate:[0,25,0.1,10.1]})) for(const v of vals) ok(!M.validate(v,kind),'Valid '+kind+' '+v);
ok(Boolean(M.validateState({rate:10,payments:[]})),'No payments rejected');
ok(Boolean(M.validateState({rate:10,payments:[...pennies.payments,{id:'p12',amount:0,year:0}]})),'13 rejected');
ok(Boolean(M.validateState({rate:10,payments:[{id:'p1',amount:1,year:0},{id:'p1',amount:1,year:1}]})),'Duplicate ids rejected');
for (const state of [{rate:-1,payments:three.payments},single(10001,1,10),single(1000,1.5,10)]) {
  let rejected=false; try { M.calculate(state); } catch(e) { rejected=e instanceof RangeError; } ok(rejected,'Calculate guards input');
}
for(let year=0;year<=30;year++) for(let rate=0;rate<=250;rate+=5) {
  const r=rate/10;
  close(value(10000,year,r),10000/Math.pow(1+r/100,year),'Boundary calculation');
  close(value(-10000,year,r),-value(10000,year,r),'Sign symmetry');
  if(year<30) ok(value(1000,year+1,r)<=value(1000,year,r)+1e-9,'Later does not increase receipt PV');
  if(r<25) ok(value(1000,year,r+0.1)<=value(1000,year,r)+1e-9,'Higher rate does not increase receipt PV');
}
let seed=42;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let trial=0;trial<1000;trial++) {
  const state={rate:Math.floor(random()*251)/10,payments:Array.from({length:1+Math.floor(random()*12)},(_,i)=>({id:'p'+i,amount:(Math.floor(random()*2000001)-1000000)/100,year:Math.floor(random()*31)}))};
  const result=M.calculate(state);
  const expected=state.payments.reduce((sum,p)=>sum+p.amount/Math.pow(1+state.rate/100,p.year),0);
  ok(Math.abs(result.net-expected)<1e-8,'Random signed sum');
  ok(result.receipts>=0 && result.outflows>=0,'Positive aggregate magnitudes');
}
for(const id of ['earlier','rate','zero','cancel']) {
  const state=M.scenario(id); ok(!M.checkPrompt(id,state),'Starts incomplete '+id);
  if(id==='earlier') state.payments[0].year=4;
  if(id==='rate') state.rate=10.1;
  if(id==='zero') state.rate=0;
  if(id==='cancel') state.payments[1].year=2;
  ok(M.checkPrompt(id,state),'Completes '+id);
  state.payments[0].amount=1000.01;
  ok(!M.checkPrompt(id,state),'Rejects wrong amount '+id);
}
const a=M.initial(); a.payments[0].amount=7; ok(M.initial().payments[0].amount===-2000,'Fresh defaults');
console.log(checks+' model checks, 0 failures');
for (const kind of ['amount','year','rate']) for (const value of [true,false,[],[1],{}]) {
  if (!M.validate(value,kind)) throw new Error('Reject nonnumeric type: '+kind);
}
console.log('15 additional input-type checks, 0 failures');
