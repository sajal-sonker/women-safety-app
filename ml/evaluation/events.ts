import {wilsonLower} from './protocol.ts';
export type EventClass='SCREAM'|'HELP'|'BACHAO';
export type AnnotatedEvent={class:EventClass;start_s:number};
export type Prediction={class:EventClass;at_s:number;score:number};
export type EventRecording={id:string;duration_s:number;negative:boolean;language:string;device:string;noise:string;events:AnnotatedEvent[];predictions:Prediction[]};
export function poissonUpper(alarms:number,hours:number){
 if(!Number.isInteger(alarms)||alarms<0||!Number.isFinite(hours)||hours<=0||alarms>100000)throw Error('Invalid exposure/count');
 let lo=0,hi=Math.max(4,alarms*2+20);
 const cdf=(mu:number)=>{let logTerm=-mu,logSum=-mu;for(let i=1;i<=alarms;i++){logTerm+=Math.log(mu)-Math.log(i);const max=Math.max(logSum,logTerm);logSum=max+Math.log(Math.exp(logSum-max)+Math.exp(logTerm-max));}return Math.exp(logSum);};
 while(cdf(hi)>.05)hi*=2;
 for(let n=0;n<70;n++){const mid=(lo+hi)/2;if(cdf(mid)>.05)lo=mid;else hi=mid;}
 return hi/hours;
}
export function episodes(predictions:Prediction[],threshold:number,cooldown=0){
 const rows=predictions.filter(p=>p.score>=threshold).sort((a,b)=>a.at_s-b.at_s),result:Prediction[]=[];let groupEnd=-Infinity,lastAccepted=-Infinity;
 for(const p of rows){if(p.at_s-groupEnd<=10){groupEnd=p.at_s;continue;}groupEnd=p.at_s;if(p.at_s-lastAccepted<cooldown)continue;result.push(p);lastAccepted=p.at_s;}
 return result;
}
export function eventMetrics(recordings:EventRecording[],threshold:number){
 if(!Number.isFinite(threshold)||threshold<=0||threshold>1)throw Error('Invalid frozen threshold');
 const summary=()=>({tp:0,fp:0,fn:0,delays_s:[] as number[]});
 const byClass=Object.fromEntries((['SCREAM','HELP','BACHAO']as EventClass[]).map(c=>[c,summary()]));
 const groups:Record<string,ReturnType<typeof summary>>={};let negatives=0,falseBefore=0,falseAfter=0;
 const confusion:Record<string,Record<string,number>>={};
 const recordConfusion=(truth:string,predicted:string)=>{const row=confusion[truth]??={};row[predicted]=(row[predicted]??0)+1;};
 const ids=new Set<string>();
 for(const r of recordings){
  if(ids.has(r.id)||!r.id||!Number.isFinite(r.duration_s)||r.duration_s<=0||!r.device||!r.language||!r.noise)throw Error('Invalid recording provenance');ids.add(r.id);
  if(r.negative&&r.events.length)throw Error('Negative recording cannot contain positive annotations');
  for(const e of r.events)if(!(e.class in byClass)||!Number.isFinite(e.start_s)||e.start_s<0||e.start_s>=r.duration_s)throw Error('Invalid annotation');
  for(const p of r.predictions)if(!(p.class in byClass)||!Number.isFinite(p.at_s)||p.at_s<0||p.at_s>r.duration_s||!Number.isFinite(p.score)||p.score<0||p.score>1)throw Error('Invalid prediction');
  const predicted=episodes(r.predictions,threshold),matched=new Set<number>(),key=[r.language,r.device,r.noise].join('/'),g=groups[key]??=summary();
  if(r.negative){negatives+=r.duration_s/3600;falseBefore+=predicted.length;falseAfter+=episodes(r.predictions,threshold,120).length;}
  for(const p of predicted){const index=r.events.findIndex((e,i)=>!matched.has(i)&&e.class===p.class&&p.at_s>=e.start_s&&p.at_s-e.start_s<=5);if(index<0){byClass[p.class].fp++;g.fp++;const nearby=r.events.find(e=>p.at_s>=e.start_s&&p.at_s-e.start_s<=5);recordConfusion(nearby?.class??'NEGATIVE',p.class);}else{matched.add(index);recordConfusion(p.class,p.class);const delay=p.at_s-r.events[index].start_s;byClass[p.class].tp++;byClass[p.class].delays_s.push(delay);g.tp++;g.delays_s.push(delay);}}
  for(const [i,e]of r.events.entries())if(!matched.has(i)){byClass[e.class].fn++;g.fn++;}
 }
 const finish=(r:ReturnType<typeof summary>)=>{const sorted=[...r.delays_s].sort((a,b)=>a-b),pick=(q:number)=>sorted.length?sorted[Math.floor((sorted.length-1)*q)]:null;return {...r,precision:r.tp+r.fp?r.tp/(r.tp+r.fp):null,recall:r.tp+r.fn?r.tp/(r.tp+r.fn):null,recall_95pct_lower:wilsonLower(r.tp,r.tp+r.fn),support:r.tp+r.fn,detection_delay_p50_s:pick(.5),detection_delay_p95_s:pick(.95)};};
 return {per_class:Object.fromEntries(Object.entries(byClass).map(([k,v])=>[k,finish(v)])),confusion,strata:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,finish(v)])),negative_hours:negatives,false_episodes_before_cooldown:falseBefore,false_episodes_after_cooldown:falseAfter,false_alarm_95pct_upper_per_hour:negatives?poissonUpper(falseBefore,negatives):null,automatic_dispatch:false};
}
