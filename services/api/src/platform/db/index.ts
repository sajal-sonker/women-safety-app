import pg from 'pg';
import {config} from '../config.ts';
export const pool = new pg.Pool({connectionString:config.databaseUrl,max:12,statement_timeout:10000,idleTimeoutMillis:15000});
export const routePool = new pg.Pool({connectionString:config.databaseUrl,max:2,statement_timeout:10000,idleTimeoutMillis:15000,connectionTimeoutMillis:2000});
export type DB = pg.PoolClient;
export type Row = Record<string, any>;
export async function transaction<T>(work:(db:DB)=>Promise<T>,connectionPool=pool):Promise<T>{
  const db=await connectionPool.connect();
  try{await db.query('BEGIN');const result=await work(db);await db.query('COMMIT');return result;}
  catch(error){await db.query('ROLLBACK');throw error;}
  finally{db.release();}
}
export async function lock(db:DB,key:string){await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);}
