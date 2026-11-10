import {execFileSync} from 'node:child_process';
// This explicit exception list belongs to the portable branch, not main.
const allowed=new Set([
 'AGENTS.md','EXECUTION_STATE.md','docs/AGENT_OWNERSHIP.md',
 'docs/EXECUTOR_HANDOFF_PROMPT.md','docs/EXECUTION_STATE_TEMPLATE.md',
 'docs/22_CODEX_REVIEWER_HANDOFF.md','apps/responder-web/AGENTS.md'
]);
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const restricted=/(^|\/)(AGENTS(?:\.override)?\.md|CLAUDE\.md|GEMINI\.md|AGENT_OWNERSHIP\.md|EXECUTOR_HANDOFF_PROMPT\.md|22_CODEX_REVIEWER_HANDOFF\.md|EXECUTION_STATE_TEMPLATE\.md|EXECUTION_STATE\.md|IMPLEMENTATION_STATUS\.md)$|(^|\/)(\.codex|\.agents|\.claude|\.cursor)\//i;
const secrets=/(^|\/)\.env(?:\..*)?$|\.(?:pem|key|jks|keystore)$|(^|\/)(google-services\.json|GoogleService-Info\.plist|service-account[^/]*\.json|firebase-adminsdk[^/]*\.json)$/i;
const violations=files.filter(file=>(restricted.test(file)&&!allowed.has(file))||(secrets.test(file)&&!/^\.env(?:\..*)?\.example$/.test(file)));
if(violations.length)throw Error('Unexpected agent or credential files tracked:\n'+violations.join('\n'));
for(const file of allowed)if(!files.includes(file))throw Error('Missing portable handoff file: '+file);
console.log('Seven approved handoff files tracked; other agent/credential files remain excluded.');
