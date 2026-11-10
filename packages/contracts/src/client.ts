import type {components} from './generated/api.ts';
export type Model<K extends keyof components['schemas']> = components['schemas'][K];
export class ClientError extends Error {
 constructor(public status:number,public code:string,message:string){super(message);}
}
export function createClient(base:string,getToken:()=>Promise<string|null>){
 return async function request<T>(path:string,options:{method?:string,body?:unknown,key?:string,headers?:Record<string,string>}={}):Promise<T>{
  const token=await getToken();
  const response=await fetch(base+'/v1'+path,{method:options.method??'GET',credentials:'include',headers:{...(options.body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(options.key?{'Idempotency-Key':options.key}:{}),...options.headers},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});
  if(response.status===204)return undefined as T;
  const data=await response.json();
  if(!response.ok)throw new ClientError(response.status,data.error?.code??'UNKNOWN',data.error?.message??'Request failed');
  return data as T;
 };
}
