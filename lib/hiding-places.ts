import * as T from 'three';
import type {Area} from './story.ts';
import type {Bounds,Solid,Target} from './world.ts';
import {surface,softBox,boxUV} from './materials.ts';
import {solidContainsPoint} from './collision.ts';
import {findPath,pursuerRadius} from './navigation.ts';
import {batchStaticGeometry} from './static-geometry.ts';

export type HidingPlace={root:T.Group;target:Target;eye:T.Vector3;exit:T.Vector3;approach:T.Vector3;pass:T.Vector3;yaw:number};
// Backed against existing walls; no cabinets in the lift or its boarding space.
const placements:Partial<Record<Area,readonly [number,number,number][]>>={
 landing:[[.75,17,-Math.PI/2],[.75,7,-Math.PI/2],[.75,-17,-Math.PI/2]],
 corridor:[[2.8,0,-Math.PI/2],[-2.8,17,Math.PI/2]],
 stairs:[[-.5,-4.6,-Math.PI/2]],resident:[[3.75,-1.2,-Math.PI/2]],
 office:[[-5.1,4.8,Math.PI/2],[5.1,-6, -Math.PI/2]],
 annex:[[-16.25,4,Math.PI/2],[16.25,-13,-Math.PI/2]],
 courtyard:[[-30.7,12,Math.PI/2],[30.7,-12,-Math.PI/2]],
 archive:[[-14.25,3,Math.PI/2],[14.25,-14,-Math.PI/2]],
 plant:[[-16.25,3,Math.PI/2],[16.25,-14,-Math.PI/2]],
 parking:[[-11.2,7,Math.PI/2],[11.2,-6,-Math.PI/2],[-11.2,-20,Math.PI/2]],
};

export function addHidingPlaces(root:T.Group,area:Area,solids:Solid[],targets:Target[],bounds:Bounds,heightAt:(x:number,z:number)=>number):HidingPlace[]{
 if(!placements[area])return [];
 const result:HidingPlace[]=[],shell=surface('steel','#45554d',{roughness:.82,metalness:.32}),inside=new T.MeshStandardMaterial({color:'#101714',roughness:.96});
 for(const [index,[x,z,ry]] of (placements[area]??[]).entries()){
  const c=Math.cos(ry),s=Math.sin(ry),heights=[[-.56,-.43],[-.56,.43],[.56,-.43],[.56,.43]].map(([a,b])=>heightAt(x+a*c+b*s,z-a*s+b*c)),floor=Math.max(...heights),low=Math.min(...heights);
  const cabinet=new T.Group();cabinet.name=`shelter-${area}-${index}`;cabinet.position.set(x,floor,z);cabinet.rotation.y=ry;root.add(cabinet);
  function box(name:string,a:number,y:number,b:number,w:number,h:number,d:number,material:T.Material=shell,collision=false,parent:T.Object3D=cabinet){
   const mesh=new T.Mesh(boxUV(softBox(w,h,d,.002),a,y,b),material);mesh.name=name==='shelter-foundation'||name==='shelter-base'?name:'';mesh.position.set(a,y,b);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
   if(collision)solids.push({x:x+a*c+b*s,y:floor+y,z:z-a*s+b*c,w,h,d,yaw:ry});return mesh;
  }
  box('shelter-foundation',0,-(floor-low)/2-.015,0,1.12,floor-low+.03,.86,inside);
  for(const a of [-.54,.54])box('shelter-side',a,1.04,0,.04,2.08,.86,shell,true);
  box('shelter-back',0,1.04,-.41,1.04,2.08,.04,inside,true);box('shelter-top',0,2.06,0,1.04,.04,.86);box('shelter-base',0,.02,0,1.04,.04,.86,inside);
  for(const a of [-.49,.49])box('shelter-door-stile',a,1.04,.43,.10,2.08,.04);
  box('shelter-door-bottom',0,.54,.43,.88,1.08,.04);box('shelter-door-top',0,1.76,.43,.88,.64,.04);
  const slats=new T.Group();slats.name='shelter-peek-slats';cabinet.add(slats);for(const y of [1.10,1.19,1.28,1.37,1.44])box('shelter-louver',0,y,.43,.88,.033,.046,shell,false,slats);
  for(const y of [.18,1.88])box('shelter-hinge',-.49,y,.466,.055,.12,.024);
  box('shelter-handle',.36,1.02,.485,.025,.19,.04);box('shelter-label',0,1.72,.456,.36,.11,.012,inside);
  solids.push({x:x+.43*s,y:floor+1.04,z:z+.43*c,w:1.12,h:2.08,d:.04,yaw:ry});
  const exit=new T.Vector3(x+.96*s,heightAt(x+.96*s,z+.96*c),z+.96*c),eye=new T.Vector3(x,floor+1.25,z),approach=exit.clone();
  const target:Target={id:'shelter',label:area==='parking'?'정비 보관함 안에 숨기':'청소도구함 안에 숨기',mesh:cabinet,point:new T.Vector3(x+.49*s,floor+1.12,z+.49*c)};
  cabinet.userData.approach={x:exit.x,z:exit.z};targets.push(target);
  const place={root:cabinet,target,eye,exit,approach,pass:exit.clone(),yaw:ry+Math.PI};cabinet.userData.shelter=place;result.push(place);
  batchStaticGeometry(slats,[]);batchStaticGeometry(cabinet,[]);
 }
 const free=(p:T.Vector3)=>p.x>(bounds.minX??-bounds.x)&&p.x<bounds.x&&Math.abs(p.z)<bounds.z&&!solids.some(b=>solidContainsPoint(b,p.x,p.z,pursuerRadius));
 for(const place of result){
  const ry=place.root.rotation.y,c=Math.cos(ry),s=Math.sin(ry),candidates=[[c*5,-s*5],[-c*5,s*5],[s*4,c*4],[c*8,-s*8],[-c*8,s*8]];
  for(const [dx,dz] of candidates){const p=place.exit.clone().add(new T.Vector3(dx,0,dz));if(free(p)&&findPath(place.approach,p,solids,bounds,pursuerRadius).length){place.pass=p;break;}}
 }
 return result;
}
