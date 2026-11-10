import {execFileSync} from 'node:child_process';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const restricted=/(^|\/)(AGENTS(?:\.override)?\.md|CLAUDE\.md|GEMINI\.md|AGENT_OWNERSHIP\.md|EXECUTOR_HANDOFF_PROMPT\.md|22_CODEX_REVIEWER_HANDOFF\.md|EXECUTION_STATE_TEMPLATE\.md|EXECUTION_STATE\.md|IMPLEMENTATION_STATUS\.md|PC_TRANSFER\.md)$|(^|\/)(\.codex|\.agents|\.claude|\.cursor)\//i;
const secret=/(^|\/)\.env(?:\..*)?$|\.(?:pem|key|jks|keystore)$|(^|\/)(google-services\.json|GoogleService-Info\.plist|service-account[^/]*\.json|firebase-adminsdk[^/]*\.json)$/i;
const invalid=paths.filter(p=>restricted.test(p)||(secret.test(p)&&!/^\.env(?:\..*)?\.example$/.test(p)));
if(invalid.length)throw Error('Forbidden application-branch paths: '+invalid.join(', '));
console.log('Application branch excludes agent context and credential files.');
