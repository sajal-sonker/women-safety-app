import {createHash} from 'node:crypto';
import {eventMetrics,type EventRecording} from './events.ts';
import {validateDataset,type Recording} from './protocol.ts';
export type PredictionFile={schema_version:1;split:'validation'|'test';model_sha256:string;dataset_sha256:string;created_at_epoch_ms:number;freeze_sha256:string|null;recordings:EventRecording[];automatic_dispatch:false};
export const sha256=(raw:string|Buffer)=>createHash('sha256').update(raw).digest('hex');
export function checkPredictionCoverage(rows:Recording[],file:PredictionFile,split:'validation'|'test',datasetHash:string){
 if(validateDataset(rows).length)throw Error('Invalid dataset provenance/splits');
 if(file.schema_version!==1||file.split!==split||file.dataset_sha256!==datasetHash||!/^[a-f0-9]{64}$/.test(file.model_sha256)||file.automatic_dispatch!==false||!Number.isFinite(file.created_at_epoch_ms))throw Error('Prediction provenance mismatch');
 const expected=rows.filter(r=>r.split===split),seen=new Set<string>();
 if(!expected.length||file.recordings.length!==expected.length)throw Error('Predictions must cover the exact nonempty requested split');
 for(const r of file.recordings){const row=expected.find(e=>e.id===r.id) as (Recording&{events?:unknown;language?:string;noise?:string})|undefined;
  if(!row||seen.has(r.id)||Math.abs(row.duration_s-r.duration_s)>.01||row.negative!==r.negative||row.device!==r.device||row.language!==r.language||row.noise!==r.noise||JSON.stringify(row.events)!==JSON.stringify(r.events))throw Error('Annotation/provenance changed between manifest and predictions');
  if(!Array.isArray(r.events)||(r.negative?r.events.length!==0:!r.events.length||r.events.some(e=>e.class!==row.class)))throw Error('Annotations must match the labelled recording');seen.add(r.id);
 }
}
export function selectValidationThreshold(rows:Recording[],file:PredictionFile,datasetHash:string){
 checkPredictionCoverage(rows,file,'validation',datasetHash);
 if(file.created_at_epoch_ms>Date.now())throw Error('Validation predictions are dated in the future');
 const candidates=Array.from({length:19},(_,i)=>(i+1)/20).map(threshold=>{
  const metrics=eventMetrics(file.recordings,threshold),counts=Object.values(metrics.per_class).reduce((a,c)=>({tp:a.tp+c.tp,fp:a.fp+c.fp,fn:a.fn+c.fn}),{tp:0,fp:0,fn:0});
  const precision=counts.tp+counts.fp?counts.tp/(counts.tp+counts.fp):0,recall=counts.tp+counts.fn?counts.tp/(counts.tp+counts.fn):0;
  return {threshold,precision,recall,f1:2*counts.tp/(2*counts.tp+counts.fp+counts.fn||1)};
 });
 // Prefer recall subject to validation precision>=.90; otherwise mark the candidate uncalibrated.
 const eligible=candidates.filter(c=>c.precision>=.9),ranked=(eligible.length?eligible:candidates).sort((a,b)=>eligible.length?b.recall-a.recall||b.precision-a.precision||b.threshold-a.threshold:b.f1-a.f1||b.threshold-a.threshold);
 return {schema_version:1 as const,source_split:'validation' as const,model_sha256:file.model_sha256,dataset_sha256:datasetHash,created_at_epoch_ms:Date.now(),threshold:ranked[0].threshold,validation_ids:file.recordings.map(r=>r.id).sort(),selection_rule:'RECALL_SUBJECT_TO_PRECISION_0.90_OTHERWISE_BEST_F1',calibration_status:eligible.length?'VALIDATION_CANDIDATE_ONLY':'VALIDATION_PRECISION_TARGET_NOT_MET',validation_candidates:candidates,automatic_dispatch:false};
}
export function verifyFreeze(rows:Recording[],file:PredictionFile,raw:string,datasetHash:string){
 checkPredictionCoverage(rows,file,'test',datasetHash);const freeze=JSON.parse(raw);
 if(freeze.schema_version!==1||freeze.source_split!=='validation'||freeze.model_sha256!==file.model_sha256||freeze.dataset_sha256!==datasetHash||file.freeze_sha256!==sha256(raw)||!Number.isFinite(freeze.created_at_epoch_ms)||freeze.created_at_epoch_ms>file.created_at_epoch_ms||freeze.automatic_dispatch!==false||!Number.isFinite(freeze.threshold)||freeze.threshold<=0||freeze.threshold>1)throw Error('Valid pre-test model/dataset threshold freeze required');
 if(JSON.stringify(freeze.validation_ids)!==JSON.stringify(rows.filter(r=>r.split==='validation').map(r=>r.id).sort()))throw Error('Frozen validation split mismatch');
 return freeze;
}
