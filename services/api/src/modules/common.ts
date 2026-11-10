import type {DB,Row} from '../platform/db/index.ts';
import {id,ApiError,requireCondition} from '../platform/security.ts';
export const iso=(v:Date|string)=>new Date(v).toISOString();
export const after=(ms:number,now=new Date())=>new Date(now.getTime()+ms).toISOString();
export const metadata=(row:Row,now=new Date())=>({schema_version:1 as const,revision:row.revision??1,updated_at:iso(row.updated_at??row.created_at??now),server_time:iso(now)});
export const age=(location:Row|null,now=new Date())=>location?Math.max(0,(now.getTime()-new Date(location.captured_at).getTime())/1000):null;
export function freshness(location:Row|null,now=new Date()){
 if(!location)return 'UNAVAILABLE';if(age(location,now)!>60)return 'STALE';
 return location.accuracy_m!==null&&location.accuracy_m<=100?'CURRENT':'APPROXIMATE';
}
export function validateLocation(location:Row|null,initial=false,now=new Date()){
 if(!location)return;
 const delta=now.getTime()-new Date(location.captured_at).getTime();
 requireCondition(delta>=-60000,400,'VALIDATION_ERROR');
 requireCondition(initial||delta<=86400000,422,'STALE_LOCATION');
}
export function cursorPage(rows:Row[],limit=20){
 const items=rows.slice(0,limit);
 const last=items.at(-1);
 return {items,next_cursor:rows.length>limit&&last?Buffer.from(JSON.stringify([last.cursor_at??iso(last.created_at??last.received_at??last.started_at),last.id])).toString('base64url'):null};
}
export function decodeCursor(raw:unknown):[string,string]|null {
 if(!raw)return null;
  try{const v=JSON.parse(Buffer.from(String(raw),'base64url').toString());requireCondition(Array.isArray(v)&&v.length===2&&!Number.isNaN(Date.parse(v[0]))&&/^[a-f0-9-]{36}$/.test(v[1]),400,'VALIDATION_ERROR');return v as [string,string];}
 catch{throw new ApiError(400,'VALIDATION_ERROR');}
}
export async function audit(db:DB,actor:string,action:string,type:string,resource:string){
 await db.query('INSERT INTO audit_events(id,actor_id,action,resource_type,resource_id) VALUES($1,$2,$3,$4,$5)',[id(),actor,action,type,resource]);
}
export function contextView(context:Row={},now=new Date()){
 const observed=context.observed_at??null;
 return {battery_pct:context.battery_pct??null,motion_context:context.motion_context??'UNKNOWN',motion_confidence:context.motion_confidence??null,speed_mps:context.speed_mps??null,observed_at:observed,age_s:observed?Math.max(0,(now.getTime()-Date.parse(observed))/1000):null,stale:!observed||now.getTime()-Date.parse(observed)>300000,landmark:null};
}
export function assertHours(hours:Row){
 requireCondition(new Set(hours.weekly.map((d:Row)=>d.day)).size===hours.weekly.length,400,'VALIDATION_ERROR');
 for(const day of [...hours.weekly,...hours.exceptions]){
  const intervals=[...day.intervals].sort((a,b)=>a.start.localeCompare(b.start));
  for(let i=0;i<intervals.length;i++)requireCondition(intervals[i].start<intervals[i].end&&(i===0||intervals[i-1].end<=intervals[i].start),400,'VALIDATION_ERROR');
 }
}
