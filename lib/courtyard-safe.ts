import {localizedContext,localizedTexture} from './localized-canvas.ts';
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
 const leaf=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2,steps:1}),steel);leaf.name='safe-door-leaf';leaf.position.set(.42,.41,0);leaf.castShadow=leaf.receiveShadow=true;hinge.add(leaf);covers.push(leaf);
 const keyhole=box(hinge,'safe-keyhole',.42,.36,.04,.012,.027,.006,dark);
 const handle=box(hinge,'safe-unlock-handle',.42,.22,.076,.18,.035,.04,dark);for(const x of [.35,.49])box(hinge,'safe-handle-mount',x,.22,.055,.025,.05,.036,steel);
 for(const y of [.18,.64]){const pin=new T.Mesh(new T.CylinderGeometry(.016,.016,.11,16),steel);pin.position.set(-.008,y,.02);hinge.add(pin);}
 function paper(text:string,x:number,y:number,z:number,w:number,h:number){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const ink=localizedContext(c)!;ink.fillStyle='#bdb59b';ink.fillRect(0,0,c.width,c.height);ink.fillStyle='#292e27';const lines=text.split('\n'),base=c.height*.12;ink.font=`${base}px sans-serif`;const size=base*Math.min(1,c.width*.88/Math.max(...lines.map(line=>ink.measureText?.(line)?.width??[...line].length*base))),row=size*1.75;ink.font=`${size}px sans-serif`;ink.textAlign='center';ink.textBaseline='middle';lines.forEach((line,i)=>ink.fillText(line,c.width/2,c.height/2+(i-(lines.length-1)/2)*row));const tex=localizedTexture(new T.CanvasTexture(c));tex.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.95}));o.name='safe-handover-note';o.position.set(x,y,z);root.add(o);return o;}
 paper('2803호 차량 소유자 요청\n「입차 직후 9초 지워 주세요」\n삭제 접수 거절 · 원본 보존\n서명: 2803호',-.23,.47,-.5146,.26,.24);
 roundPipe(root,[.08,.63,-.515],[.08,.63,-.397],.004,steel);roundPipe(root,[.08,.63,-.397],[.08,.61,-.397],.004,steel);
 const key=new T.Group();key.name='courtyard-basement-key';key.position.set(.08,.60,-.397);root.add(key);
 const ring=new T.Mesh(new T.TorusGeometry(.026,.0035,8,24),steel);ring.name='basement-key-ring';key.add(ring);
 const head=new T.Mesh(new T.TorusGeometry(.012,.0035,8,20),brass);head.position.y=-.035;head.rotation.y=Math.PI/2;key.add(head);box(key,'basement-key-shaft',0,-.085,0,.008,.075,.006,brass);for(const y of [-.106,-.116])box(key,'basement-key-tooth',.006,y,0,.014,.007,.006,brass);
 const block:Solid={x:24.995,y:1.22,z:30.3055,w:.848,h:.748,d:.043};let opened=-1;
 function update(stage:string,time:number,story:Story,occupants:Occupant[]=[]){
  const current=stage==='dying'||stage==='ended'?story.resume:stage;
  const open=['court_safe_open','court_unlocked','court_departure'].includes(current),legacyKey=current==='court_unlocked'||current==='court_departure';
  if(open&&opened<0)opened=time;if(open)setDoorAngle(hinge,block,-1.82*T.MathUtils.smoothstep(time-opened,0,1.05),.42,.0175,occupants);
  key.visible=!story.notes.includes('court_key')&&!legacyKey;
 }
 function reset(){opened=-1;key.visible=true;hinge.rotation.y=0;}
 const keyRay=new T.Raycaster(),keyPoint=new T.Vector3(),keyDirection=new T.Vector3();
 function keyVisibleFrom(eye:T.Vector3){root.updateWorldMatrix(true,true);key.getWorldPosition(keyPoint);keyDirection.copy(keyPoint).sub(eye);keyRay.set(eye,keyDirection.normalize());keyRay.far=eye.distanceTo(keyPoint)-.015;return keyRay.intersectObjects(covers,false).length===0;}
 return {root,hinge,leaf,keyhole,handle,key,block,update,reset,keyVisibleFrom};
}
