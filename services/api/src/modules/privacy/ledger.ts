import {mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pool} from '../../platform/db/index.ts';
import {encrypt} from '../../platform/security.ts';
import {config} from '../../platform/config.ts';
const testDatabase=new URL(config.databaseUrl).pathname.endsWith('_test');
export const ledgerPath=process.env.ERASURE_LEDGER_PATH??fileURLToPath(new URL('../../../../../.local/'+(testDatabase?'test-':'')+'erasure-ledger.enc',import.meta.url));
export async function persistErasureLedger(){
 const rows=(await pool.query('SELECT auth_uid_hash,deleted_at,backup_expires_at FROM deletion_ledger ORDER BY auth_uid_hash')).rows;
 await mkdir(dirname(ledgerPath),{recursive:true});const temporary=ledgerPath+'.tmp';await writeFile(temporary,encrypt({schema_version:1,rows}),{mode:0o600});await rename(temporary,ledgerPath);
}
