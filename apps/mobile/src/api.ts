import NativeSafety from '../specs/NativeSafety';
export type {Model} from '@surakshaai/contracts/client';
export async function api<T>(path:string,method='GET',body?:unknown,headers:Record<string,string>={}):Promise<T>{
 const raw=await NativeSafety.apiRequest(path,method,body===undefined?'':JSON.stringify(body),'',JSON.stringify(headers));
 return JSON.parse(raw) as T;
}
