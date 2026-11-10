import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreSegments,worstWindow,distance,type Segment} from '../services/api/src/modules/routing/scoring.ts';
import {hoursOpen,shopView} from '../services/api/src/modules/shops/index.ts';
const segment:Segment={id:'test',coordinates:[[80.946,26.85],[80.947,26.85]],duration_s:80,distance_m:100,lit:null,quality:0,source_refs:[]};
test('unknown data yields null condition indicator rather than fabricated safety',()=>{
 const r=scoreSegments([segment],new Date('2026-11-10T18:00:00Z'));
 assert.equal(r.indicator,null);assert.equal(r.confidence,0);
});
test('lighting is evaluated at segment traversal time; brighter observed conditions improve indicator',()=>{
 const context=()=>Array.from({length:5},()=>({value:.2,quality:1,reason:'fixture'}));
 const unlit=scoreSegments([{...segment,lit:'no',quality:1}],new Date('2026-11-10T18:00:00Z'),context);
 const lit=scoreSegments([{...segment,lit:'yes',quality:1}],new Date('2026-11-10T18:00:00Z'),context);
 assert.ok(lit.indicator!>unlit.indicator!);
 assert.equal(lit.segments[0].arrival_at,'2026-11-10T18:00:00.000Z');
});
test('shop hours and confirmations have independent freshness and closure precedence',()=>{
 const hours={timezone:'Asia/Kolkata',weekly:Array.from({length:7},(_,i)=>({day:i+1,intervals:[{start:'07:00',end:'22:00'}]})),exceptions:[]};
 assert.equal(hoursOpen(hours,new Date('2026-11-10T12:00:00Z')),true);
 assert.equal(hoursOpen(hours,new Date('2026-11-10T18:00:00Z')),false);
 const shop={id:'x',name:'fixture',location:{lat:0,lon:0},public_phone:null,status:'ACTIVE',verification_level:'PILOT_CHECKED',verified_at:null,hours,confirmed_at:new Date('2026-11-10T12:00:00Z'),confirmation_expires_at:new Date('2026-11-10T12:30:00Z'),closure_until:new Date('2026-11-10T13:00:00Z'),listing_consent_version:'consent-v1',opt_in_alerts:false,agreement_version:null,created_at:new Date()};
 assert.equal(shopView(shop,new Date('2026-11-10T12:10:00Z')).open_status,'CLOSED');
});
test('worst stretch is a contiguous 100 metre window across segment boundaries',()=>{
 const pieces=[0.1,0.9,0.1].map((risk,i)=>{
  const coordinates=[[80.946+i*.0006,26.85],[80.946+(i+1)*.0006,26.85]];
  return {...segment,id:String(i),coordinates,distance_m:distance(coordinates[0],coordinates[1]),duration_s:60,risk,coverage:.8};
 });
 const window=worstWindow(pieces)!;
 const length=window.coordinates.slice(1).reduce((n,p,i)=>n+distance(window.coordinates[i],p),0);
 assert.ok(Math.abs(length-100)<.1);
 assert.ok(window.risk>.5);
 assert.ok(Math.abs(window.coverage-.8)<1e-12);
});
