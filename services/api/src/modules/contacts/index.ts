import type {DB,Row} from '../../platform/db/index.ts';
import {lock} from '../../platform/db/index.ts';
import {id,token,hash,requireCondition} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
import {after,iso,metadata,audit,validateLocation} from '../common.ts';
import {enqueue} from '../sos/index.ts';
export async function contactView(db:DB,c:Row){
 const l=await db.query("SELECT 1 FROM contact_location_sessions WHERE contact_id=$1 AND revoked_at IS NULL AND expires_at>now() AND location_at>now()-interval '5 minutes' AND (location->>'accuracy_m')::float8<=100 LIMIT 1",[c.id]);
 return {...metadata(c),id:c.id,name:c.name,phone_e164:c.phone_e164,priority:c.priority,invite_status:c.invite_status,location_available:!!l.rowCount,consent_at:c.consent_at?iso(c.consent_at):null};
}
export async function ownContact(db:DB,user:Row,contactId:string){
 const r=await db.query('SELECT * FROM emergency_contacts WHERE id=$1 AND owner_user_id=$2 AND revoked_at IS NULL FOR UPDATE',[contactId,user.id]);
 requireCondition(r.rowCount,404,'NOT_FOUND');return r.rows[0];
}
export async function revokeContact(db:DB,contact:Row,ownerRemove=false){
 await db.query('UPDATE emergency_contacts SET invite_status=$2,revoked_at=CASE WHEN $3 THEN now() ELSE revoked_at END,revision=revision+1,updated_at=now() WHERE id=$1',[contact.id,ownerRemove?'REVOKED':'DECLINED',ownerRemove]);
 await db.query('UPDATE contact_location_sessions SET revoked_at=now(),location=NULL,location_at=NULL WHERE contact_id=$1',[contact.id]);
 await db.query('UPDATE tracking_grants SET revoked_at=now(),recovery_ciphertext=NULL WHERE contact_id=$1',[contact.id]);
 await db.query("UPDATE contact_invitations SET status='REVOKED',decided_at=now() WHERE contact_id=$1 AND status='PENDING'",[contact.id]);
 await db.query("UPDATE notification_outbox SET status='SUPPRESSED',material_ciphertext=NULL FROM delivery_intents d JOIN sos_recipients r ON r.id=d.recipient_id WHERE notification_outbox.intent_id=d.id AND r.contact_id=$1 AND notification_outbox.status IN ('PENDING','RETRY')",[contact.id]);
}
export async function createContact(db:DB,user:Row,body:Row){
 await lock(db,'contacts:'+user.id);
 const n=await db.query('SELECT count(*)::int AS n FROM emergency_contacts WHERE owner_user_id=$1 AND revoked_at IS NULL',[user.id]);
 requireCondition(n.rows[0].n<5,409,'CONFLICT');
 const r=await db.query('INSERT INTO emergency_contacts(id,owner_user_id,name,phone_e164,priority) VALUES($1,$2,$3,$4,$5) RETURNING *',[id(),user.id,body.name,body.phone_e164,body.priority]);
 return contactView(db,r.rows[0]);
}
export async function invite(db:DB,user:Row,contactId:string){
 const c=await ownContact(db,user,contactId);
 const blocked=await db.query('SELECT 1 FROM contact_blocks WHERE phone_hash=$1 AND owner_user_id=$2',[hash(c.phone_e164),user.id]);
 requireCondition(!blocked.rowCount&&c.invite_status!=='DECLINED',409,'CONFLICT');
 const limit=await db.query("SELECT count(*)::int AS n FROM contact_invitations WHERE contact_id=$1 AND created_at>now()-interval '1 day'",[c.id]);
 requireCondition(limit.rows[0].n<3,429,'RATE_LIMITED');
 const raw=token(),inviteId=id(),expires=after(86400000);
 await db.query("UPDATE contact_invitations SET status='REVOKED',decided_at=now() WHERE contact_id=$1 AND status='PENDING'",[c.id]);
 await db.query('INSERT INTO contact_invitations(id,contact_id,token_hash,expires_at) VALUES($1,$2,$3,$4)',[inviteId,c.id,hash(raw),expires]);
 await enqueue(db,null,null,'INVITE',{to:c.phone_e164,kind:'INVITE',url:config.trackingBase+'/contacts/invite#token='+raw,contact_id:c.id},'INVITE:'+inviteId,expires);
 return {invite_id:inviteId,status:'PENDING',expires_at:expires};
}
export async function decideInvite(db:DB,user:Row,body:Row,accept:boolean){
 const r=await db.query('SELECT i.*,c.phone_e164,c.owner_user_id,c.revoked_at FROM contact_invitations i JOIN emergency_contacts c ON c.id=i.contact_id WHERE i.token_hash=$1 FOR UPDATE OF i,c',[hash(body.token)]);
 requireCondition(r.rowCount,404,'NOT_FOUND');
 const invitation=r.rows[0];
 requireCondition(invitation.phone_e164===user.phone_e164,403,'FORBIDDEN');
 requireCondition(invitation.expires_at>new Date()&&!invitation.revoked_at&&invitation.status==='PENDING',410,'GRANT_EXPIRED');
 const state=accept?'VERIFIED':'DECLINED';
 await db.query('UPDATE contact_invitations SET status=$2,accepted_principal_id=$3,consent_version=$4,decided_at=now() WHERE id=$1',[invitation.id,state,user.id,body.consent_version??null]);
 await db.query('UPDATE emergency_contacts SET invite_status=$2,principal_id=$3,consent_at=CASE WHEN $5 THEN now() ELSE NULL END,consent_version=$4,revision=revision+1,updated_at=now() WHERE id=$1',[invitation.contact_id,state,user.id,body.consent_version??null,accept]);
 if(!accept){
  if(body.block_future_invites)await db.query('INSERT INTO contact_blocks(phone_hash,owner_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[hash(user.phone_e164),invitation.owner_user_id]);
  await revokeContact(db,{id:invitation.contact_id},false);
 }
 await audit(db,user.id,accept?'CONTACT_ACCEPTED':'CONTACT_DECLINED','CONTACT',invitation.contact_id);
 return contactView(db,(await db.query('SELECT * FROM emergency_contacts WHERE id=$1',[invitation.contact_id])).rows[0]);
}
export async function contactPosition(db:DB,user:Row,sessionId:string,body:Row){
 validateLocation(body.location);
 const r=await db.query("SELECT s.* FROM contact_location_sessions s JOIN emergency_contacts c ON c.id=s.contact_id WHERE s.id=$1 AND s.principal_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL FOR UPDATE OF s",[sessionId,user.id]);
 requireCondition(r.rowCount,404,'NOT_FOUND');
 const latest=!r.rows[0].location_at||new Date(body.location.captured_at)>r.rows[0].location_at;
 if(latest)await db.query('UPDATE contact_location_sessions SET location=$2,location_at=$3,sample_id=$4 WHERE id=$1',[sessionId,body.location,body.location.captured_at,body.sample_id]);
 return {sample_id:body.sample_id,accepted:true,is_latest:latest};
}
