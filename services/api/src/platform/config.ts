import {config as loadEnv} from 'dotenv';
import {fileURLToPath} from 'node:url';
loadEnv({path:fileURLToPath(new URL('../../../../.env',import.meta.url)),quiet:true});
export const config = {
  env: process.env.APP_ENV ?? 'local',
  controlledDemo: (process.env.APP_ENV ?? 'local')==='local'||process.env.CONTROLLED_DEMO==='true',
  host: process.env.HOST ?? '127.0.0.1',
  port: Number(process.env.PORT ?? 4001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-surakshaai',
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  trackingBase: process.env.PUBLIC_TRACKING_BASE_URL ?? 'http://localhost:3000',
  key: process.env.DATA_KEY_HEX ?? '',
  receiptSecret: process.env.RECEIPT_SECRET ?? '',
  maps: process.env.MAPS_PROVIDER ?? 'synthetic',
  router: process.env.GRAPHHOPPER_URL ?? 'http://127.0.0.1:8989'
};
export function validateConfig(settings=config,environment:NodeJS.ProcessEnv=process.env) {
  if (!settings.databaseUrl || !/^[a-f0-9]{64}$/i.test(settings.key) || settings.receiptSecret.length < 32) throw Error('Database and encryption/receipt secrets must be configured');
  if(!['local','pilot','production'].includes(settings.env))throw Error('APP_ENV must be local, pilot or production');
  if(!['127.0.0.1','localhost','0.0.0.0'].includes(settings.host))throw Error('Unsupported listener interface');
  if (settings.env !== 'local' && environment.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Emulator authentication is local only');
  if (environment.FIREBASE_AUTH_EMULATOR_HOST && !/^(127\.0\.0\.1|localhost):\d+$/.test(environment.FIREBASE_AUTH_EMULATOR_HOST)) throw Error('Auth emulator must be loopback');
  if(settings.env==='local'&&settings.host==='0.0.0.0')throw Error('Local emulator mode must bind loopback; use hosted pilot with real authentication for remote devices');
  if (settings.env !== 'local') {
    for(const endpoint of [settings.origin,settings.trackingBase]){
      let url:URL;try{url=new URL(endpoint);}catch{throw Error('Hosted web origins must be valid HTTPS origins');}
      if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname)||['localhost','127.0.0.1'].includes(url.hostname))throw Error('Hosted web origins must use HTTPS without credentials or URL parameters');
    }
    if(settings.projectId.startsWith('demo-')||!settings.projectId)throw Error('Hosted mode requires a real Firebase project');
    if(!environment.GOOGLE_APPLICATION_CREDENTIALS&&!environment.GOOGLE_CLOUD_PROJECT&&!environment.FIREBASE_ADMIN_CREDENTIALS_JSON)throw Error('Hosted mode requires Firebase Admin credentials');
    if(environment.FIREBASE_ADMIN_CREDENTIALS_JSON){
      let account:Record<string,unknown>;try{account=JSON.parse(environment.FIREBASE_ADMIN_CREDENTIALS_JSON);}catch{throw Error('Firebase Admin credentials must be valid JSON');}
      if(account.project_id!==settings.projectId||typeof account.private_key!=='string'||typeof account.client_email!=='string')throw Error('Firebase Admin credentials must match the configured project');
    }
    if(/^([a-f0-9])\1{63}$/i.test(settings.key))throw Error('Hosted encryption key must be randomly generated');
    if(settings.maps==='synthetic'&&!settings.controlledDemo)throw Error('Synthetic maps require an explicitly labelled controlled pilot');
    if(!settings.controlledDemo)throw Error('Live emergency providers are not configured; only the explicit controlled pilot is deployable');
    if(!environment.ERASURE_LEDGER_PATH||!environment.ERASURE_LEDGER_PATH.startsWith('/'))throw Error('Hosted mode requires an absolute persistent erasure-ledger path');
  }
  if ((environment.PUSH_PROVIDER ?? 'fake') !== 'fake' || (environment.SMS_PROVIDER ?? 'fake') !== 'fake') throw Error('Live delivery adapters require separately approved configuration');
}
