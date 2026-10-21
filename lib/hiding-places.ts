import * as T from 'three';
import type {Area} from './story.ts';
import type {Bounds,Solid,Target} from './world.ts';
import {surface,softBox,boxUV} from './materials.ts';
import {solidContainsPoint} from './collision.ts';
import {findPath,pursuerRadius} from './navigation.ts';
import {batchStaticGeometry} from './static-geometry.ts';

export type HidingPlace={root:T.Group;target:Target;eye:T.Vector3;exit:T.Vector3;approach:T.Vector3;pass:T.Vector3;sweep:T.Vector3[];yaw:number;doorOpen:number;setOpen:(value:number)=>void};
// Backed against existing walls. The straight 28F gallery is a dedicated escape runway.
const placements:Partial<Record<Area,readonly [number,number,number][]>>={
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
  // Bifold leaves fold into the sides, leaving the player's head and the hall clear.
  const leaves:{hinge:T.Group;fold:T.Group;solids:Solid[];side:number}[]=[];
  for(const side of [-1,1]){
   const hinge=new T.Group();hinge.name='shelter-door';hinge.position.set(side*.52,0,.43);cabinet.add(hinge);
   const fold=new T.Group();fold.name='shelter-door-fold';fold.position.x=-side*.26;hinge.add(fold);const colliders:Solid[]=[];
   for(const [index,parent] of [hinge,fold].entries()){
    const a=-side*.13;
    for(const dx of [-.12,.12])box('',a+dx,1.04,0,.02,2.08,.022,shell,false,parent);
    box('',a,.32,0,.24,.64,.022,shell,false,parent);box('',a,1.8,0,.24,.56,.022,shell,false,parent);
    const slats=new T.Group();slats.name='shelter-peek-slats';parent.add(slats);for(const y of [.68,.81,.94,1.07,1.20,1.33,1.46])box('',a,y,0,.24,.022,.026,shell,false,slats);
    if(index===1)box('',-side*.04,1.02,.035,.025,.19,.025,shell,false,parent);
    const solid:Solid={x:0,z:0,y:floor+1.04,w:.26,h:2.08,d:.022,yaw:ry};solids.push(solid);colliders.push(solid);batchStaticGeometry(slats,[]);batchStaticGeometry(parent,[]);
   }
   leaves.push({hinge,fold,solids:colliders,side});
  }
  const exit=new T.Vector3(x+.96*s,heightAt(x+.96*s,z+.96*c),z+.96*c),eye=new T.Vector3(x-.14*s,floor+1.25,z-.14*c),approach=exit.clone();
  const target:Target={id:'shelter',label:area==='parking'?'정비 보관함 안에 숨기':'청소도구함 안에 숨기',mesh:cabinet,point:new T.Vector3(x+.49*s,floor+1.12,z+.49*c)};
  cabinet.userData.approach={x:exit.x,z:exit.z};targets.push(target);
  const place:HidingPlace={root:cabinet,target,eye,exit,approach,pass:exit.clone(),sweep:[],yaw:ry+Math.PI,doorOpen:0,setOpen(value){
   place.doorOpen=T.MathUtils.clamp(value,0,1);
   for(const {hinge,fold,solids:panels,side} of leaves){
    const angle=-side*place.doorOpen*Math.PI/2;hinge.rotation.y=angle;fold.rotation.y=-2*angle;fold.position.z=.028*place.doorOpen;
    for(const [index,solid] of panels.entries()){
     const rotation=index?-angle:angle,offset=index?-.26*side:0,depth=index?fold.position.z:0;
     const a=side*.52+offset*Math.cos(angle)+depth*Math.sin(angle)-side*.13*Math.cos(rotation),b=.43-offset*Math.sin(angle)+depth*Math.cos(angle)+side*.13*Math.sin(rotation);
     solid.x=x+a*c+b*s;solid.z=z-a*s+b*c;solid.yaw=ry+rotation;
    }
   }
  }};place.setOpen(0);cabinet.userData.shelter=place;result.push(place);batchStaticGeometry(cabinet,[]);
 }
 const free=(p:T.Vector3)=>p.x>(bounds.minX??-bounds.x)&&p.x<bounds.x&&Math.abs(p.z)<bounds.z&&!solids.some(b=>solidContainsPoint(b,p.x,p.z,pursuerRadius));
 for(const place of result){
  const ry=place.root.rotation.y,c=Math.cos(ry),s=Math.sin(ry),candidates=[[c*5,-s*5],[-c*5,s*5],[s*4,c*4],[c*8,-s*8],[-c*8,s*8]];
  for(const [dx,dz] of candidates){const p=place.exit.clone().add(new T.Vector3(dx,0,dz));if(free(p)&&findPath(place.approach,p,solids,bounds,pursuerRadius).length){place.pass=p;break;}}
  // Search from one side, then physically cross the view before disappearing.
  const direction=(place.pass.x-place.exit.x)*c-(place.pass.z-place.exit.z)*s<0?-1:1;
  for(const front of [1.3,1.55,.96])for(const span of [.85,.65]){
   if(place.sweep.length)break;
   const points=[-direction*span,direction*span].map(a=>new T.Vector3(place.root.position.x+a*c+front*s,0,place.root.position.z-a*s+front*c));points.forEach(p=>p.y=heightAt(p.x,p.z));
   if(points.every(free)&&findPath(points[0],points[1],solids,bounds,pursuerRadius).length&&findPath(place.approach,points[0],solids,bounds,pursuerRadius).length&&findPath(points[1],place.pass,solids,bounds,pursuerRadius).length){place.sweep=points;place.approach.copy(points[0]);}
  }
 }
 return result;
}
