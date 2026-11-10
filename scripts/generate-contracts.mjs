import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import openapiTS,{astToString} from 'openapi-typescript';
import YAML from 'yaml';
const path='packages/contracts/openapi.yaml',raw=readFileSync(path,'utf8'),api=YAML.parse(raw);
const output=astToString(await openapiTS(api));
const hash=createHash('sha256').update(raw).digest('hex');
const outputs={'packages/contracts/src/generated/api.ts':output,'packages/contracts/src/generated/hash.ts':"export const CONTRACT_SHA256 = '"+hash+"';\n"};
outputs['packages/contracts/src/generated/schema.json']=JSON.stringify(api.components.schemas,null,2)+'\n';
const ops=[];
for(const [path,methods] of Object.entries(api.paths))for(const [method,o] of Object.entries(methods)){
 const success=Object.keys(o.responses).find(k=>k.startsWith('2'));
 ops.push({method:method.toUpperCase(),path,input:o.requestBody?.content['application/json'].schema.$ref.split('/').at(-1)??null,output:o.responses[success].content?.['application/json'].schema.$ref.split('/').at(-1)??null,phase:o['x-phase'],auth:o.security.length?Object.keys(o.security[0])[0]==='TrackingCookie'?'tracking':'bearer':'public',success:Number(success),operationId:o.operationId});
}
outputs['packages/contracts/src/generated/operations.json']=JSON.stringify(ops,null,2)+'\n';
mkdirSync('packages/contracts/src/generated/kotlin',{recursive:true});
outputs['packages/contracts/src/generated/kotlin/Contract.kt']='// Generated; do not edit.\npackage com.surakshaai.contracts\nobject Contract { const val SHA256 = "'+hash+'" }\n';
function kotlinType(s){
 if(s.$ref)return s.$ref.split('/').at(-1);
 if(s.anyOf)return kotlinType(s.anyOf.find(v=>v.type!=='null'))+'?';
 if(s.type==='string')return 'String';
 if(s.type==='integer')return 'Int';
 if(s.type==='number')return 'Double';
 if(s.type==='boolean')return 'Boolean';
 if(s.type==='array')return 'List<'+kotlinType(s.items===false?s.prefixItems[0]:s.items)+'>';
 return 'JsonObject';
}
const classes=Object.entries(api.components.schemas).map(([name,s])=>{
 const fields=Object.entries(s.properties).map(([key,value])=>{
  let type=kotlinType(value),optional=!s.required.includes(key);
  if(optional&&!type.endsWith('?'))type+='?';
  return '    @SerializedName("'+key+'") val '+key+': '+type+(optional?' = null':'');
 });
 return fields.length?'data class '+name+'(\n'+fields.join(',\n')+'\n)':'class '+name;
});
outputs['packages/contracts/src/generated/kotlin/Models.kt']='// Generated from OpenAPI; do not edit.\npackage com.surakshaai.contracts\nimport com.google.gson.JsonObject\nimport com.google.gson.annotations.SerializedName\n\n'+classes.join('\n\n')+'\n';
for(const [file,content] of Object.entries(outputs)){
 if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==content)throw Error('Generated contract drift: '+file);}
 else writeFileSync(file,content);
}
console.log('Contract SHA256',hash);
