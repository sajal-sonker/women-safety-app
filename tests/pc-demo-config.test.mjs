import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pcDemoEnvironment} from '../scripts/lib/pc-demo-config.mjs';
const local={APP_ENV:'local',HOST:'127.0.0.1',PORT:'4001',DATABASE_URL:'postgresql://fixture@127.0.0.1:54329/fixture',FIREBASE_PROJECT_ID:'demo-surakshaai',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',SMS_PROVIDER:'fake',PUSH_PROVIDER:'fake',DATA_KEY_HEX:'0'.repeat(64),RECEIPT_SECRET:'isolated_test_receipt_not_a_real_secret'};
test('PC profile overrides a remote inherited environment and removes server cloud credentials',()=>{
 const env=pcDemoEnvironment(local,{DATABASE_URL:'postgresql://fixture@remote.example.test/db',FIREBASE_ADMIN_CREDENTIALS_JSON:'private-fixture',GOOGLE_APPLICATION_CREDENTIALS:'/private/fixture',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'real-fixture'});
 assert.equal(env.DATABASE_URL,local.DATABASE_URL);assert.equal(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,local.FIREBASE_PROJECT_ID);assert.equal(env.FIREBASE_ADMIN_CREDENTIALS_JSON,undefined);assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS,undefined);
});
test('PC mode rejects remote databases and network-facing emulator/listener profiles',()=>{
 assert.throws(()=>pcDemoEnvironment({...local,DATABASE_URL:'postgresql://fixture@remote.example.test/db'}),/local PostgreSQL/);
 assert.throws(()=>pcDemoEnvironment({...local,HOST:'0.0.0.0'}),/127.0.0.1/);
 assert.throws(()=>pcDemoEnvironment({...local,FIREBASE_AUTH_EMULATOR_HOST:'remote.example.test:9099'}),/loopback/);
 assert.throws(()=>pcDemoEnvironment({...local,FIREBASE_PROJECT_ID:'real-fixture'}),/loopback/);
});
