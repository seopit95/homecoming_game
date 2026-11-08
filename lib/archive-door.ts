import {localizedContext,localizedTexture} from './localized-canvas.ts';
import * as T from 'three';
import {surface,boxUV,softBox,sharePrintedTexture} from './materials.ts';
import {doorHardware} from './props.ts';
import {setDoorAngle} from './passage.ts';
import {segmentHitsSolid,solidContainsPoint,type Occupant} from './collision.ts';
import type {Solid,Target} from './world.ts';
import type {Story,Action} from './story.ts';

export function createArchiveDoor(root:T.Group,solids:Solid[],targets:Target[]){
 const frame=new T.Group();frame.name='archive-booth-door';frame.position.set(5.8,0,-16.55);frame.rotation.y=Math.PI/2;root.add(frame);
 const hinge=new T.Group();hinge.name='archive-booth-hinge';frame.add(hinge);
 const paint=surface('paintedMetal','#89938a',{roughness:.68,metalness:.15}),metal=surface('steel','#9ba39a',{roughness:.47,metalness:.62});
 const leaf=new T.Mesh(boxUV(softBox(1.30,2.28,.065,.006)),paint);leaf.position.set(.65,1.143,0);leaf.castShadow=leaf.receiveShadow=true;hinge.add(leaf);
 doorHardware(leaf,1.30);
 // Mirror only the handle, not the shared hinges or hydraulic closer.
 const rearHandle=new T.Group();rearHandle.scale.z=-1;
 for(const part of leaf.children)if(part.position.y<.05&&part.position.z>.04)rearHandle.add(part.clone());leaf.add(rearHandle);
 for(const side of [-1,1]){const plate=new T.Mesh(boxUV(softBox(1.15,.29,.006)),metal);plate.position.set(0,-.87,side*.036);leaf.add(plate);}
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;const ink=localizedContext(canvas)!;ink.fillStyle='#b9bdab';ink.fillRect(0,0,512,192);ink.fillStyle='#293b30';ink.textAlign='center';ink.textBaseline='middle';ink.font='65px sans-serif';ink.fillText('기록 편집실',256,76);ink.font='31px sans-serif';ink.fillText('사용 후 문을 닫아 주세요',256,143);
 const map=sharePrintedTexture(localizedTexture(new T.CanvasTexture(canvas)),['archive-booth-door-sign']);map.colorSpace=T.SRGBColorSpace;const signMaterial=new T.MeshStandardMaterial({map,roughness:.87});
 for(const front of [-1,1]){const sign=new T.Mesh(new T.PlaneGeometry(.65,.244),signMaterial);sign.position.set(0,.48,front*.033);sign.rotation.y=front<0?Math.PI:0;leaf.add(sign);}
 const block:Solid={x:5.8,z:-17.2,w:1.30,d:.075,y:1.143,h:2.28,yaw:Math.PI/2};solids.push(block);
 const target:Target={id:'archive_booth_door',label:'편집실 문 닫기',mesh:leaf,point:new T.Vector3()};targets.push(target);
 const portal:Solid={x:5.8,z:-17.2,w:.08,d:1.3};let last:number|undefined,pressAt=-1,pressure=0,announced=false,forced=0;
 const closed=(s:Pick<Story,'circuit'>)=>s.circuit.includes('archive_booth_close');
 const desired=(s:Pick<Story,'circuit'>)=>closed(s)?0:s.circuit.includes('archive_booth_open_out')?1.5:-1.5;
 function points(){leaf.updateWorldMatrix(true,false);target.point.set(.38,-.13,0).applyMatrix4(leaf.matrixWorld);}
 setDoorAngle(hinge,block,-1.5,.65);points();
 function update(time:number,story:Story,occupants:Occupant[]){
  const wanted=desired(story),dt=last===undefined?Infinity:Math.max(0,Math.min(.05,time-last));last=time;
  const angle=hinge.rotation.y+T.MathUtils.clamp(wanted-hinge.rotation.y,-1.8*dt,1.8*dt);setDoorAngle(hinge,block,angle,.65,0,occupants);points();target.label=closed(story)?'편집실 문 열기':'편집실 문 닫기';
  if(Math.abs(hinge.rotation.y-wanted)<.001)forced=0;
 }
 function press(from:{x:number;z:number},to:{x:number;z:number},now:number,story:Story):{cue:'knock'|'force';action?:Action}|null{
  const near=Math.hypot(from.x-5.8,from.z+17.2)<1.6;
  if(!closed(story)||!near||!segmentHitsSolid(from,to,portal,.43)){pressAt=-1;pressure=0;announced=false;return null;}
  const dt=pressAt<0||now-pressAt>.12?0:Math.max(0,now-pressAt);if(pressAt>=0&&now-pressAt>.12){pressure=0;announced=false;}pressAt=now;pressure+=dt;
  if(pressure>=1.8){pressure=0;announced=false;forced=from.x<5.8?-1:1;return {cue:'force',action:forced<0?'archive_booth_open_in':'archive_booth_open_out'};}
  if(!announced){announced=true;return {cue:'knock'};}return null;
 }
 function pushAside(player:Occupant,dt:number){
  if(!forced||dt<=0)return 0;
  const start=hinge.rotation.y,delta=T.MathUtils.clamp(forced*1.5-start,-1.8*dt,1.8*dt),steps=Math.max(1,Math.ceil(Math.abs(delta)/.025));
  for(let i=1;i<=steps;i++){
   const angle=start+delta*i/steps,swept={...block,x:5.8-Math.sin(angle)*.65,z:-16.55-Math.cos(angle)*.65,yaw:Math.PI/2+angle};
   if(solidContainsPoint(swept,player.x,player.z,player.r))return -forced*6*dt;
  }
  return 0;
 }
 return {hinge,leaf,block,update,press,pushAside,planningSolids:(all:Solid[])=>Math.abs(hinge.rotation.y)<1.35?all.filter(s=>s!==block):all,
  actionFrom:(from:{x:number},story:Story):Action=>closed(story)?from.x<5.8?'archive_booth_open_in':'archive_booth_open_out':'archive_booth_close',
  reset(){last=undefined;pressAt=-1;pressure=0;announced=false;forced=0;}};
}
