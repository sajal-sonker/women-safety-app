import {test} from 'node:test';
import assert from 'node:assert/strict';
import {config,validateConfig} from '../services/api/src/platform/config.ts';
const settings={...config,env:'pilot',host:'0.0.0.0',controlledDemo:true,databaseUrl:'postgres://fixture@db/app',projectId:'suraksha-pilot-fixture',origin:'https://web.example.test',trackingBase:'https://web.example.test',key:'a47bd937a47bd937a47bd937a47bd937a47bd937a47bd937a47bd937a47bd937',receiptSecret:'fixture_receipt_secret_not_for_real_deployment',maps:'synthetic'};
const environment={GOOGLE_APPLICATION_CREDENTIALS:'/etc/secrets/firebase.json',ERASURE_LEDGER_PATH:'/var/data/erasure-ledger.enc'};
test('hosted controlled pilot accepts signed-auth configuration and synthetic maps explicitly',()=>{
 assert.doesNotThrow(()=>validateConfig(settings,environment));
});
test('hosted startup refuses emulator auth, unprotected origins, missing credentials and ephemeral privacy state',()=>{
 assert.throws(()=>validateConfig(settings,{...environment,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'}),/Emulator/);
 assert.throws(()=>validateConfig({...settings,projectId:'demo-surakshaai'},environment),/real Firebase/);
 assert.throws(()=>validateConfig({...settings,origin:'http://web.example.test'},environment),/HTTPS/);
 assert.throws(()=>validateConfig({...settings,trackingBase:'https://user:pass@web.example.test'},environment),/HTTPS/);
 assert.throws(()=>validateConfig(settings,{ERASURE_LEDGER_PATH:'/var/data/erasure-ledger.enc'}),/credentials/);
 assert.throws(()=>validateConfig(settings,{GOOGLE_APPLICATION_CREDENTIALS:'/secret.json'}),/ledger/);
 assert.throws(()=>validateConfig({...settings,key:'0'.repeat(64)},environment),/random/);
});
test('local emulator mode cannot accidentally bind a public network interface',()=>{
 assert.throws(()=>validateConfig({...settings,env:'local',host:'0.0.0.0'},{}),/loopback/);
});
