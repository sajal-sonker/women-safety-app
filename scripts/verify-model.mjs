import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='ml/models/',m=JSON.parse(readFileSync(root+'manifest.json','utf8')),b=readFileSync(root+m.file),labels=readFileSync(root+m.output.labels,'utf8').trim().split(/\r?\n/);
if(b.length!==m.size_bytes||createHash('sha256').update(b).digest('hex')!==m.sha256||b.subarray(4,8).toString()!=='TFL3')throw Error('Bundled model integrity mismatch');
if(labels.length!==521||labels[m.output.screaming_index]!=='Screaming'||m.automatic_dispatch!==false)throw Error('Invalid baseline model manifest');
console.log('Model SHA256/tflite header/labels verified; confirmation-only, phrase model not trained.');
