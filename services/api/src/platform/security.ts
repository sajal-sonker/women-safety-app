import {createHash,createCipheriv,createDecipheriv,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {config} from './config.ts';
export const id=()=>randomUUID();
export const token=()=>randomBytes(32).toString('base64url');
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function canonical(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}
export const bodyHash=(v:unknown)=>hash(canonical(v));
export function encrypt(value:unknown){
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(config.key,'hex'),iv);
 const bytes=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);
 return Buffer.concat([iv,c.getAuthTag(),bytes]).toString('base64url');
}
export function decrypt<T=any>(data:string):T{
 const raw=Buffer.from(data,'base64url'),d=createDecipheriv('aes-256-gcm',Buffer.from(config.key,'hex'),raw.subarray(0,12));
 d.setAuthTag(raw.subarray(12,28));return JSON.parse(Buffer.concat([d.update(raw.subarray(28)),d.final()]).toString());
}
export function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export class ApiError extends Error {
 constructor(public status:number,public code:string,message=code,public recovery_action?:string){super(message);}
}
export function requireCondition(condition:unknown,status:number,code:string):asserts condition {if(!condition)throw new ApiError(status,code);}
