import {test} from 'node:test';
import assert from 'node:assert/strict';
import {datasetGraduation,validateDataset,wilsonLower,zeroAlarmUpper,type Recording} from '../ml/evaluation/protocol.ts';
test('dataset gate rejects absent rights, duplicated audio and leakage across all split axes',()=>{
 const r:Recording={id:'a',path:'private.wav',sha256:'a'.repeat(64),consent_ref:'private-consent-1',license:'participant-grant',speaker:'s1',session:'session1',environment:'room1',device:'d1',split:'train',duration_s:5,negative:false,class:'HELP'};
 const leaked={...r,id:'b',sha256:'b'.repeat(64),split:'test' as const};assert.ok(validateDataset([r,leaked]).includes('split leakage'));
 assert.ok(validateDataset([r,{...r,id:'b'}]).includes('duplicate recording/checksum'));
 assert.ok(validateDataset([{...r,consent_ref:''}]).includes('missing rights/provenance'));
 const gate=datasetGraduation([r]);assert.equal(gate.status,'BLOCKED_EXTERNAL');assert.equal(gate.automatic_dispatch,false);
});
test('reported statistical bounds cannot turn small or empty evaluation into a passing detector',()=>{
 assert.equal(wilsonLower(0,0),0);assert.ok(wilsonLower(10,10)<.85);assert.ok(wilsonLower(150,150)>.85);assert.ok(zeroAlarmUpper(2)>.1);assert.ok(zeroAlarmUpper(30)<=.1);
});
