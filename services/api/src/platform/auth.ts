import {getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import type {Request} from 'express';
import {pool,transaction,type Row} from './db/index.ts';
import {config} from './config.ts';
import {ApiError,id,hash,requireCondition} from './security.ts';
export type Identity={uid:string,phone_number:string,auth_time:number};
export type VerifyToken=(token:string,revoked:boolean)=>Promise<Identity>;
export const verifyFirebase:VerifyToken=async(value,revoked)=>{
 if(!getApps().length)initializeApp({projectId:config.projectId});
 const decoded=await getAuth().verifyIdToken(value,revoked);
 requireCondition(typeof decoded.phone_number==='string',401,'UNAUTHENTICATED');
 return {uid:decoded.uid,phone_number:decoded.phone_number,auth_time:decoded.auth_time};
};
export async function principal(identity:Identity,allowDeleted=false):Promise<Row>{
 requireCondition(/^\+[1-9][0-9]{7,14}$/.test(identity.phone_number),401,'UNAUTHENTICATED');
 return transaction(async db=>{
  const erased=await db.query('SELECT 1 FROM deletion_ledger WHERE auth_uid_hash=$1',[hash(identity.uid)]);
  if(erased.rowCount){
   requireCondition(allowDeleted,401,'UNAUTHENTICATED');
   const old=await db.query("SELECT * FROM app_users WHERE auth_uid=$1 OR auth_uid=$2",[identity.uid,'deleted:'+hash(identity.uid)]);
   requireCondition(old.rowCount,401,'UNAUTHENTICATED');return {...old.rows[0],auth_time:identity.auth_time};
  }
  const result=await db.query('INSERT INTO app_users(id,auth_uid,phone_e164) VALUES($1,$2,$3) ON CONFLICT(auth_uid) DO UPDATE SET auth_uid=EXCLUDED.auth_uid RETURNING *',[id(),identity.uid,identity.phone_number]);
  const user=result.rows[0];
  requireCondition(!user.disabled&&!user.deleted_at,401,'UNAUTHENTICATED');
  // Phone changes never transfer existing contact consent to the new number.
  if(user.phone_e164!==identity.phone_number)throw new ApiError(401,'UNAUTHENTICATED','Account phone change requires re-verification');
  return {...user,auth_time:identity.auth_time};
 });
}
export async function authenticate(req:Request,verify:VerifyToken,allowDeleted=false):Promise<Row>{
 const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
 if(bearer){
  try{return await principal(await verify(bearer,allowDeleted||/^\/(?:v1\/)?admin(?:\/|$)/.test(req.path)||/consents|invitations|contact-consents|\/me(?:\/|$)/.test(req.path)),allowDeleted);}
  catch(error){if(error instanceof ApiError)throw error;throw new ApiError(401,'UNAUTHENTICATED');}
 }
 const raw=req.cookies?.identity;
 requireCondition(raw,401,'UNAUTHENTICATED');
 const result=await pool.query('SELECT s.*,u.* FROM browser_sessions s JOIN app_users u ON u.id=s.principal_id WHERE s.session_hash=$1 AND s.grant_id IS NULL AND s.revoked_at IS NULL AND s.expires_at>now() AND s.idle_expires_at>now() AND NOT u.disabled AND u.deleted_at IS NULL',[hash(raw)]);
 requireCondition(result.rowCount,401,'UNAUTHENTICATED');
 if(req.method!=='GET'){
  requireCondition(req.headers.origin===config.origin,403,'FORBIDDEN');
  requireCondition(hash(String(req.headers['x-csrf-token']??''))===result.rows[0].csrf_hash,403,'FORBIDDEN');
 }
 return {...result.rows[0],auth_time:result.rows[0].auth_time?new Date(result.rows[0].auth_time).getTime()/1000:0};
}
export async function requireModerator(user:Row){
 const r=await pool.query("SELECT 1 FROM role_assignments WHERE user_id=$1 AND role='MODERATOR'",[user.id]);
 requireCondition(r.rowCount,403,'FORBIDDEN');
}
