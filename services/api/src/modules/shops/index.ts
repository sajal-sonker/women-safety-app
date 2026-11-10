import type {Row} from '../../platform/db/index.ts';
import {metadata,iso} from '../common.ts';
export function hoursOpen(hours:Row,date:Date):boolean|null {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(date).map(p=>[p.type,p.value]));
 const localDate=parts.year+'-'+parts.month+'-'+parts.day;
 const exception=hours.exceptions?.find((e:Row)=>e.date===localDate);
 const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(parts.weekday)+1;
 const day=exception??hours.weekly?.find((d:Row)=>d.day===weekday);
 if(!day)return null;
 const t=parts.hour+':'+parts.minute;
 return day.intervals.some((i:Row)=>i.start<=t&&t<i.end);
}
export function shopView(s:Row,date=new Date()){
 const reviewed=s.hours_reviewed_at??s.updated_at??s.created_at??date;
 const scheduled=date.getTime()-new Date(reviewed).getTime()>30*86400000?null:hoursOpen(s.hours,date),closed=s.status!=='ACTIVE'||(s.closure_until&&s.closure_until>date)||scheduled===false;
 const open=closed?'CLOSED':s.confirmation_expires_at&&s.confirmation_expires_at>date?'CONFIRMED_OPEN':scheduled?'SCHEDULED_OPEN':'UNKNOWN';
 return {...metadata(s,date),id:s.id,name:s.name,position:s.location,public_phone:s.public_phone,status:s.status,verification_level:s.verification_level,verified_at:s.verified_at?iso(s.verified_at):null,hours:s.hours,open_status:open,confirmed_at:s.confirmed_at?iso(s.confirmed_at):null,confirmation_expires_at:s.confirmation_expires_at?iso(s.confirmation_expires_at):null,availability_override:s.closure_until&&s.closure_until>date?{state:'CLOSED',expires_at:iso(s.closure_until)}:null,distance_m:s.distance_m??null,walking_eta_s:null,listing_consent_version:s.listing_consent_version,opt_in_alerts:s.opt_in_alerts,agreement_version:s.agreement_version};
}
