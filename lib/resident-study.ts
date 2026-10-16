import * as T from 'three';
import {writingTable} from './props.ts';
import {boxUV,softBox} from './materials.ts';
import {solidContainsPoint,type Occupant} from './collision.ts';
import type {Solid,Target} from './world.ts';

// The study has a real hollow drawer. Its panels, contents, input points and
// collision move together; actors can hold the drawer short of its full travel.
export function createResidentStudy(wood:T.Material){
 const root=writingTable(2,.81,.65,wood);root.name='resident-study-desk';root.position.set(3,0,-4.65);
 const hardware=new T.MeshStandardMaterial({color:'#8c8c7b',metalness:.64,roughness:.44}),paper=new T.MeshStandardMaterial({color:'#c3b99c',roughness:.94});
 const solids:Solid[]=[{x:3,y:.75,z:-4.65,w:2,h:.12,d:.65}];
 for(const x of [-.82,.82]){for(const z of [-.22,.22])solids.push({x:3+x,y:.345,z:-4.65+z,w:.085,h:.69,d:.085});solids.push({x:3+x,y:.605,z:-4.65,w:.065,h:.17,d:.53});}
 solids.push({x:3,y:.605,z:-4.87,w:1.88,h:.17,d:.055});
 const drawer=new T.Group();drawer.name='resident-study-drawer';root.add(drawer);const moving:{solid:Solid;z:number;factor:number}[]=[],middleRails:T.Mesh[]=[];
 function box(parent:T.Object3D,name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,collision=false){const mesh=new T.Mesh(boxUV(softBox(w,h,d,.002),x+3,y,z-4.65),m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);if(collision){const solid={x:3+x,y,z:-4.65+z,w,h,d};solids.push(solid);moving.push({solid,z:solid.z,factor:parent===drawer?1:0});}return mesh;}
 box(drawer,'resident-drawer-bottom',0,.546,.07,.618,.014,.426,wood,true);
 for(const x of [-.3,.3])box(drawer,'resident-drawer-side',x,.615,.07,.018,.124,.4,wood,true);
 box(drawer,'resident-drawer-back',0,.615,-.13,.6,.124,.018,wood,true);box(drawer,'resident-drawer-front',0,.621,.285,.64,.136,.026,wood,true);
 const handle=box(drawer,'resident-drawer-handle',0,.621,.322,.16,.018,.018,hardware);
 for(const x of [-.064,.064])box(drawer,'resident-handle-post',x,.621,.306,.012,.016,.018,hardware);
 // Three nested runners keep substantial overlap at the full 46 cm travel.
 // Their brackets bear directly on the existing 69 cm desk underside.
 for(const side of [-1,1]){
  box(root,'resident-drawer-fixed-rail',side*.326,.612,.06,.008,.032,.5,hardware,true);
  const middle=box(root,'resident-drawer-middle-rail',side*.3185,.612,.06,.007,.03,.48,hardware,true);moving.at(-1)!.factor=.5;middleRails.push(middle);
  box(drawer,'resident-drawer-inner-rail',side*.312,.612,.06,.006,.028,.46,hardware,true);
  for(const z of [-.15,.25])box(root,'resident-drawer-rail-mount',side*.326,.656,z,.03,.068,.04,hardware,true);
 }
 const key=new T.Group();key.name='resident-study-key';key.position.set(.03,.553,.12);drawer.add(key);
 const brass=new T.MeshStandardMaterial({color:'#9d8450',roughness:.42,metalness:.76}),tag=new T.MeshStandardMaterial({color:'#6b7b6d',roughness:.68});
 const ring=new T.Mesh(new T.TorusGeometry(.017,.0018,8,32),brass);ring.rotation.x=Math.PI/2;ring.position.set(.014,.0018,0);key.add(ring);
 const shape=new T.Shape();for(const [i,[x,z]] of [[-.056,-.004],[-.033,-.004],[-.033,-.009],[-.023,-.009],[-.023,-.004],[.002,-.004],[.002,.004],[-.056,.004]].entries())i?shape.lineTo(x,-z):shape.moveTo(x,-z);shape.closePath();
 const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.0028,bevelEnabled:true,bevelSize:.0004,bevelThickness:.0004,bevelSegments:1,steps:1}),brass);blade.rotation.x=-Math.PI/2;blade.position.y=.0006;blade.castShadow=true;key.add(blade);
 const keyTag=box(key,'resident-study-key-tag',.065,.00225,0,.07,.0045,.035,tag);
 function ink(text:string,w:number,h:number,font:number){const c=document.createElement('canvas');c.width=w;c.height=h;const p=c.getContext('2d')!;p.fillStyle='#c2b99d';p.fillRect(0,0,w,h);p.fillStyle='#313a31';p.textAlign='center';p.textBaseline='middle';p.font=`${font}px "Apple SD Gothic Neo",sans-serif`;const lines=text.split('\n');lines.forEach((line,i)=>p.fillText(line,w/2,h/2+(i-(lines.length-1)/2)*font*1.45));const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:.93});}
 const tagInk=new T.Mesh(new T.PlaneGeometry(.058,.026),ink('1703',256,128,62));tagInk.rotation.x=-Math.PI/2;tagInk.position.set(.065,.0046,0);key.add(tagInk);
 box(root,'resident-shift-cover',.5,.813,0,.43,.006,.30,wood);box(root,'resident-shift-pages',.5,.82,0,.414,.008,.286,paper);
 const page=new T.Mesh(new T.PlaneGeometry(.402,.274),ink('야간 당직 · 한서연\n1703호 임시 관리실\n\n연결문 여벌 열쇠는\n책상 가운데 서랍\n\n내일 오후 두 시. 꼭 갈 것.',1024,768,48));page.name='resident-shift-page';page.rotation.x=-Math.PI/2;page.position.set(.5,.8242,0);root.add(page);
 const targets:Target[]=[{id:'resident_drawer',label:'서재 책상 · 가운데 서랍 당기기',mesh:handle,point:new T.Vector3()},{id:'resident_key',label:'1703호 연결문 열쇠 챙기기',mesh:keyTag,point:new T.Vector3(),precise:true},{id:'resident_shift',label:'한서연의 야간 당직 수첩 읽기',mesh:page,point:new T.Vector3()}];
 for(const t of targets)t.mesh.userData.approach={x:t.id==='resident_shift'?3.5:3.06,z:-3.1};
 const opaque:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&!key.getObjectById(o.id)&&!Array.isArray(o.material)&&!o.material.transparent)opaque.push(o);});
 const ray=new T.Raycaster(),direction=new T.Vector3();let last:number|undefined;
 function points(){for(const t of targets){t.mesh.getWorldPosition(t.point);if(t.id==='resident_key')t.point.y+=.0024;}}
 function keyVisibleFrom(eye:T.Vector3){if(!key.visible||drawer.position.z<.22)return false;root.updateWorldMatrix(true,true);points();direction.copy(targets[1].point).sub(eye);const distance=direction.length();if(distance<.01)return false;ray.set(eye,direction.normalize());ray.near=.005;ray.far=distance-.003;return !ray.intersectObjects(opaque,false).length;}
 function update(time:number,notes:readonly string[],occupants:Occupant[]=[]){const dt=last===undefined?1/60:T.MathUtils.clamp(time-last,0,.05);last=time;key.visible=!notes.includes('resident_key');if(notes.includes('resident_drawer')){const next=Math.min(.46,drawer.position.z+dt*.6),volume={x:3,z:-4.58+next,w:.66,d:.46};if(!occupants.some(p=>solidContainsPoint(volume,p.x,p.z,p.r+.015)))drawer.position.z=next;}for(const rail of middleRails)rail.position.z=.06+drawer.position.z*.5;for(const m of moving)m.solid.z=m.z+drawer.position.z*m.factor;points();}
 function reset(){last=undefined;drawer.position.z=0;key.visible=true;for(const rail of middleRails)rail.position.z=.06;for(const m of moving)m.solid.z=m.z;points();}
 points();return {root,drawer,key,solids,targets,keyVisibleFrom,update,reset};
}
