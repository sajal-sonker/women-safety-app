import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env'))throw Error('.env exists; keeping existing settings.');
let source=readFileSync('.env.example','utf8');
const password=randomBytes(24).toString('hex');
source=source.replace('CHANGE_ME',password).replace('REPLACE_WITH_64_RANDOM_HEX_CHARACTERS',randomBytes(32).toString('hex')).replace('REPLACE_WITH_A_RANDOM_SECRET',randomBytes(32).toString('hex'));
source+='\nPOSTGRES_PASSWORD='+password+'\n';
writeFileSync('.env',source,{mode:0o600});
console.log('Created ignored .env with fresh local secrets; values are not printed.');
