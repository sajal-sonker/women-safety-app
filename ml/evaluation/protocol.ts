import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export type Recording={id:string;path:string;sha256:string;consent_ref:string;license:string;speaker:string;session:string;environment:string;device:string;split:'train'|'validation'|'test';duration_s:number;negative:boolean;class:'SCREAM'|'BACHAO'|'HELP'|'NEGATIVE'};
export function validateDataset(rows:Recording[]){
 const failures:string[]=[];const speakers=new Map<string,string>(),sessions=new Map<string,string>(),environments=new Map<string,string>();const ids=new Set<string>(),checksums=new Set<string>();
 for(const r of rows){
  if(!r.id||ids.has(r.id)||checksums.has(r.sha256))failures.push('duplicate recording/checksum');ids.add(r.id);checksums.add(r.sha256);
  if(!r.consent_ref||!r.license||!r.device||!r.speaker||!r.session||!r.environment||!Number.isFinite(r.duration_s)||r.duration_s<=0||!/^[a-f0-9]{64}$/.test(r.sha256))failures.push('missing rights/provenance');
  for(const [map,key] of [[speakers,r.speaker],[sessions,r.session],[environments,r.environment]] as const){if(map.has(key)&&map.get(key)!==r.split)failures.push('split leakage');map.set(key,r.split);}
 }
 return [...new Set(failures)];
}
export function wilsonLower(success:number,total:number){if(!total)return 0;const z=1.95996398454,p=success/total;return (p+z*z/(2*total)-z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total)))/(1+z*z/total);}
export function zeroAlarmUpper(hours:number){if(hours<=0)return Infinity;return -Math.log(.05)/hours;}
export function datasetGraduation(rows:Recording[]){
 const failures=validateDataset(rows),count=(split:string)=>new Set(rows.filter(r=>r.split===split).map(r=>r.speaker)).size;
 if(count('train')<24||count('validation')<6||count('test')<10)failures.push('insufficient speaker support (24/6/10 required)');
 for(const cls of ['SCREAM','BACHAO','HELP'])if(rows.filter(r=>r.split==='test'&&r.class===cls).length<150)failures.push('insufficient held-out '+cls+' events');
 const negatives=rows.filter(r=>r.negative&&r.split==='test'),hours=negatives.reduce((n,r)=>n+r.duration_s,0)/3600;
 if(hours<30)failures.push('less than 30 hours held-out negatives');
 const devices=new Set(negatives.map(r=>r.device));if([...devices].filter(d=>negatives.filter(r=>r.device===d).reduce((n,r)=>n+r.duration_s,0)>=36000).length<2)failures.push('two devices with 10 hours negatives each required');
 if(new Set(rows.filter(r=>r.split==='test').map(r=>r.environment)).size<3)failures.push('less than three held-out acoustic settings');
 return {status:failures.length?'BLOCKED_EXTERNAL':'DATA_READY_ONLY',automatic_dispatch:false,negative_hours:hours,zero_alarm_95pct_upper_per_hour:Number.isFinite(zeroAlarmUpper(hours))?zeroAlarmUpper(hours):null,failures};
}
export async function verifyFiles(rows:Recording[]){for(const row of rows){const bytes=await readFile(row.path);if(createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Dataset checksum mismatch');}}
