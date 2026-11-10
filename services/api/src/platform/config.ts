import {config as loadEnv} from 'dotenv';
import {fileURLToPath} from 'node:url';
loadEnv({path:fileURLToPath(new URL('../../../../.env',import.meta.url)),quiet:true});
export const config = {
  env: process.env.APP_ENV ?? 'local',
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
export function validateConfig() {
  if (!config.databaseUrl || !/^[a-f0-9]{64}$/i.test(config.key) || config.receiptSecret.length < 32) throw Error('Database and encryption/receipt secrets must be configured');
  if (config.env !== 'local' && process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Emulator authentication is local only');
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw Error('Auth emulator must be loopback');
  if (config.env !== 'local' && (!config.origin.startsWith('https://') || config.maps === 'synthetic')) throw Error('Live environment requires HTTPS and real map configuration');
  if ((process.env.PUSH_PROVIDER ?? 'fake') !== 'fake' || (process.env.SMS_PROVIDER ?? 'fake') !== 'fake') throw Error('Live delivery adapters require separately approved configuration');
}
