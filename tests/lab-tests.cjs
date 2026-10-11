'use strict';
const assert=require('node:assert/strict');
const M=require('../js/model.js'), L=require('../js/lab.js');
let checks=0;
function ok(condition,message) { assert.ok(condition,message); checks++; }
const state=M.initial(), copy=L.copy(state);
copy.payments[0].amount=0;
ok(state.payments[0].amount===-2000,'Snapshots do not alias payments');
const before=JSON.stringify(state), points=L.sensitivity(state);
ok(points.length===51,'Samples cover 0–25% every 0.5 percentage point');
ok(points[0].net===1000,'Zero-rate net equals face sum');
ok(Math.abs(points[20].net-486.85199098422)<1e-9,'Ten-percent sensitivity acceptance');
ok(points.at(-1).net===-48,'Twenty-five-percent acceptance');
ok(JSON.stringify(state)===before,'Sensitivity does not mutate state');
const outflow={rate:10,payments:[{id:'p1',amount:-1000,year:5}]};
const outpoints=L.sensitivity(outflow);
ok(outpoints[0].net<outpoints.at(-1).net,'Higher rates can increase net PV with outflows');
const mixed={rate:10,payments:[{id:'p1',amount:-100,year:0},{id:'p2',amount:230,year:1},{id:'p3',amount:-132,year:2}]};
const mixedpoints=L.sensitivity(mixed);
ok(mixedpoints.some((p,i)=>i>0 && i<mixedpoints.length-1 && p.net>mixedpoints[i-1].net && p.net>mixedpoints[i+1].net),'Mixed-flow net can turn rather than stay monotonic');
const changed=L.copy(state);changed.rate=25;
const comparison=L.compare(state,changed);
ok(comparison.find(r=>r.key==='net').saved.toFixed(2)==='486.85','Original comparison retained');
ok(comparison.find(r=>r.key==='net').current===-48,'New comparison calculated');
ok(comparison.find(r=>r.key==='net').change.toFixed(2)==='-534.85','Current minus saved');
ok(comparison.find(r=>r.key==='nominal').change===0,'Rate-only change preserves face sum');
const csv=L.csv(state), rows=csv.trim().split('\r\n').map(r=>r.split(','));
ok(rows.length===8 && rows[0].length===6,'CSV shape and summary rows');
ok(Number(rows[1][1])===-2000 && Number(rows[1][2])===0,'CSV preserves sign and date');
ok(Number(rows.at(-1).at(-1))===M.calculate(state).net,'CSV retains full-precision total');
ok(Number(rows[2][4])===1/1.1,'CSV retains full-precision factor');
for(const bad of [{rate:26,payments:state.payments},{rate:10,payments:[]}]) {
  for(const fn of [L.copy,L.sensitivity,L.csv]) { assert.throws(()=>fn(bad),RangeError); checks++; }
}
console.log(checks+' experiment-tool checks, 0 failures');
