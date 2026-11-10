import {readdir,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
export function expiredBackupName(name:string,now=new Date()){
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.dump\.enc$/.exec(name);
 if(!match)return false;
 const stamp=`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${match[7]}Z`,date=new Date(stamp);
 return Number.isFinite(date.getTime())&&date.toISOString()===stamp&&now.getTime()-date.getTime()>=30*86400000;
}
export async function pruneLocalBackups(folder:string,now=new Date()){
 const root=resolve(folder);let count=0;
 for(const entry of await readdir(root,{withFileTypes:true})){
  if(!entry.isFile()||!expiredBackupName(entry.name,now))continue;
  const target=resolve(root,entry.name);if(dirname(target)!==root)throw Error('Backup retention target escaped archive folder');
  await unlink(target);count++;
 }
 return count;
}
