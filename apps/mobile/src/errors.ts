export function errorText(value:unknown,fallback='Could not complete this action. Please retry.'){
 if(value&&typeof value==='object'&&'code' in value){
  const code=String(value.code);
  if(code==='UNAUTHENTICATED')return 'Your sign-in needs verification. Verify this account again before retrying.';
  if(code==='NETWORK_UNAVAILABLE')return 'Cannot reach the server. Check your internet connection and retry.';
  if(code==='RECENT_AUTH_REQUIRED')return 'Verify your phone again before changing private account settings.';
  if(code==='PERMISSION_UNAVAILABLE')return 'A required permission is off. Review this feature in phone settings.';
 }
 return value instanceof Error?value.message:fallback;
}
