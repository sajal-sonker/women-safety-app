export async function checkVpnEndpoints({origin,size,request=fetch}){
 return Promise.all([
  ['Private API + database',origin+'/v1/health/ready','GET'],
  ['Private demo authentication','http://'+new URL(origin).hostname+':9099/emulator/v1/projects/demo-surakshaai/config','GET'],
  ['Published VPN APK',origin+':8443/aegis-demo.apk','HEAD']
 ].map(async([label,url,method])=>{
  let ready=false;
  try{
   const response=await request(url,{method,redirect:'error',signal:AbortSignal.timeout(8000)});
   ready=response.ok&&(label==='Private API + database'?(await response.json()).status==='OK':method==='HEAD'?Number(response.headers.get('content-length'))===size&&response.headers.get('content-type')==='application/vnd.android.package-archive'&&response.headers.get('x-aegis-apk-source')==='verified-published':true);
   if(!response.bodyUsed)await response.body?.cancel();
  }catch{ready=false;}
  return {label,ready};
 }));
}
