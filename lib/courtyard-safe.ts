import * as T from 'three';
import {softBox,surface} from './materials.ts';
import {roundPipe} from './props.ts';
import {setDoorAngle} from './passage.ts';
import type {Solid} from './world.ts';
import type {Occupant} from './collision.ts';
import type {Story} from './story.ts';

export function createCourtyardSafe(){
 const root=new T.Group();root.name='courtyard-key-safe';root.position.set(25,.81,30.285);
 const steel=surface('steel','#68716b',{metalness:.55,roughness:.57}),dark=new T.MeshStandardMaterial({color:'#27312d',roughness:.85}),brass=new T.MeshStandardMaterial({color:'#8e7950',metalness:.7,roughness:.47});
 const covers:T.Mesh[]=[];
 function box(parent:T.Object3D,name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const o=new T.Mesh(softBox(w,h,d,.004),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);if(parent===root)covers.push(o);return o;}
 box(root,'safe-floor',0,.0175,-.275,.92,.035,.55,steel);box(root,'safe-top',0,.8025,-.275,.92,.035,.55,steel);
 for(const x of [-.4425,.4425])box(root,'safe-side',x,.41,-.275,.035,.75,.55,steel);box(root,'safe-back',0,.41,-.5325,.85,.75,.035,steel);
 const hinge=new T.Group();hinge.name='courtyard-safe-hinge';hinge.position.set(-.425,0,.003);root.add(hinge);
 const shape=new T.Shape();shape.moveTo(-.42,-.37);shape.lineTo(.42,-.37);shape.lineTo(.42,.37);shape.lineTo(-.42,.37);shape.closePath();
 const xs=[-.27,-.09,.09,.27];for(const x of xs){const h=new T.Path();h.moveTo(x-.0375,.145-.043);h.lineTo(x-.0375,.145+.043);h.lineTo(x+.0375,.145+.043);h.lineTo(x+.0375,.145-.043);h.closePath();shape.holes.push(h);}
 const leaf=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2,steps:1}),steel);leaf.name='safe-door-leaf';leaf.position.set(.42,.41,0);leaf.castShadow=leaf.receiveShadow=true;hinge.add(leaf);covers.push(leaf);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=1280;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#acaf97';ctx.fillRect(0,0,128,1280);ctx.fillStyle='#263129';ctx.font='90px monospace';ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<10;i++)ctx.fillText(String(i),64,(i+.5)*128);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.rotation=-Math.PI/2;const digits=new T.MeshStandardMaterial({map,roughness:.71});
 const wheels:T.Mesh[]=[];
 for(const x of xs){const axle=new T.Mesh(new T.CylinderGeometry(.006,.006,.112,12),steel);axle.rotation.z=Math.PI/2;axle.position.set(.42+x,.555,.005);hinge.add(axle);const axis=new T.Group();axis.position.copy(axle.position);axis.rotation.z=Math.PI/2;hinge.add(axis);const wheel=new T.Mesh(new T.CylinderGeometry(.052,.052,.055,40),digits);wheel.name='safe-number-wheel';axis.add(wheel);wheel.rotation.y=Math.PI/10;wheels.push(wheel);for(const side of [-1,1])box(hinge,'safe-index-mark',.42+x+side*.054,.555,.041,.018,.006,.003,dark);}
 const handle=box(hinge,'safe-unlock-handle',.42,.22,.076,.18,.035,.04,dark);for(const x of [.35,.49])box(hinge,'safe-handle-mount',x,.22,.055,.025,.05,.036,steel);
 for(const y of [.18,.64]){const pin=new T.Mesh(new T.CylinderGeometry(.016,.016,.11,16),steel);pin.position.set(-.008,y,.02);hinge.add(pin);}
 function paper(text:string,x:number,y:number,z:number,w:number,h:number){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const ink=c.getContext('2d')!;ink.fillStyle='#bdb59b';ink.fillRect(0,0,c.width,c.height);ink.fillStyle='#292e27';ink.font=`${c.height*.12}px sans-serif`;ink.textAlign='center';ink.textBaseline='middle';text.split('\n').forEach((line,i)=>ink.fillText(line,c.width/2,c.height*(.2+i*.2)));const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.95}));o.name='safe-handover-note';o.position.set(x,y,z);root.add(o);return o;}
 paper('사고 신고 녹음\n원본 보존\n차량 소유자 삭제 요청\n접수 거절',-.23,.47,-.5146,.26,.24);
 roundPipe(root,[.08,.63,-.515],[.08,.63,-.397],.004,steel);roundPipe(root,[.08,.63,-.397],[.08,.61,-.397],.004,steel);
 const key=new T.Group();key.name='courtyard-basement-key';key.position.set(.08,.60,-.397);root.add(key);
 const ring=new T.Mesh(new T.TorusGeometry(.026,.0035,8,24),steel);ring.name='basement-key-ring';key.add(ring);
 const head=new T.Mesh(new T.TorusGeometry(.012,.0035,8,20),brass);head.position.y=-.035;head.rotation.y=Math.PI/2;key.add(head);box(key,'basement-key-shaft',0,-.085,0,.008,.075,.006,brass);for(const y of [-.106,-.116])box(key,'basement-key-tooth',.006,y,0,.014,.007,.006,brass);
 const block:Solid={x:24.995,y:1.22,z:30.3055,w:.848,h:.748,d:.043};let opened=-1,lastCode='';
 function update(stage:string,time:number,story:Story,occupants:Occupant[]=[]){
  const current=stage==='dying'||stage==='ended'?story.resume:stage;
  const open=['court_safe_open','court_unlocked','court_departure'].includes(current),legacyKey=current==='court_unlocked'||current==='court_departure';
  if(open&&opened<0)opened=time;if(open)setDoorAngle(hinge,block,-1.82*T.MathUtils.smoothstep(time-opened,0,1.05),.42,.0175,occupants);
  key.visible=!story.notes.includes('court_key')&&!legacyKey;
  const code=story.code??'0000';if(code!==lastCode){lastCode=code;wheels.forEach((wheel,i)=>wheel.rotation.y=(Number(code[i])+.5)*Math.PI/5);}
 }
 function reset(){opened=-1;lastCode='';key.visible=true;hinge.rotation.y=0;}
 const keyRay=new T.Raycaster(),keyPoint=new T.Vector3(),keyDirection=new T.Vector3();
 function keyVisibleFrom(eye:T.Vector3){root.updateWorldMatrix(true,true);key.getWorldPosition(keyPoint);keyDirection.copy(keyPoint).sub(eye);keyRay.set(eye,keyDirection.normalize());keyRay.far=eye.distanceTo(keyPoint)-.015;return keyRay.intersectObjects(covers,false).length===0;}
 return {root,hinge,leaf,wheels,handle,key,block,update,reset,keyVisibleFrom};
}
