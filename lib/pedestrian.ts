import * as T from 'three';
import headData from './assets/pedestrian-head.json' with {type:'json'};
import {upholstery,livingMaterial} from './materials.ts';
import {livingHead,createLivingHair,createLivingShirt,poseLivingShirt} from './pedestrian-art.ts';
import {skinArm,poseSkinArm} from './ghost-limbs.ts';
import {extremity} from './ghost-anatomy.ts';
import {createLeatherShoe} from './entry-props.ts';
import {createVictimSkirt,poseVictimSkirt} from './victim-outfit.ts';

export function createPedestrian(parent:T.Group,appearance:'victim'|'driver'='victim'){
 const root=new T.Group();root.name='memory-pedestrian';parent.add(root);
 const pivot=new T.Group(),body=new T.Group();pivot.position.y=.87;body.position.y=-.87;root.add(pivot);pivot.add(body);
 const skin=new T.MeshStandardMaterial({color:'#b29987',roughness:.58}),coat=upholstery(appearance==='driver'?'#293544':'#66716d'),pants=upholstery('#333b3e'),hair=new T.MeshStandardMaterial({color:'#131919',roughness:.55});
 const add=(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D)=>{const m=new T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const torso=new T.Group();torso.position.y=.92;body.add(torso);
 const profile=[[-.13,.22],[0,.22],[.12,.19],[.3,.19],[.41,.205],[.47,.16],[.51,.065]].map(([y,r])=>new T.Vector2(r,y));
 if(appearance==='driver'){const jacket=add(new T.LatheGeometry(profile,40),coat,torso);jacket.scale.z=.64;}
 if(appearance==='driver'){const neck=add(new T.CylinderGeometry(.042,.049,.09,24),skin,torso);neck.position.y=.53;}
 const head=new T.Group();head.name='pedestrian-head';head.position.set(0,.565,0);torso.add(head);
 function anatomical(data:{position:number[];index:number[];normal:number[];uv:number[]},material:T.Material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);return add(g,material,head);}
 const face=anatomical(appearance==='victim'?livingHead:headData,appearance==='victim'?livingMaterial('skin'):skin.clone());face.name='pedestrian-anatomical-head';
 if(appearance==='driver'){const color:number[]=[];for(let i=0;i<headData.position.length;i+=3){const x=headData.position[i],y=headData.position[i+1],z=headData.position[i+2],lip=Math.exp(-((x/.026)**2+((y-.047)/.006)**2))*T.MathUtils.smoothstep(z,.075,.1);color.push(1,.97-lip*.23,.94-lip*.16);}face.geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));(face.material as T.MeshStandardMaterial).vertexColors=true;}
 const eyeMat=new T.MeshStandardMaterial({color:'#b5b1a4',roughness:.38});
 for(const eye of Object.values(headData.eyes)){
  anatomical(eye,eyeMat);
  const iris=add(new T.SphereGeometry(1,16,12),new T.MeshStandardMaterial({color:'#392d25',roughness:.35}),head);iris.scale.set(.0058,.0058,.0018);iris.position.set(eye.center[0],eye.center[1],.1053);
  const pupil=add(new T.SphereGeometry(.0024,12,8),hair,head);pupil.scale.z=.4;pupil.position.set(eye.center[0],eye.center[1],.107);
 }
 if(appearance==='victim')createLivingHair(head);
 else{
 // The distant CCTV driver retains the short fitted cap.
 const scalp=face.geometry.clone(),scalpIndex:number[]=[];
 for(let i=0;i<headData.index.length;i+=3){const tri=headData.index.slice(i,i+3),y=tri.reduce((sum,v)=>sum+headData.position[v*3+1],0)/3,z=tri.reduce((sum,v)=>sum+headData.position[v*3+2],0)/3;if(y>.137&&(z<.072||y>.174))scalpIndex.push(...tri);}
 scalp.setIndex(scalpIndex);const scalpPosition=scalp.getAttribute('position');for(let i=0;i<scalpPosition.count;i++)scalpPosition.setXYZ(i,scalpPosition.getX(i)*1.035,.1+(scalpPosition.getY(i)-.1)*1.035,.01+(scalpPosition.getZ(i)-.01)*1.035);add(scalp,hair,head);
 }
 if(appearance==='driver'){
 for(const side of [-1,1]){const lapel=add(new T.BoxGeometry(.077,.15,.015),coat,torso);lapel.position.set(side*.066,.397,.103);lapel.rotation.z=side*.32;}
 for(let i=0;i<4;i++){const b=add(new T.SphereGeometry(.007,10,8),hair,torso);b.scale.z=.4;b.position.set(0,.32-i*.1,.139);}
 }
 const arms:T.Group[]=[],elbows:T.Group[]=[],wrists:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[],sleeves:T.Mesh[]=[],trousers:T.Mesh[]=[];
 for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*.194,.405,0);torso.add(arm);arms.push(arm);
  const elbow=new T.Group();elbow.position.y=-.27;arm.add(elbow);elbows.push(elbow);
  const wrist=new T.Group();wrist.name=side===-1?'pedestrian-carry-hand':'pedestrian-free-hand';wrist.position.y=-.25;elbow.add(wrist);wrists.push(wrist);wrist.add(extremity('hand',side,new T.MeshStandardMaterial({color:'#b49e8b',roughness:.65}),false));
  if(appearance==='driver'){const sleeve=skinArm(body,coat);sleeve.name='pedestrian-sleeve';sleeve.userData.radii=[.07,.062,.049,.045,.032];sleeves.push(sleeve);}
  const leg=new T.Group();leg.position.set(side*.093,.87,0);body.add(leg);legs.push(leg);
  const knee=new T.Group();knee.position.y=-.405;leg.add(knee);knees.push(knee);
  const ankle=new T.Group();ankle.position.y=-.405;knee.add(ankle);ankles.push(ankle);
  const legMesh=skinArm(body,appearance==='victim'?skin:pants);legMesh.name=appearance==='victim'?'pedestrian-leg-skin':'pedestrian-trouser-leg';legMesh.userData.radii=appearance==='victim'?[.078,.067,.045,.046,.03]:[.096,.085,.062,.062,.039];trousers.push(legMesh);
  const shoe=createLeatherShoe();shoe.name=side===1?'memory-shoe':'memory-other-shoe';shoe.position.y=-.06;ankle.add(shoe);
 }
 const clothes=appearance==='victim'?createLivingShirt(torso):null,skirt=clothes?createVictimSkirt(torso,clothes.shirt.material):null,supportBounds=new T.Box3();
 const observerLook=new T.Quaternion(),observerAngles=new T.Euler();
 function pose(clock:number,hit:number|null,speed=1.37,observer?:{crouched:boolean;pitch:number;leanX?:number;leanZ?:number}){
  const phase=(observer&&speed===0?0:clock)/.92,beat=phase*Math.PI*2,impact=hit!==null,wrap=impact?T.MathUtils.smoothstep(hit,0,.44):0,slide=impact?T.MathUtils.smoothstep(hit,.45,1.55):0;
  const rest=impact?T.MathUtils.smoothstep(hit,1.6,3):0;
  // Solve feet in the body's frame: a supporting foot travels backwards by
  // exactly the root's advance. Swing is lifted, with matching takeoff/landing velocity.
  const crouch=observer?.crouched?1:0,stance=.6,travel=speed*.92*stance*(crouch?.35:1),feet=[0,.5].map(offset=>{
   const u=((phase+offset)%1+1)%1,v=(u-stance)/(1-stance);
   return {planted:u<stance,z:u<stance?travel*(.5-u/stance):travel*(T.MathUtils.smoothstep(v,0,1)-.5)-speed*.92*(1-stance)*v*(1-v)*(1-2*v),y:.064+(u<stance?0:.115*Math.sin(v*Math.PI))};
  });
  const support=Math.min(...feet.filter(f=>f.planted).map(f=>Math.abs(f.z)));
  body.position.y=.064+Math.sqrt((.81-.64*crouch)**2-support**2)-.005-pivot.position.y-legs[0].position.y;
  // A deep crouch sits behind the heels, keeping the knees above the floor.
  body.position.z=-.18*crouch;
  pivot.rotation.set(-.15*slide*(1-slide),0,1.3*wrap+.24*slide);
  torso.rotation.set(T.MathUtils.lerp(Math.sin(beat)*.012,-.13,wrap),0,Math.sin(beat)*.012*(1-wrap)+.19*wrap*(1-slide));
  head.rotation.set(T.MathUtils.lerp(.015,-.22,wrap),T.MathUtils.lerp(.25,-.38,wrap),-.14*wrap*(1-slide));
  if(observer){torso.rotation.x+=.08*crouch+(observer.leanX??0);torso.rotation.z+=observer.leanZ??0;head.quaternion.copy(torso.quaternion).invert().multiply(observerLook.setFromEuler(observerAngles.set(-observer.pitch,0,0)));}
  for(let i=0;i<2;i++){
   const y=feet[i].y,z=feet[i].z+.18*crouch;
   const dy=y-(pivot.position.y+body.position.y+legs[i].position.y),distance=Math.min(.809,Math.hypot(dy,z));
   const knee=2*Math.acos(distance/.81),hip=Math.atan2(-z,-dy)-knee/2;
   legs[i].rotation.set(T.MathUtils.lerp(hip,-.15+(i?-.36:.22),wrap),0,0);
   knees[i].rotation.x=T.MathUtils.lerp(knee,.48+(i?.28:.08)*slide,wrap);
   ankles[i].rotation.x=-legs[i].rotation.x-knees[i].rotation.x;
   const swing=Math.sin(beat+i*Math.PI);
   arms[i].rotation.set(T.MathUtils.lerp(-swing*(i?.24:.07),-.8+(i?.35:-.1)*slide,wrap),(i?.3:-.3)*wrap*(1-slide),(i?.55:-.55)*wrap*(1-slide));
   arms[i].position.z=i===1?.04*rest:0;
   elbows[i].rotation.set(T.MathUtils.lerp(-.18,-1.3,wrap),0,0);wrists[i].rotation.x=-.25*wrap;
   if(i===1&&rest>0){
    // Roll the shoulder forward before lowering the elbow across the front of
    // the chest, keeping the upper sleeve outside the torso as the palm settles.
    arms[i].rotation.x=T.MathUtils.lerp(arms[i].rotation.x,-1.3,rest);arms[i].rotation.z=T.MathUtils.lerp(arms[i].rotation.z,-.8,rest);elbows[i].rotation.x=T.MathUtils.lerp(elbows[i].rotation.x,-.3,rest);elbows[i].rotation.z=-.8*rest;
    const flat=new T.Quaternion().setFromEuler(new T.Euler(0,-Math.PI/2,0)),wrist=arms[i].quaternion.clone().multiply(elbows[i].quaternion).invert().multiply(flat);wrists[i].quaternion.slerp(wrist,rest);
   }
   if(observer){
    arms[i].position.x=(i?1:-1)*.16;
    arms[i].rotation.set(i?.1:.4,0,i?-.3:.3);
    elbows[i].rotation.set(i?-.8:-2.7,0,0);wrists[i].rotation.set(i?.7:0,0,i?0:-Math.PI/2);
   }
   if(sleeves[i])poseSkinArm(sleeves[i],arms[i],elbows[i],wrists[i]);poseSkinArm(trousers[i],legs[i],knees[i],ankles[i]);
  }
  if(clothes){
   poseLivingShirt(clothes,torso,arms,elbows,head);
   const floor=Math.min(...[clothes.shirt,...wrists,...ankles].map(object=>supportBounds.setFromObject(object,true).min.y));
   poseVictimSkirt(skirt!,torso,knees,ankles,floor+.001);
  }
 }
 if(appearance==='driver'){root.scale.set(1.08,1.06,1.05);head.scale.set(1.06,1.02,1.03);}
 pose(0,null);return {root,pose,pivot};
}
