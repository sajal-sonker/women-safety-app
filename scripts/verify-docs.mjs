import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','*.md'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const broken=[];
for(const file of [...new Set(files)]){
 for(const link of readFileSync(file,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  const target=link[1].replace(/^<|>$/g,'');
  if(/^(https?:|#|mailto:)/.test(target))continue;
  const path=resolve(dirname(file),decodeURIComponent(target.split('#')[0]));
  if(!existsSync(path)){
   let ignored=false;try{execFileSync('git',['check-ignore','--quiet',path]);ignored=true;}catch{/* Missing unignored targets are reported below. */}
   if(!ignored)broken.push(file+' → '+target);
  }
 }
}
if(broken.length)throw Error('Broken local links:\n'+broken.join('\n'));
console.log('Checked',files.length,'Markdown paths; intentional local-only files follow gitignore.');
