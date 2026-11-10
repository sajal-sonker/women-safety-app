import express,{type Express,type Request,type Response} from 'express';
import {authenticate,type VerifyToken} from '../platform/auth.ts';
import {transaction} from '../platform/db/index.ts';
import {decrypt,id,requireCondition} from '../platform/security.ts';
import {evidenceAccess,uploadEvidence} from './evidence/index.ts';
import {privacyJob} from './privacy/index.ts';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function mountStreams(app:Express,verify:VerifyToken){
 app.put('/v1/evidence/:assetId/upload',async(req,res,next)=>{
  try{requireCondition(uuid.test(String(req.params.assetId)),400,'VALIDATION_ERROR');res.locals.uploadUser=await authenticate(req,verify);next();}catch(e){next(e);}
 },express.raw({type:()=>true,limit:'10mb'}),async(req,res,next)=>{
  try{const result=await transaction(db=>uploadEvidence(db,res.locals.uploadUser,String(req.params.assetId),req.body,String(req.headers['content-type']??''),String(req.headers['x-amz-checksum-sha256']??'')));res.json(result);}catch(e){next(e);}
 });
 app.get('/v1/evidence/:assetId/content',async(req,res,next)=>{
  try{
   const assetId=String(req.params.assetId);requireCondition(uuid.test(assetId),400,'VALIDATION_ERROR');
   const user=req.headers['x-tracking-grant-id']?null:await authenticate(req,verify);
   const authorize=async()=>transaction(async db=>{const a=await evidenceAccess(db,assetId,user,req);requireCondition(a.asset.status==='AVAILABLE',409,'MEDIA_NOT_AVAILABLE');return a;});
   const {asset,grant}=await authorize();
   await transaction(db=>db.query('INSERT INTO evidence_access_audit(id,asset_id,actor_id,grant_id,action) VALUES($1,$2,$3,$4,$5)',[id(),asset.id,user?.id??null,grant?.id??null,'CONTENT_READ']));
   const bytes=Buffer.from(decrypt<{base64:string}>(asset.sanitized_ciphertext).base64,'base64');
   res.setHeader('Content-Type',asset.mime);res.setHeader('Content-Disposition','inline; filename="evidence.'+(asset.mime==='audio/wav'?'wav':asset.mime==='image/png'?'png':'jpg')+'"');
   await boundedStream(req,res,bytes,authorize);
  }catch(e){if(res.headersSent)res.destroy();else next(e);}
 });
 app.get('/v1/me/export/:jobId/content',async(req,res,next)=>{
  try{
   const jobId=String(req.params.jobId);requireCondition(uuid.test(jobId),400,'VALIDATION_ERROR');
   const authorize=async()=>{const user=await authenticate(req,verify);return transaction(async db=>{const j=await privacyJob(db,user,jobId);requireCondition(j.status==='COMPLETED'&&j.expires_at>new Date()&&j.artifact_ciphertext,410,'EXPORT_UNAVAILABLE');return j;});};
   const j=await authorize();res.setHeader('Content-Type','application/json');res.setHeader('Content-Disposition','attachment; filename="suraksha-export.json"');await boundedStream(req,res,Buffer.from(JSON.stringify(decrypt(j.artifact_ciphertext))),authorize);
  }catch(e){if(res.headersSent)res.destroy();else next(e);}
 });
}
async function boundedStream(req:Request,res:Response,bytes:Buffer,authorize:()=>Promise<unknown>){
 const started=Date.now();let checked=0;
 const timer=setTimeout(()=>res.destroy(),30000);timer.unref();
 let checking=false;
 const guard=setInterval(()=>{if(checking)return;checking=true;void authorize().catch(()=>res.destroy()).finally(()=>{checking=false;});},3000);guard.unref();
 try{
  for(let offset=0;offset<bytes.length;offset+=65536){
   if(req.destroyed||res.destroyed)return;
   requireCondition(Date.now()-started<30000,410,'STREAM_EXPIRED');
   if(Date.now()-checked>=1000){await authorize();checked=Date.now();}
   if(!res.write(bytes.subarray(offset,offset+65536)))await new Promise<void>(resolve=>{const done=()=>{res.off('drain',done);res.off('close',done);resolve();};res.once('drain',done);res.once('close',done);});
  }
  res.end();
 }finally{clearTimeout(timer);clearInterval(guard);}
}
