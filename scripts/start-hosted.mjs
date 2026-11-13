import {spawn} from 'node:child_process';
import {config,validateConfig} from '../services/api/src/platform/config.ts';

validateConfig();
if(config.env==='local')throw Error('Use npm run dev for local emulators; hosted launcher requires real project authentication.');
const children=new Set();let stopping=false,exitCode=0;
function stop(code=0){
 if(stopping)return;stopping=true;exitCode=code;
 for(const child of children)child.kill('SIGTERM');
 const timeout=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(exitCode||1);},20000);timeout.unref();
 if(!children.size)process.exit(exitCode);
}
function launch(file){
 const child=spawn(process.execPath,['--import','tsx',file],{stdio:'inherit',env:process.env});children.add(child);
 child.on('error',()=>stop(1));
 child.on('exit',()=>{children.delete(child);if(stopping&&!children.size)process.exit(exitCode);});
 return child;
}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>stop());
// One service/disk owns both processes and their privacy ledger. No demo seed runs here.
const migration=launch('services/api/src/platform/db/migrate.ts');
migration.on('exit',code=>{
 if(stopping)return;
 if(code!==0){stop(1);return;}
 for(const file of ['services/api/src/server.ts','services/worker/src/index.ts']){
  const child=launch(file);child.on('exit',()=>{if(!stopping)stop(1);});
 }
});
