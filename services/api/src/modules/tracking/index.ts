import type {Request,Response} from 'express';
import type {DB,Row} from '../../platform/db/index.ts';
import {hash,id,token,encrypt,decrypt,requireCondition} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
import {after,iso,metadata,age,contextView} from '../common.ts';
import {eventChange,schedule} from '../sos/index.ts';
export const cookieName=(grantId:string)=>'tracking_'+grantId;
const cookieOptions=()=>({httpOnly:true,secure:config.env!=='local',sameSite:'lax' as const,path:'/v1',maxAge:7200000});
export async function exchange(db:DB,body:Row,res:Response){
 const r=await db.query('SELECT * FROM tracking_grants WHERE token_hash=$1 FOR UPDATE',[hash(body.token)]);
 requireCondition(r.rowCount,410,'GRANT_EXPIRED');
 const g=r.rows[0];await validGrant(db,g);
 const binding=hash(body.exchange_id);
 let material:Row;
 if(g.exchange_hash){
  requireCondition(g.exchange_hash===binding&&g.exchange_until>new Date()&&g.recovery_ciphertext,409,'CONFLICT');
  material=decrypt(g.recovery_ciphertext);
 }else{
  material={session:token(),csrf:token()};
  const expires=iso(new Date(Math.min(new Date(g.expires_at).getTime(),Date.now()+7200000)));
  await db.query('INSERT INTO browser_sessions(id,grant_id,session_hash,csrf_hash,idle_expires_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[id(),g.id,hash(material.session),hash(material.csrf),after(900000),expires]);
  await db.query('UPDATE tracking_grants SET exchange_hash=$2,exchange_until=$3,recovery_ciphertext=$4 WHERE id=$1',[g.id,binding,after(120000),encrypt(material)]);
 }
 res.cookie(cookieName(g.id),material.session,cookieOptions());
 return {grant_id:g.id,grant_kind:g.kind,expires_at:iso(g.expires_at),csrf_token:material.csrf};
}
export async function validGrant(db:DB,g:Row){
 requireCondition(!g.revoked_at,410,'GRANT_REVOKED');
 requireCondition(new Date(g.expires_at)>new Date(),410,'GRANT_EXPIRED');
 const c=await db.query("SELECT 1 FROM emergency_contacts WHERE id=$1 AND invite_status='VERIFIED' AND revoked_at IS NULL",[g.contact_id]);
 requireCondition(c.rowCount,410,'GRANT_REVOKED');
 if(g.sos_event_id){
  const e=await db.query("SELECT 1 FROM sos_events WHERE id=$1 AND status NOT IN ('RESOLVED','CANCELLED') AND expires_at>now()",[g.sos_event_id]);
  requireCondition(e.rowCount,410,'GRANT_REVOKED');
 }else if(g.journey_id){
  const e=await db.query("SELECT 1 FROM journeys WHERE id=$1 AND status IN ('ACTIVE','OVERDUE') AND share_with_contacts AND expires_at>now()",[g.journey_id]);
  requireCondition(e.rowCount,410,'GRANT_REVOKED');
 }
}
export async function trackingSession(db:DB,req:Request,kind?:string){
 const selector=String(req.headers['x-tracking-grant-id']??'');
 requireCondition(/^[a-f0-9-]{36}$/.test(selector),401,'UNAUTHENTICATED');
 const raw=req.cookies?.[cookieName(selector)];
 requireCondition(raw,401,'UNAUTHENTICATED');
 const r=await db.query('SELECT g.*,s.id AS session_id,s.csrf_hash FROM browser_sessions s JOIN tracking_grants g ON g.id=s.grant_id WHERE g.id=$1 AND s.session_hash=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND s.idle_expires_at>now()',[selector,hash(raw)]);
 requireCondition(r.rowCount,401,'UNAUTHENTICATED');
 const g=r.rows[0];await validGrant(db,g);
 if(kind)requireCondition(g.kind===kind,403,'FORBIDDEN');
 if(req.method!=='GET'){
  requireCondition(req.headers.origin===config.origin,403,'FORBIDDEN');
  requireCondition(hash(String(req.headers['x-csrf-token']??''))===g.csrf_hash,403,'FORBIDDEN');
 }
 await db.query("UPDATE browser_sessions SET idle_expires_at=LEAST(expires_at,now()+interval '15 minutes') WHERE id=$1",[g.session_id]);
 return g;
}
export async function trackingView(db:DB,g:Row){
 const r=await db.query('SELECT e.*,u.display_name FROM sos_events e JOIN app_users u ON u.id=e.user_id WHERE e.id=$1',[g.sos_event_id]);
 const event=r.rows[0];
 const own=(await db.query('SELECT * FROM sos_recipients WHERE id=$1',[g.recipient_id])).rows[0];
 const count=await db.query("SELECT count(*)::int AS n FROM sos_recipients WHERE sos_event_id=$1 AND acknowledgement='CAN_ASSIST'",[event.id]);
 return {...metadata(event),event_id:event.id,event_status:event.status,started_at:iso(event.created_at),trigger_class:event.trigger_type==='MANUAL'?'MANUAL':event.trigger_type==='JOURNEY_OVERDUE'?'JOURNEY_OVERDUE':'POTENTIAL_DISTRESS',shared_name:event.display_name,position:event.position,location_age_s:age(event.position),context:contextView(event.context),priority_role:own.role,own_acknowledgement:own.acknowledgement,assisting_count:count.rows[0].n,evidence:[],expires_at:iso(g.expires_at)};
}
export async function acknowledge(db:DB,g:Row,body:Row){
 await db.query('SELECT id FROM sos_events WHERE id=$1 FOR UPDATE',[g.sos_event_id]);
 await validGrant(db,g);
 const answer=body.can_assist?'CAN_ASSIST':'CANNOT_ASSIST',eta=body.can_assist?body.eta_minutes??null:null;
 const r=await db.query('UPDATE sos_recipients SET acknowledgement=$2,eta_minutes=$3,acknowledged_at=now() WHERE id=$1 RETURNING role',[g.recipient_id,answer,eta]);
 await eventChange(db,g.sos_event_id,'RECIPIENT_ACKNOWLEDGED');
 const revision=(await db.query('SELECT revision FROM sos_events WHERE id=$1',[g.sos_event_id])).rows[0].revision;
 await db.query('INSERT INTO recipient_acknowledgements(id,recipient_id,answer,eta_minutes,revision) VALUES($1,$2,$3,$4,$5)',[id(),g.recipient_id,answer,eta,revision]);
 if(!body.can_assist&&r.rows[0].role==='PRIMARY')await schedule(db,'PROMOTE',g.sos_event_id,new Date().toISOString(),revision);
 return {acknowledgement:answer,eta_minutes:eta,revision};
}
