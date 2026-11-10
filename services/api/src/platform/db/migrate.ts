import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {pool,transaction,lock} from './index.ts';
export async function migrate(){
 const folder=fileURLToPath(new URL('../../../migrations/',import.meta.url));
 await transaction(async db=>{
  await lock(db,'surakshaai-migrations');
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz DEFAULT now())');
  for(const file of (await readdir(folder)).filter(f=>f.endsWith('.sql')).sort()){
   const sql=await readFile(folder+file,'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
   const existing=await db.query('SELECT checksum FROM schema_migrations WHERE id=$1',[file]);
   if(existing.rowCount){if(existing.rows[0].checksum!==checksum)throw Error('Applied migration checksum differs: '+file);continue;}
   await db.query(sql);await db.query('INSERT INTO schema_migrations(id,checksum) VALUES($1,$2)',[file,checksum]);
   console.log('Applied',file);
  }
 });
}
if(process.argv[1]?.endsWith('migrate.ts')){try{await migrate();}finally{await pool.end();}}
