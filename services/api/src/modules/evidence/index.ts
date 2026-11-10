import type {Request} from 'express';
import type {DB,Row} from '../../platform/db/index.ts';
import {id,encrypt,decrypt,requireCondition} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
import {metadata,iso,after} from '../common.ts';
import {ownEvent,eventChange} from '../sos/index.ts';
import {trackingSession} from '../tracking/index.ts';
import {sanitizeMedia} from './sanitize.ts';
export const evidenceView=(r:Row)=>({...metadata(r),id:r.id,kind:r.kind,mime:r.mime,size_bytes:r.size_bytes,duration_s:r.duration_s,captured_at:iso(r.captured_at),status:r.status,delete_after:iso(r.delete_after)});
export async function evidenceList(db:DB,eventId:string,recipientId?:string){
 const r=await db.query('SELECT a.* FROM evidence_assets a WHERE a.sos_event_id=$1'+(recipientId?" AND a.status='AVAILABLE' AND EXISTS(SELECT 1 FROM evidence_recipient_scopes s WHERE s.asset_id=a.id AND s.recipient_id=$2)":'')+' ORDER BY a.created_at,a.id LIMIT 20',recipientId?[eventId,recipientId]:[eventId]);return r.rows.map(evidenceView);
}
export async function evidenceAccess(db:DB,assetId:string,user:Row|null,req?:Request,write=false){
 const asset=(await db.query('SELECT * FROM evidence_assets WHERE id=$1'+(write?' FOR UPDATE':''),[assetId])).rows[0];
 requireCondition(asset,404,'NOT_FOUND');
 let grant:Row|undefined;
 if(!user||asset.user_id!==user.id){
  requireCondition(!write&&req?.headers['x-tracking-grant-id'],404,'NOT_FOUND');
  const selected=await trackingSession(db,req!,'SOS_READ');grant=selected;
  const scope=await db.query('SELECT 1 FROM evidence_recipient_scopes WHERE asset_id=$1 AND recipient_id=$2',[asset.id,selected.recipient_id]);
  requireCondition(selected.sos_event_id===asset.sos_event_id&&scope.rowCount,404,'NOT_FOUND');
 }
 const state=await db.query('SELECT e.ended_at,e.expires_at,u.consents,u.deleted_at FROM sos_events e JOIN app_users u ON u.id=e.user_id WHERE e.id=$1',[asset.sos_event_id]);
 const e=state.rows[0];requireCondition(e&&!e.deleted_at&&e.consents.evidence&&!e.ended_at&&e.expires_at>new Date()&&asset.delete_after>new Date()&&asset.status!=='DELETED',410,'GRANT_REVOKED');
 if(grant)requireCondition(asset.status==='AVAILABLE',404,'NOT_FOUND');
 return {asset,grant};
}
export async function presignEvidence(db:DB,user:Row,eventId:string,b:Row){
 requireCondition(config.env==='local',503,'FEATURE_DISABLED');
 const e=await ownEvent(db,eventId,user.id,true);requireCondition(!e.ended_at&&e.expires_at>new Date(),409,'INVALID_TRANSITION');
 const current=(await db.query('SELECT consents FROM app_users WHERE id=$1',[user.id])).rows[0];requireCondition(current.consents.evidence,403,'CONSENT_REQUIRED');
 const count=await db.query('SELECT count(*)::int AS n FROM evidence_assets WHERE sos_event_id=$1',[e.id]);requireCondition(count.rows[0].n<20,429,'RATE_LIMITED');
 const max=b.kind==='AUDIO'?2097152:b.kind==='PHOTO'?5242880:10485760;
 requireCondition(b.size_bytes<=max,400,'VALIDATION_ERROR');
 requireCondition(b.kind==='AUDIO'?b.mime==='audio/wav'&&b.duration_s!==null:b.kind==='PHOTO'?['image/jpeg','image/png'].includes(b.mime)&&b.duration_s===null:false,503,'FEATURE_DISABLED');
 requireCondition(Date.parse(b.captured_at)<=Date.now()+60000&&Date.parse(b.captured_at)>=new Date(e.created_at).getTime()-1000,400,'VALIDATION_ERROR');
 requireCondition(b.recipient_ids.length>0,400,'RECIPIENT_SELECTION_REQUIRED');
 const recipients=await db.query("SELECT r.id FROM sos_recipients r JOIN emergency_contacts c ON c.id=r.contact_id WHERE r.sos_event_id=$1 AND r.id=ANY($2::uuid[]) AND c.invite_status='VERIFIED' AND c.revoked_at IS NULL",[e.id,b.recipient_ids]);
 requireCondition(recipients.rowCount===b.recipient_ids.length,400,'INVALID_RECIPIENT');
 const assetId=id(),expires=after(300000);
 await db.query('INSERT INTO evidence_assets(id,sos_event_id,user_id,kind,mime,size_bytes,sha256,duration_s,captured_at,consent_version,upload_expires_at,delete_after) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[assetId,e.id,user.id,b.kind,b.mime,b.size_bytes,b.sha256,b.duration_s,b.captured_at,b.consent_version,expires,after(7*86400000)]);
 for(const r of recipients.rows)await db.query('INSERT INTO evidence_recipient_scopes VALUES($1,$2)',[assetId,r.id]);
 await eventChange(db,e.id,'CONTEXT_UPDATED');
 return {asset_id:assetId,upload_url:'/v1/evidence/'+assetId+'/upload',expires_at:expires,required_headers:{'Content-Type':b.mime,'x-amz-checksum-sha256':b.sha256},storage_mode:'LOCAL_ENCRYPTED_FAKE'};
}
export async function uploadEvidence(db:DB,user:Row,assetId:string,bytes:Buffer,mime:string,checksum:string){
 const {asset:a}=await evidenceAccess(db,assetId,user,undefined,true);
 requireCondition(a.status==='REQUESTED'&&a.upload_expires_at>new Date(),409,'UPLOAD_EXPIRED_OR_USED');
 requireCondition(bytes.length===a.size_bytes&&hashBytes(bytes)===a.sha256&&checksum===a.sha256&&mime===a.mime,400,'MEDIA_MISMATCH');
 await db.query("UPDATE evidence_assets SET material_ciphertext=$2,status='QUARANTINED',revision=revision+1,updated_at=now() WHERE id=$1",[a.id,encrypt({base64:bytes.toString('base64')})]);
 return evidenceView((await db.query('SELECT * FROM evidence_assets WHERE id=$1',[a.id])).rows[0]);
}
import {createHash} from 'node:crypto';
const hashBytes=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export async function completeEvidence(db:DB,user:Row,eventId:string,assetId:string){
 await ownEvent(db,eventId,user.id,true);const {asset:a}=await evidenceAccess(db,assetId,user,undefined,true);
 requireCondition(a.sos_event_id===eventId,404,'NOT_FOUND');
 requireCondition(a.status==='QUARANTINED'&&a.material_ciphertext&&a.upload_expires_at>new Date(),409,'INVALID_TRANSITION');
 // Completion only queues processing; a client cannot assert that scanning succeeded.
 await db.query("UPDATE evidence_assets SET status='UPLOADING',revision=revision+1,updated_at=now() WHERE id=$1",[a.id]);return evidenceView({...a,status:'UPLOADING',revision:a.revision+1,updated_at:new Date()});
}
export async function processEvidence(db:DB){
 const rows=await db.query("SELECT * FROM evidence_assets WHERE status='UPLOADING' ORDER BY created_at LIMIT 2 FOR UPDATE SKIP LOCKED");
 for(const a of rows.rows){
  try{
   await evidenceAccess(db,a.id,{id:a.user_id});
   const raw=Buffer.from(decrypt<Row>(a.material_ciphertext).base64,'base64'),clean=await sanitizeMedia(raw,a.mime,a.duration_s);
   await db.query("UPDATE evidence_assets SET status='AVAILABLE',material_ciphertext=NULL,sanitized_ciphertext=$2,scan_result='LOCAL_FORMAT_VALIDATOR_ONLY',revision=revision+1,updated_at=now() WHERE id=$1",[a.id,encrypt({base64:clean.toString('base64')})]);
  }catch{await db.query("UPDATE evidence_assets SET status='FAILED',material_ciphertext=NULL,sanitized_ciphertext=NULL,scan_result='REJECTED',revision=revision+1,updated_at=now() WHERE id=$1",[a.id]);}
  await eventChange(db,a.sos_event_id,'CONTEXT_UPDATED');
 }
}
export async function deleteEvidence(db:DB,user:Row,assetId:string){
 const a=(await db.query('SELECT * FROM evidence_assets WHERE id=$1 AND user_id=$2 FOR UPDATE',[assetId,user.id])).rows[0];requireCondition(a,404,'NOT_FOUND');
 await db.query("UPDATE evidence_assets SET status='DELETED',material_ciphertext=NULL,sanitized_ciphertext=NULL,revision=revision+1,updated_at=now() WHERE id=$1",[a.id]);await eventChange(db,a.sos_event_id,'ACCESS_REVOKED');
}
export async function purgeEvidence(db:DB){
 await db.query("UPDATE evidence_assets a SET status='DELETED',material_ciphertext=NULL,sanitized_ciphertext=NULL FROM app_users u,sos_events e WHERE u.id=a.user_id AND e.id=a.sos_event_id AND (a.delete_after<=now() OR u.deleted_at IS NOT NULL OR NOT (u.consents->>'evidence')::boolean OR e.ended_at IS NOT NULL OR e.expires_at<=now() OR (a.status IN ('REQUESTED','QUARANTINED','UPLOADING') AND a.upload_expires_at<=now()))");
 await db.query("DELETE FROM evidence_access_audit WHERE created_at<now()-interval '90 days'");
}
