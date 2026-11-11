import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='ml/models/',m=JSON.parse(readFileSync(root+'manifest.json','utf8')),b=readFileSync(root+m.file),labels=readFileSync(root+m.output.labels,'utf8').trim().split(/\r?\n/);
if(b.length!==m.size_bytes||createHash('sha256').update(b).digest('hex')!==m.sha256||b.subarray(4,8).toString()!=='TFL3')throw Error('Bundled model integrity mismatch');
if(labels.length!==521||labels[m.output.screaming_index]!=='Screaming'||m.automatic_dispatch!==false)throw Error('Invalid baseline model manifest');
const phrases=JSON.parse(readFileSync(root+'phrases/manifest.json','utf8'));
if(phrases.id!=='vosk-help-bachao-v1'||phrases.automatic_dispatch!==false||phrases.sample_rate_hz!==16000||phrases.models.length!==2)throw Error('Invalid phrase recognizer manifest');
for(const model of phrases.models){const bytes=readFileSync(root+'phrases/'+model.archive);if(bytes.length!==model.size_bytes||createHash('sha256').update(bytes).digest('hex')!==model.sha256)throw Error('Phrase archive integrity mismatch');}
if(phrases.keywords.en.help!=='HELP'||phrases.keywords.hi['बचाओ']!=='BACHAO')throw Error('Missing required keyword');
console.log('YAMNet and both pinned Vosk phrase archives verified; Help/Bachao recognition, confirmation-only.');
