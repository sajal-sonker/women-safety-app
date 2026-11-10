import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectValidationThreshold,verifyFreeze,sha256,type PredictionFile} from '../ml/evaluation/freeze.ts';
import type {Recording} from '../ml/evaluation/protocol.ts';
const rows=(['validation','test']as const).map((split,i)=>({id:split,path:'private.wav',sha256:String(i+1).repeat(64),split,class:'SCREAM' as const,negative:false,speaker:'s'+i,session:'session'+i,environment:'env'+i,device:'d'+i,consent_ref:'private-rights',license:'private-license',duration_s:2,language:'hi',noise:'street',events:[{class:'SCREAM' as const,start_s:.1}]}));
const digest=sha256(JSON.stringify(rows));
const prediction=(split:'validation'|'test'):PredictionFile=>({schema_version:1,split,model_sha256:'a'.repeat(64),dataset_sha256:digest,created_at_epoch_ms:Date.now(),freeze_sha256:null,automatic_dispatch:false,recordings:rows.filter(r=>r.split===split).map(r=>({id:r.id,duration_s:r.duration_s,negative:r.negative,language:r.language,noise:r.noise,device:r.device,events:r.events,predictions:[{class:'SCREAM',at_s:1,score:.8}]}))});
test('calibration rejects test data and annotation drift',()=>{
 assert.throws(()=>selectValidationThreshold(rows as Recording[],prediction('test'),digest),/provenance/);
 const drift=prediction('validation');drift.recordings[0].events=[{class:'SCREAM',start_s:.2}];assert.throws(()=>selectValidationThreshold(rows,drift,digest),/Annotation/);
});
test('test scoring is bound to model, dataset and the pre-test frozen artifact',()=>{
 const frozen=selectValidationThreshold(rows,prediction('validation'),digest),raw=JSON.stringify(frozen),p=prediction('test');p.created_at_epoch_ms=frozen.created_at_epoch_ms+1;p.freeze_sha256=sha256(raw);
 assert.equal(verifyFreeze(rows,p,raw,digest).threshold,frozen.threshold);
 assert.throws(()=>verifyFreeze(rows,{...p,model_sha256:'b'.repeat(64)},raw,digest),/freeze/);
 assert.throws(()=>verifyFreeze(rows,{...p,created_at_epoch_ms:frozen.created_at_epoch_ms-1},raw,digest),/freeze/);
 assert.throws(()=>verifyFreeze(rows,p,raw+' ',digest),/freeze/);
});
