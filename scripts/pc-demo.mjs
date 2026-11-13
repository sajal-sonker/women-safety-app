import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createConnection} from 'node:net';
import {spawn} from 'node:child_process';
import {parse} from 'dotenv';
import pg from 'pg';
import {pcDemoEnvironment} from './lib/pc-demo-config.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const mode=process.argv[2]??'run';
if(!['run','check','test','migrate','auth','snapshot-auth'].includes(mode))throw Error('Use run, check, test, migrate, auth or snapshot-auth.');
if(!existsSync('.local/pc.env'))throw Error('Create private .local/pc.env using docs/PC_VPN_DEMO.md. Root .env is not used as the PC profile.');
const env=pcDemoEnvironment(parse(readFileSync('.local/pc.env')),process.env);
const listening=port=>new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});socket.setTimeout(1000);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});
const children=new Set();let stopping=false,exitCode=0;
function stop(code=0){
 if(stopping)return;stopping=true;exitCode=code;
 for(const child of children)child.kill('SIGTERM');
 const timer=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(exitCode||1);},15000);timer.unref();
 if(!children.size)process.exit(exitCode);
}
function launch(args,overrides={}){
 const child=spawn(process.execPath,args,{env:{...env,...overrides},stdio:'inherit'});children.add(child);
 child.on('error',()=>stop(1));child.on('exit',code=>{children.delete(child);if(stopping){if(!children.size)process.exit(exitCode);}else if(mode==='run')stop(code||1);else process.exitCode=code??1;});return child;
}
if(mode==='check'){
 const db=new pg.Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:3000,query_timeout:3000});
 try{await db.connect();await db.query('SELECT 1');console.log(JSON.stringify({pcProfileValid:true,localDatabaseReachable:true,authEmulatorListening:await listening(9099),apiListening:await listening(4001),webListening:await listening(3000),rootEnvOverriddenByPrivateProfile:true}));}
 catch{console.error('PC database check failed. Check the local PostgreSQL service and private profile; credentials were not printed.');process.exitCode=1;}
 finally{await db.end().catch(()=>{});}
}else if(mode==='test'){
 const npm=process.env.npm_execpath??resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 if(!existsSync(npm))throw Error('Run npm run test:pc so npm_execpath identifies your installed npm CLI.');
 launch([npm,'test']);
}else if(mode==='migrate'){
 launch(['--import','tsx','services/api/src/platform/db/migrate.ts']);
}else if(mode==='auth'||mode==='snapshot-auth'){
 mkdirSync('.local',{recursive:true});const folder=resolve('.local/auth-emulator');
 const args=['node_modules/firebase-tools/lib/bin/firebase.js'];
 if(mode==='auth'){
  if(await listening(9099))throw Error('An Auth emulator is already running. Keep its terminal; do not start a duplicate.');
  args.push('emulators:start','--only','auth','--project',env.FIREBASE_PROJECT_ID,'--config','firebase.json','--export-on-exit',folder);
  if(existsSync(folder+'/firebase-export-metadata.json'))args.push('--import',folder);
 }else{
  if(!await listening(9099))throw Error('Start the local Auth emulator before exporting its state.');
  args.push('emulators:export',folder,'--project',env.FIREBASE_PROJECT_ID,'--config','firebase.json','--force','--non-interactive');
 }
 // The Firebase child handles console Ctrl+C and its export-on-exit flow.
 process.on('SIGINT',()=>{});launch(args);
}else{
 if(await listening(4001)||await listening(3000)||await listening(4002))throw Error('API, web or APK helper is already running. Use its existing terminal, or stop it before starting the PC profile.');
 if(!await listening(9099))throw Error('Start npm run auth:pc in another terminal first.');
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
 launch(['--import','tsx','services/api/src/server.ts']);
 launch(['--import','tsx','services/worker/src/index.ts']);
 launch(['scripts/pc-apk-download.mjs']);
 launch(['node_modules/next/dist/bin/next','dev','apps/responder-web','--hostname','127.0.0.1','--port','3000'],{PORT:'3000',HOST:'127.0.0.1'});
 console.log('PC API/worker/web started with the private local profile. Keep this terminal and the PC running.');
}
