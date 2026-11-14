import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {apkDownloadServer} from '../scripts/pc-apk-download.mjs';
test('private download endpoint serves only its APK, with HEAD support and no caching',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'aegis-apk-')),file=join(folder,'app.apk');
 await writeFile(file,'synthetic-apk');await writeFile(join(folder,'.env'),'private-test-fixture');
 const server=apkDownloadServer(file,{published:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  const head=await fetch(origin+'/aegis-demo.apk',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('cache-control'),'no-store');assert.equal(await head.text(),'');
  assert.equal(head.headers.get('x-aegis-apk-source'),'verified-published');
  const get=await fetch(origin+'/aegis-demo.apk');assert.equal(get.headers.get('content-type'),'application/vnd.android.package-archive');assert.equal(await get.text(),'synthetic-apk');
  for(const path of ['/.env','/../.env','/','/aegis-demo.apk/../../.env'])assert.equal((await fetch(origin+path)).status,404);
  assert.equal((await fetch(origin+'/aegis-demo.apk',{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));assert.equal(dirname(resolve(folder)),resolve(tmpdir()));assert.match(basename(folder),/^aegis-apk-/);await rm(folder,{recursive:true,force:true});}
});
test('missing APK reports unavailable without exposing another file',async()=>{
 const server=apkDownloadServer(join(tmpdir(),'aegis-does-not-exist.apk'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/aegis-demo.apk');assert.equal(response.status,503);await response.text();}
 finally{await new Promise(resolve=>server.close(resolve));}
});
