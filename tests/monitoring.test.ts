import {test} from 'node:test';
import assert from 'node:assert/strict';
import {datasetGraduation,validateDataset,wilsonLower,zeroAlarmUpper,verifyFiles,type Recording} from '../ml/evaluation/protocol.ts';
import {eventMetrics,poissonUpper,type EventRecording} from '../ml/evaluation/events.ts';
import {expiredBackupName} from '../scripts/backup-retention.ts';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
test('dataset gate rejects absent rights, duplicated audio and leakage across all split axes',()=>{
 const r:Recording={id:'a',path:'private.wav',sha256:'a'.repeat(64),consent_ref:'private-consent-1',license:'participant-grant',speaker:'s1',session:'session1',environment:'room1',device:'d1',split:'train',duration_s:5,negative:false,class:'HELP'};
 const leaked={...r,id:'b',sha256:'b'.repeat(64),split:'test' as const};assert.ok(validateDataset([r,leaked]).includes('split leakage'));
 assert.ok(validateDataset([r,{...r,id:'b'}]).includes('duplicate recording/checksum'));
 assert.ok(validateDataset([{...r,consent_ref:''}]).includes('missing rights/provenance'));
 const gate=datasetGraduation([r]);assert.equal(gate.status,'BLOCKED_EXTERNAL');assert.equal(gate.automatic_dispatch,false);
});
test('event scoring counts episodes once, rejects cross-class matches and reports misses',()=>{
 const r:EventRecording={id:'r',duration_s:300,negative:false,language:'hi',noise:'street',device:'d1',events:[{class:'BACHAO',start_s:20},{class:'HELP',start_s:100}],predictions:[{class:'BACHAO',at_s:21,score:.8},{class:'BACHAO',at_s:22,score:.9},{class:'SCREAM',at_s:101,score:.9}]};
 const m=eventMetrics([r],.7);assert.equal(m.per_class.BACHAO.tp,1);assert.equal(m.per_class.HELP.fn,1);assert.equal(m.per_class.SCREAM.fp,1);assert.equal(m.per_class.BACHAO.detection_delay_p50_s,1);assert.equal(m.confusion.HELP.SCREAM,1);assert.equal(m.automatic_dispatch,false);
});
test('negative exposure reports false alarms before cooldown and a conservative nonzero Poisson bound',()=>{
 const m=eventMetrics([{id:'neg',duration_s:3600,negative:true,language:'mixed',noise:'traffic',device:'d1',events:[],predictions:[{class:'SCREAM',at_s:20,score:.9},{class:'SCREAM',at_s:50,score:.9}]}],.7);
 assert.equal(m.false_episodes_before_cooldown,2);assert.equal(m.false_episodes_after_cooldown,1);assert.ok(poissonUpper(0,30)<=.1);assert.ok(Math.abs(poissonUpper(1,1)-4.7438645)<1e-5);assert.ok(m.false_alarm_95pct_upper_per_hour!>2);
 assert.throws(()=>eventMetrics([{id:'bad',duration_s:1,negative:true,language:'hi',noise:'street',device:'d',events:[{class:'HELP',start_s:0}],predictions:[]}],.5));
});
test('reported statistical bounds cannot turn small or empty evaluation into a passing detector',()=>{
 assert.equal(wilsonLower(0,0),0);assert.ok(wilsonLower(10,10)<.85);assert.ok(wilsonLower(150,150)>.85);assert.ok(zeroAlarmUpper(2)>.1);assert.ok(zeroAlarmUpper(30)<=.1);
});
test('backup pruning recognizes only generated archive names at the 30-day boundary',()=>{
 const name='2026-10-01T12-00-00-000Z.dump.enc';assert.equal(expiredBackupName(name,new Date('2026-10-31T11:59:59Z')),false);assert.equal(expiredBackupName(name,new Date('2026-10-31T12:00:00Z')),true);
 for(const invalid of ['../'+name,'private.dump.enc','2026-02-31T00-00-00-000Z.dump.enc','2026-12-01T12-00-00-000Z.dump.enc'])assert.equal(expiredBackupName(invalid,new Date('2026-11-10T12:00:00Z')),false);
});
test('evaluation verifies actual PCM exposure rather than trusting declared hours',async()=>{
 await mkdir('.local/reports',{recursive:true});const path='.local/reports/pcm-exposure-'+randomUUID()+'.wav';const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(356,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(16000,24);h.writeUInt32LE(32000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(320,40);const bytes=Buffer.concat([h,Buffer.alloc(320)]);
 const row:Recording={id:'generated',path,sha256:createHash('sha256').update(bytes).digest('hex'),consent_ref:'generated',license:'generated',speaker:'s',session:'s',environment:'e',device:'generated',split:'test',duration_s:.01,negative:true,class:'NEGATIVE'};
 await writeFile(path,bytes);try{await verifyFiles([row]);await assert.rejects(verifyFiles([{...row,duration_s:3600}]),/duration mismatch/);}finally{await unlink(path);}
});
