import type {TurboModule} from 'react-native';
import {TurboModuleRegistry,type CodegenTypes} from 'react-native';
export interface Spec extends TurboModule {
  initialize(config:string):Promise<string>;
  getAuthState():Promise<string>;
  startPhone(phone:string):Promise<string>;
  confirmPhone(code:string):Promise<string>;
  clearAccount():Promise<string>;
  apiRequest(path:string,method:string,body:string,key:string,headers:string):Promise<string>;
  activateSos(trigger:string):Promise<string>;
  getIntent(clientRequestId:string):Promise<string>;
  terminateIntent(clientRequestId:string,reason:string):Promise<string>;
  startLocation(purpose:string,resourceId:string,expiresAt:string):Promise<string>;
  stopLocation(purpose:string,resourceId:string):Promise<string>;
  getSafetyState():Promise<string>;
  startMonitoring(config:string):Promise<string>;
  stopMonitoring():Promise<string>;
  readonly onSafetyChange:CodegenTypes.EventEmitter<{client_request_id:string,state:string,event_id:string|null}>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeSafety');
