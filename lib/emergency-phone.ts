import * as T from 'three';
import {softBox,surface} from './materials.ts';
import {batchStaticGeometry} from './static-geometry.ts';

// Wall-mount hands-free call station; root z=0 touches the backing, front is +Z.
export function createEmergencyPhone(){
 const root=new T.Group();root.name='courtyard-emergency-phone';
 const metal=surface('steel','#99a29c',{metalness:.58,roughness:.52}),dark=new T.MeshStandardMaterial({color:'#202b2a',roughness:.8}),red=new T.MeshStandardMaterial({color:'#64372f',roughness:.55});
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const o=new T.Mesh(softBox(w,h,d,.005),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 box('phone-mount-plate',0,0,.006,.42,.60,.012,metal);box('phone-sealed-case',0,0,.055,.38,.56,.086,metal);box('phone-front-panel',0,0,.1005,.34,.50,.006,dark);
 box('phone-speaker-plate',0,.14,.105,.20,.19,.004,metal);
 const holeGeometry=new T.CircleGeometry(.0034,10);for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++){const o=new T.Mesh(holeGeometry,dark);o.position.set(x*.021,.14+y*.021,.1072);root.add(o);}
 function label(text:string,x:number,y:number,w:number,h:number){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const ctx=c.getContext('2d')!;ctx.fillStyle='#c3c6b3';ctx.font=`${c.height*.67}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.9}));o.position.set(x,y,.104);root.add(o);}
 function button(name:string,x:number,m:T.Material){const collar=new T.Mesh(new T.CylinderGeometry(.035,.035,.008,24),metal);collar.name='emergency-button-collar';collar.rotation.x=Math.PI/2;collar.position.set(x,-.12,.1055);root.add(collar);const o=new T.Mesh(new T.CylinderGeometry(.029,.031,.010,24),m);o.name=name;o.rotation.x=Math.PI/2;o.position.set(x,-.12,.111);o.castShadow=true;root.add(o);return o;}
 const call=button('emergency-call-button',-.082,metal),stop=button('emergency-stop-button',.082,red);label('통화',-.082,-.178,.075,.025);label('종료',.082,-.178,.075,.025);
 for(let x=-2;x<=2;x++){const o=new T.Mesh(holeGeometry,dark);o.position.set(x*.014,-.225,.1042);root.add(o);}
 for(const x of [-.173,.173])for(const y of [-.253,.253]){const screw=new T.Mesh(new T.CylinderGeometry(.004,.004,.003,12),dark);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.100);root.add(screw);}
 const pilotMaterial=new T.MeshBasicMaterial({color:'#47604a'}),pilot=new T.Mesh(new T.CircleGeometry(.004,12),pilotMaterial);pilot.position.set(.14,-.016,.1042);root.add(pilot);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d')!,map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 const display=new T.Mesh(new T.PlaneGeometry(.25,.046),new T.MeshBasicMaterial({map,toneMapped:false}));display.name='emergency-call-display';display.position.set(-.012,-.016,.1042);root.add(display);let previous='';
 function setState(state:'idle'|'ringing'|'connected'|'complete',pressed=''){
  call.position.z=pressed==='court_phone'?.108:.111;stop.position.z=pressed==='court_hangup'?.108:.111;
  pilotMaterial.color.set(state==='ringing'?'#b39752':state==='connected'?'#84ad73':'#47604a');
  const text=state==='ringing'?'연결 중':state==='connected'?'수신 중':state==='complete'?'기록 17 · 통화 종료':'야간 당직 17';
  if(text===previous)return;previous=text;ctx.fillStyle='#11231c';ctx.fillRect(0,0,512,96);ctx.fillStyle='#b2c4a5';ctx.font='46px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);map.needsUpdate=true;
 }
 setState('idle');batchStaticGeometry(root,[call,stop,display]);return {root,call,stop,setState};
}
