import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {transaction,lock,type DB} from '../../platform/db/index.ts';
import {encrypt,decrypt} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
const testDatabase=new URL(config.databaseUrl).pathname.endsWith('_test');
export const ledgerPath=process.env.ERASURE_LEDGER_PATH??fileURLToPath(new URL('../../../../../.local/'+(testDatabase?'test-':'')+'erasure-ledger.enc',import.meta.url));
type LedgerRow={auth_uid_hash:string;deleted_at:string;backup_expires_at:string};
async function mergeDiskLedger(db:DB){
 let encoded:string;
 try{encoded=await readFile(ledgerPath,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw Error('Erasure ledger cannot be read');}
 let value:{schema_version:number;rows:LedgerRow[]};
 try{value=decrypt(encoded);}catch{throw Error('Erasure ledger cannot be decrypted; startup/publish refused');}
 if(value.schema_version!==1||!Array.isArray(value.rows)||value.rows.length>1000000)throw Error('Invalid erasure ledger');
 for(const row of value.rows){
  if(!/^[a-f0-9]{64}$/.test(row.auth_uid_hash)||!Number.isFinite(Date.parse(row.deleted_at))||!Number.isFinite(Date.parse(row.backup_expires_at)))throw Error('Invalid erasure ledger row');
  await db.query('INSERT INTO deletion_ledger(auth_uid_hash,deleted_at,backup_expires_at) VALUES($1,$2,$3) ON CONFLICT(auth_uid_hash) DO UPDATE SET deleted_at=LEAST(deletion_ledger.deleted_at,EXCLUDED.deleted_at),backup_expires_at=GREATEST(deletion_ledger.backup_expires_at,EXCLUDED.backup_expires_at)',[row.auth_uid_hash,row.deleted_at,row.backup_expires_at]);
 }
}
export async function persistErasureLedger(){
 await transaction(async db=>{
  // API/worker serialize both snapshot read and atomic publication.
  await lock(db,'erasure-ledger-publish');await mergeDiskLedger(db);
  const rows=(await db.query('SELECT auth_uid_hash,deleted_at,backup_expires_at FROM deletion_ledger ORDER BY auth_uid_hash')).rows;
  await mkdir(dirname(ledgerPath),{recursive:true,mode:0o700});const temporary=ledgerPath+'.'+randomUUID()+'.tmp';
  try{await writeFile(temporary,encrypt({schema_version:1,rows}),{mode:0o600,flag:'wx'});await rename(temporary,ledgerPath);}finally{await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 });
}
export async function recoverErasureLedger(){
 await transaction(async db=>{await lock(db,'erasure-ledger-publish');await mergeDiskLedger(db);const {reconcileErasure}=await import('./index.ts');await reconcileErasure(db);});
}
