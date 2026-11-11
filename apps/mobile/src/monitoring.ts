export type MonitoringState={status:string;remaining_seconds:number;check_in:boolean;decision?:string;reason?:string;microphone?:boolean;audio_score?:number;windows?:number;inference_p95_ms?:number;native_pss_kb?:number;motion_available?:boolean;remote_consent?:string;phrase_recognition?:boolean;phrase_status?:string;last_phrase?:'HELP'|'BACHAO'|null;phrase_confidence?:number|null};
export function checkInMessage(decision?:string){
 if(decision==='HELP_CHECK_IN')return 'Heard “Help”. Please check in. No SOS was sent.';
 if(decision==='BACHAO_CHECK_IN')return 'Heard “Bachao / बचाओ”. Please check in. No SOS was sent.';
 return 'A sound or motion pattern prompted a check-in. No SOS was sent.';
}
