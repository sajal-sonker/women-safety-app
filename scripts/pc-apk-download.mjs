import {createServer} from 'node:http';
import {lstat,open} from 'node:fs/promises';
import {pipeline} from 'node:stream';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export function apkDownloadServer(apkPath,{published=false}={}){
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.url!=='/aegis-demo.apk'){res.writeHead(404);res.end('Not found');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let file;
  try{
   const info=await lstat(apkPath);if(!info.isFile())throw Error('Not a regular APK');
   file=await open(apkPath,'r');const stat=await file.stat();
   if(published)res.setHeader('X-Aegis-Apk-Source','verified-published');
   res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="aegis-demo.apk"','Content-Length':stat.size});
   if(req.method==='HEAD'){await file.close();res.end();return;}
   const stream=file.createReadStream();file=null;pipeline(stream,res,()=>{});
  }catch{
   await file?.close().catch(()=>{});
   if(!res.headersSent){res.writeHead(503);res.end('Build the private VPN APK first.');}else res.destroy();
  }
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 // Serve the verified fixed copy; a subsequent USB build must never replace it.
 const apk=fileURLToPath(new URL('../.local/published/aegis-demo.apk',import.meta.url));
 const server=apkDownloadServer(apk,{published:true});server.listen(4002,'127.0.0.1',()=>console.log('Private APK download helper listening on loopback4002.'));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
