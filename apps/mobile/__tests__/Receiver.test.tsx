import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {AppState,type AppStateStatus} from 'react-native';
import {Inbox} from '../src/Inbox';
import {useReceiver,type ReceiverState} from '../src/receiver';
const mockRequest=jest.fn();
jest.mock('../specs/NativeSafety',()=>({__esModule:true,default:{apiRequest:(...args:unknown[])=>mockRequest(...args)}}));
let listeners:Set<(state:AppStateStatus)=>void>;
beforeEach(()=>{
 jest.useFakeTimers();mockRequest.mockReset();listeners=new Set();AppState.currentState='active';
 jest.spyOn(AppState,'addEventListener').mockImplementation((_event,callback)=>{listeners.add(callback);return {remove:()=>listeners.delete(callback)};});
});
afterEach(()=>{jest.restoreAllMocks();jest.useRealTimers();});
const inbox:ReceiverState={invitations:[],alerts:[],consents:[],updated:Date.now(),error:'',reload:jest.fn()};
const alert={grant_id:'grant-a',kind:'SOS_READ' as const,shared_name:'Synthetic sibling',started_at:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString()};
const detail={grant_id:'grant-a',kind:'SOS_READ',journey:null,event:{shared_name:'Synthetic sibling',started_at:alert.started_at,position:{lat:26.85,lon:80.946,captured_at:alert.started_at,accuracy_m:12},own_acknowledgement:'PENDING',assisting_count:0}};
function button(tree:Renderer.ReactTestRenderer,label:string){return tree.root.findAll(n=>n.props?.accessibilityRole==='button'&&n.props?.accessibilityLabel===label)[0];}
test('recipient opens SOS, responds in-app, and immediately hides location on revocation',async()=>{
 mockRequest.mockImplementation(async(_path:string,method:string)=>JSON.stringify(method==='POST'?{}:detail));
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<Inbox inbox={{...inbox,alerts:[alert]}}/>);});
 await act(async()=>button(tree!,'Open received SOS').props.onPress());expect(button(tree!,'View shared location in Maps')).toBeDefined();
 await act(async()=>button(tree!,'I can help').props.onPress());
 expect(mockRequest).toHaveBeenCalledWith('/received-alerts/grant-a/acknowledge','POST',JSON.stringify({can_assist:true}),'','{}');
 mockRequest.mockRejectedValue(Object.assign(new Error('Action could not complete. Check permissions and connection.'),{code:'GRANT_REVOKED'}));
 await act(async()=>{jest.advanceTimersByTime(2000);});
 expect(button(tree!,'View shared location in Maps')).toBeUndefined();expect(button(tree!,'I can help')).toBeUndefined();
 expect(JSON.stringify(tree!.toJSON())).toContain('Sharing has ended');await act(async()=>tree!.unmount());
});
test('accept is an explicit action using the invitation ID, without tracking tokens or sharing recipient GPS',async()=>{
 mockRequest.mockResolvedValue('{}');
 const invitation={invite_id:'invite-a',contact_id:'contact-a',owner_display_name:'Synthetic sibling',expires_at:alert.expires_at,status:'PENDING' as const};
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<Inbox inbox={{...inbox,invitations:[invitation]}}/>);});
 expect(mockRequest).not.toHaveBeenCalled();
 await act(async()=>button(tree!,'Accept invitation').props.onPress());
 expect(mockRequest).toHaveBeenCalledWith('/contacts/invitations/invite-a/accept','POST','{"consent_version":"consent-v1"}','','{}');
 await act(async()=>tree!.unmount());
});
test('foreground inbox polls automatically, pauses in background and resumes immediately',async()=>{
 let state:ReceiverState;const contacts=jest.fn();
 function Probe(){state=useReceiver('recipient-a',contacts);return null;}
 mockRequest.mockImplementation(async(path:string)=>JSON.stringify({items:path==='/received-alerts'?[alert]:[]}));
 let tree:Renderer.ReactTestRenderer;await act(async()=>{tree=Renderer.create(<Probe/>);});
 expect(state!.alerts).toHaveLength(1);expect(mockRequest).toHaveBeenCalledTimes(4);
 await act(async()=>{jest.advanceTimersByTime(2000);});expect(mockRequest).toHaveBeenCalledTimes(8);
 await act(async()=>{listeners.forEach(fn=>fn('background'));});expect(state!.alerts).toHaveLength(0);
 await act(async()=>{jest.advanceTimersByTime(10000);});expect(mockRequest).toHaveBeenCalledTimes(8);
 await act(async()=>{listeners.forEach(fn=>fn('active'));});expect(mockRequest).toHaveBeenCalledTimes(12);
 await act(async()=>tree!.unmount());
});
test('late requests from an old account cannot populate the next account inbox or contacts',async()=>{
 let finish:(value:string)=>void;const old=new Promise<string>(resolve=>{finish=resolve;});let state:ReceiverState;const contacts=jest.fn();
 function Probe({uid}:{uid:string}){state=useReceiver(uid,contacts);return null;}
 mockRequest.mockReturnValue(old);let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<Probe uid="old"/>);});
 mockRequest.mockResolvedValue('{"items":[]}');await act(async()=>{tree!.update(<Probe uid="new"/>);});expect(state!.alerts).toHaveLength(0);
 contacts.mockClear();await act(async()=>finish!(JSON.stringify({items:[alert]})));
 expect(state!.alerts).toHaveLength(0);expect(contacts).not.toHaveBeenCalled();await act(async()=>tree!.unmount());
});
test('backgrounding a selected alert hides the shared position',async()=>{
 mockRequest.mockResolvedValue(JSON.stringify(detail));let tree:Renderer.ReactTestRenderer;
 await act(async()=>{tree=Renderer.create(<Inbox inbox={{...inbox,alerts:[alert]}}/>);});
 await act(async()=>button(tree!,'Open received SOS').props.onPress());expect(button(tree!,'View shared location in Maps')).toBeDefined();
 await act(async()=>{listeners.forEach(fn=>fn('background'));});expect(button(tree!,'View shared location in Maps')).toBeUndefined();
 await act(async()=>tree!.unmount());
});
