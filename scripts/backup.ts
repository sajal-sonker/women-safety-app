import 'dotenv/config';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {pruneLocalBackups} from './backup-retention.ts';
const source=new URL(process.env.DATABASE_URL!);if(!['127.0.0.1','localhost'].includes(source.hostname))throw Error('Local recovery script refuses remote databases');
const mode=process.argv[2]??'create';if(!['create','verify'].includes(mode))throw Error('Use create or verify');
const pgBin=process.env.PG_BIN??(existsSync('.tools/pg17/bin')?resolve('.tools/pg17/bin'):''),exe=(name:string)=>join(pgBin,name+(process.platform==='win32'?'.exe':''));
const args=(database:string)=>['-h',source.hostname,'-p',source.port||'5432','-U',decodeURIComponent(source.username),'-d',database];
const env={...process.env,PGPASSWORD:decodeURIComponent(source.password)};
const {encrypt,decrypt}=await import('../services/api/src/platform/security.ts');
const {persistErasureLedger,ledgerPath}=await import('../services/api/src/modules/privacy/ledger.ts');
const {pool:sourcePool}=await import('../services/api/src/platform/db/index.ts');
if(mode==='create'){
 await persistErasureLedger();const result=spawnSync(exe('pg_dump'),[...args(source.pathname.slice(1)),'-Fc'],{env,maxBuffer:512*1024*1024});if(result.status!==0)throw Error('pg_dump failed (details withheld)');
 const bytes=result.stdout,checksum=createHash('sha256').update(bytes).digest('hex'),folder=resolve('.local/backups');await mkdir(folder,{recursive:true});const file=join(folder,new Date().toISOString().replace(/[:.]/g,'-')+'.dump.enc');await writeFile(file,encrypt({schema_version:1,sha256:checksum,base64:bytes.toString('base64')}),{mode:0o600});
 const expired_archives_removed=await pruneLocalBackups(folder);
 console.log(JSON.stringify({status:'ENCRYPTED_LOCAL_BACKUP_CREATED',artifact:file,sha256:checksum,ledger:ledgerPath,expired_archives_removed,live_rpo:'NOT_VALIDATED'}));await sourcePool.end();
}else{
 const file=process.argv[3];if(!file)throw Error('Supply an encrypted backup path; only suraksha_restore_test will be replaced');
 const backup=decrypt<{base64:string;sha256:string}>(await readFile(file,'utf8')),bytes=Buffer.from(backup.base64,'base64');if(createHash('sha256').update(bytes).digest('hex')!==backup.sha256)throw Error('Backup checksum mismatch');
 // The separate latest ledger is mandatory; an old backup cannot erase later erasure decisions.
 const ledger=decrypt<{rows:{auth_uid_hash:string;deleted_at:string;backup_expires_at:string}[]}>(await readFile(ledgerPath,'utf8'));
 const adminUrl=new URL(source);adminUrl.pathname='/postgres';const admin=new pg.Pool({connectionString:adminUrl.toString()});
 const target='suraksha_restore_test';await admin.query('DROP DATABASE IF EXISTS suraksha_restore_test WITH (FORCE)');await admin.query('CREATE DATABASE suraksha_restore_test');await admin.end();
 const result=spawnSync(exe('pg_restore'),[...args(target),'--exit-on-error','--no-owner','--no-privileges'],{env,input:bytes,maxBuffer:16*1024*1024});if(result.status!==0)throw Error('Isolated pg_restore failed (details withheld)');
 const restoredUrl=new URL(source);restoredUrl.pathname='/'+target;const db=new pg.Pool({connectionString:restoredUrl.toString()});
 for(const r of ledger.rows)await db.query('INSERT INTO deletion_ledger(auth_uid_hash,deleted_at,backup_expires_at) VALUES($1,$2,$3) ON CONFLICT(auth_uid_hash) DO UPDATE SET deleted_at=LEAST(deletion_ledger.deleted_at,EXCLUDED.deleted_at),backup_expires_at=GREATEST(deletion_ledger.backup_expires_at,EXCLUDED.backup_expires_at)',[r.auth_uid_hash,r.deleted_at,r.backup_expires_at]);
 await db.end();await sourcePool.end();
 // Reconcile via a child so its only connection pool targets the isolated restored database.
 const child=spawnSync(process.execPath,['--import','tsx','scripts/reconcile-erasure.ts'],{env:{...process.env,DATABASE_URL:restoredUrl.toString()},encoding:'utf8'});if(child.status!==0)throw Error('Restored erasure reconciliation failed');
 console.log(JSON.stringify({status:'RESTORE_AND_ERASURE_REHEARSED',database:target,checksum_verified:true,ledger_rows:ledger.rows.length,live_rpo_rto:'NOT_VALIDATED'}));
}
