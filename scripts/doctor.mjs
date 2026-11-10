// Read-only local readiness checks. Never emit environment values, OTPs or device IDs.
import {config} from 'dotenv';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
config({quiet:true});
let failures=0;
const report=(ok,label,fix)=>{console.log(`${ok?'READY':'NEEDS_ACTION'} ${label}${ok?'':': '+fix}`);if(!ok)failures++;};
report(Number(process.versions.node.split('.')[0])===26&&Number(process.versions.node.split('.')[1])>=13,'Node26.13+','Use Node26.13.x (the pinned Windows executable is .tools/node.exe).');
report(existsSync('.env'),'Private local configuration','Run node scripts/init-env.mjs; keep the resulting file private.');
const local=(process.env.APP_ENV??'local')==='local'&&(process.env.SMS_PROVIDER??'fake')==='fake'&&(process.env.PUSH_PROVIDER??'fake')==='fake'&&/^demo-/.test(process.env.FIREBASE_PROJECT_ID??'demo-surakshaai')&&/^(127\.0\.0\.1|localhost):9099$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST??'');
report(local,'Demo provider configuration','Use the local fake-provider/Auth-emulator configuration in RUNNING.md.');
for(const [label,url,fix]of[
 ['API + database','http://127.0.0.1:4001/v1/health/ready','Start PostGIS, migrate, then start API/worker using RUNNING.md.'],
 ['Auth emulator','http://127.0.0.1:9099/','Run npm run auth:emulator.'],
 ['Browser console','http://localhost:3000/','Run npm run dev; use localhost for the web console.']
]){let ok=false;try{ok=(await fetch(url,{signal:AbortSignal.timeout(4000)})).ok;}catch{/* No sensitive error details. */}report(ok,label,fix);}
report(existsSync('apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk'),'Bundled phone APK','Build :app:assembleDemo with -PapiBaseUrl=http://127.0.0.1:4001.');
const model=spawnSync(process.execPath,['scripts/verify-model.mjs'],{encoding:'utf8'});
report(model.status===0,'Bundled model integrity','Run npm run ml:verify and restore the licensed model before building.');
const roots=[process.env.ANDROID_HOME,process.env.ANDROID_SDK_ROOT,process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Android','Sdk')].filter(Boolean);
const adb=roots.map(r=>join(r,'platform-tools',process.platform==='win32'?'adb.exe':'adb')).find(existsSync)??'adb';
const devices=spawnSync(adb,['devices'],{encoding:'utf8',timeout:10000});
if(devices.error||devices.status!==0)console.log('PHONE_PENDING Install Android platform-tools, then connect/authorize your phone.');
else{const lines=devices.stdout.split(/\r?\n/);const connected=lines.filter(l=>/^\S+\s+device$/.test(l)).length;console.log(connected?`PHONE_CONNECTED ${connected} authorized device(s); run scripts/phone-test.ps1 -Install.`:'PHONE_PENDING Connect USB and accept the phone debugging prompt; then run scripts/phone-test.ps1 -Install.');}
console.log('Worker delivery is checked by a simulated SOS/inbox test, not by HTTP readiness. Physical behavior and ML accuracy remain unverified until measured.');
process.exitCode=failures?1:0;
