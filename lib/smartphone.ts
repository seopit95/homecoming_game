import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {softBox} from './materials.ts';

export type PhoneState='idle'|'ringing'|'torch'|'voicemail'|'playing';
// One metre-scale device serves the bedside pickup, held light and saved voice message.
export function createSmartphone(){
 const root=new T.Group();root.name='smartphone';
 const shell=new T.Mesh(softBox(.074,.153,.009,.004),new T.MeshStandardMaterial({color:'#171c20',metalness:.55,roughness:.36}));shell.name='smartphone-case';shell.castShadow=shell.receiveShadow=true;root.add(shell);
 const canvas=typeof document==='undefined'?null:document.createElement('canvas');if(canvas){canvas.width=256;canvas.height=512;}const ctx=localizedContext(canvas),texture=canvas?localizedTexture(new T.CanvasTexture(canvas)):null;if(texture)texture.colorSpace=T.SRGBColorSpace;
 const display=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#aabac5',emissiveIntensity:.3,roughness:.3});
 const screen=new T.Mesh(new T.PlaneGeometry(.066,.141),display);screen.name='smartphone-screen';screen.position.z=.0047;root.add(screen);
 const island=new T.Mesh(softBox(.016,.003,.001,.0004),new T.MeshStandardMaterial({color:'#080b0d',roughness:.4}));island.position.set(0,.064,.0054);root.add(island);
 for(const y of [.056,.037]){const lens=new T.Mesh(new T.CylinderGeometry(.008,.008,.002,24),new T.MeshPhysicalMaterial({color:'#101b22',metalness:.7,roughness:.14,clearcoat:1}));lens.rotation.x=Math.PI/2;lens.position.set(-.023,y,-.0057);root.add(lens);}
 const led=new T.Mesh(new T.CircleGeometry(.003,16),new T.MeshStandardMaterial({color:'#ccc7b9',emissive:'#f2eee2',emissiveIntensity:0}));led.name='smartphone-rear-flash';led.rotation.y=Math.PI;led.position.set(-.004,.055,-.0068);root.add(led);
 const button=new T.Mesh(new T.BoxGeometry(.0015,.018,.003),new T.MeshStandardMaterial({color:'#555e64',metalness:.7,roughness:.4}));button.position.set(.0375,.014,0);root.add(button);
 let state:PhoneState|undefined;
 function setState(next:PhoneState){if(state===next)return;state=next;root.userData.phoneState=next;led.material.emissiveIntensity=next==='torch'?1:0;
  if(!ctx||!texture)return;
  ctx.fillStyle='#0c151d';ctx.fillRect(0,0,256,512);ctx.textAlign='center';ctx.fillStyle='#a6b6c3';ctx.font='42px sans-serif';ctx.fillText('03:17',128,112);ctx.font='18px sans-serif';ctx.fillStyle='#8499a7';ctx.fillText(next==='ringing'?'발신자 표시 제한':next==='voicemail'||next==='playing'?'저장된 음성 메시지':'9월 19일',128,163);
  ctx.font='17px sans-serif';ctx.fillText(next==='ringing'?'수신 전화':next==='torch'?'플래시 켜짐':next==='playing'?'03:16  ·  재생 중':next==='voicemail'?'▶  메시지 듣기':'',128,356);ctx.fillStyle=next==='ringing'?'#668978':'#354955';ctx.fillRect(78,419,100,3);texture.needsUpdate=true;
 }
 setState('idle');return {root,screen,led,setState};
}

export function createVoiceMessagePhone(){
 const phone=createSmartphone();phone.root.name='resident-smartphone';phone.root.rotation.x=-Math.PI/2;phone.setState('voicemail');
 return {root:phone.root,playButton:phone.screen,setPlayback(time:number|null){phone.setState(time===null?'voicemail':'playing');}};
}
