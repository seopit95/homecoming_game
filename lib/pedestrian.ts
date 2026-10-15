import * as T from 'three';
import headData from './assets/pedestrian-head.json' with {type:'json'};
import {upholstery} from './materials.ts';
import {skinArm,poseSkinArm} from './ghost-limbs.ts';
import {extremity} from './ghost-anatomy.ts';
import {createLeatherShoe} from './entry-props.ts';

export function createPedestrian(parent:T.Group,appearance:'victim'|'driver'='victim'){
 const root=new T.Group();root.name='memory-pedestrian';parent.add(root);
 const pivot=new T.Group(),body=new T.Group();pivot.position.y=.87;body.position.y=-.87;root.add(pivot);pivot.add(body);
 const skin=new T.MeshStandardMaterial({color:'#b29987',roughness:.58}),coat=upholstery(appearance==='driver'?'#293544':'#66716d'),pants=upholstery('#333b3e'),hair=new T.MeshStandardMaterial({color:'#131919',roughness:.55});
 const add=(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D)=>{const m=new T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const torso=new T.Group();torso.position.y=.92;body.add(torso);
 const profile=[[-.13,.22],[0,.22],[.12,.19],[.3,.19],[.41,.205],[.47,.16],[.51,.065]].map(([y,r])=>new T.Vector2(r,y));
 const jacket=add(new T.LatheGeometry(profile,40),coat,torso);jacket.scale.z=.64;
 const neck=add(new T.CylinderGeometry(.042,.049,.09,24),skin,torso);neck.position.y=.53;
 const head=new T.Group();head.name='pedestrian-head';head.position.set(0,.565,0);torso.add(head);
 function anatomical(data:{position:number[];index:number[];normal:number[];uv:number[]},material:T.Material){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);return add(g,material,head);}
 const face=anatomical(headData,skin);face.name='pedestrian-anatomical-head';
 const color:number[]=[];for(let i=0;i<headData.position.length;i+=3){const x=headData.position[i],y=headData.position[i+1],z=headData.position[i+2],lip=Math.exp(-((x/.026)**2+((y-.047)/.006)**2))*T.MathUtils.smoothstep(z,.075,.1);color.push(1,.97-lip*.23,.94-lip*.16);}face.geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));skin.vertexColors=true;
 const eyeMat=new T.MeshStandardMaterial({color:'#b5b1a4',roughness:.38});
 for(const eye of Object.values(headData.eyes)){
  anatomical(eye,eyeMat);
  const iris=add(new T.SphereGeometry(1,16,12),new T.MeshStandardMaterial({color:'#392d25',roughness:.35}),head);iris.scale.set(.0058,.0058,.0018);iris.position.set(eye.center[0],eye.center[1],.1053);
  const pupil=add(new T.SphereGeometry(.0024,12,8),hair,head);pupil.scale.z=.4;pupil.position.set(eye.center[0],eye.center[1],.107);
 }
 // A fitted scalp cap and overlapping shoulder-length locks, not a sphere for the face.
 const scalp=face.geometry.clone(),scalpIndex:number[]=[];
 for(let i=0;i<headData.index.length;i+=3){const tri=headData.index.slice(i,i+3),y=tri.reduce((sum,v)=>sum+headData.position[v*3+1],0)/3,z=tri.reduce((sum,v)=>sum+headData.position[v*3+2],0)/3;if(y>.137&&(z<.072||y>.174))scalpIndex.push(...tri);}
 scalp.setIndex(scalpIndex);const scalpPosition=scalp.getAttribute('position');for(let i=0;i<scalpPosition.count;i++)scalpPosition.setXYZ(i,scalpPosition.getX(i)*1.035,.1+(scalpPosition.getY(i)-.1)*1.035,.01+(scalpPosition.getZ(i)-.01)*1.035);add(scalp,hair,head);
 for(let i=0;i<(appearance==='driver'?0:46);i++){
  const a=(i/45)*Math.PI*2,x=Math.cos(a)*.087,z=Math.sin(a)*.085+.005;if(z>.064&&Math.abs(x)<.067)continue;
  const points=[new T.Vector3(x*.67,.18,z*.7),new T.Vector3(x,.10,z),new T.Vector3(x*1.07,-.015,z-.008),new T.Vector3(x*.94,-.09+(i%4)*.005,z-.017)];
  add(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.011+(i%3)*.002,6,false),hair,head);
 }
 for(const side of [-1,1]){const lapel=add(new T.BoxGeometry(.077,.15,.015),coat,torso);lapel.position.set(side*.066,.397,.103);lapel.rotation.z=side*.32;}
 for(let i=0;i<4;i++){const b=add(new T.SphereGeometry(.007,10,8),hair,torso);b.scale.z=.4;b.position.set(0,.32-i*.1,.139);}
 const arms:T.Group[]=[],elbows:T.Group[]=[],wrists:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[],sleeves:T.Mesh[]=[],trousers:T.Mesh[]=[];
 for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*.194,.405,0);torso.add(arm);arms.push(arm);
  const elbow=new T.Group();elbow.position.y=-.27;arm.add(elbow);elbows.push(elbow);
  const wrist=new T.Group();wrist.name=side===-1?'pedestrian-carry-hand':'pedestrian-free-hand';wrist.position.y=-.25;elbow.add(wrist);wrists.push(wrist);wrist.add(extremity('hand',side,new T.MeshStandardMaterial({color:'#b49e8b',roughness:.65}),false));
  const sleeve=skinArm(body,coat);sleeve.name='pedestrian-sleeve';sleeve.userData.radii=[.07,.062,.049,.045,.032];sleeves.push(sleeve);
  const leg=new T.Group();leg.position.set(side*.093,.87,0);body.add(leg);legs.push(leg);
  const knee=new T.Group();knee.position.y=-.405;leg.add(knee);knees.push(knee);
  const ankle=new T.Group();ankle.position.y=-.405;knee.add(ankle);ankles.push(ankle);
  const legMesh=skinArm(body,pants);legMesh.name='pedestrian-trouser-leg';legMesh.userData.radii=[.096,.085,.062,.062,.039];trousers.push(legMesh);
  const shoe=createLeatherShoe();shoe.name=side===1?'memory-shoe':'memory-other-shoe';shoe.position.y=-.06;ankle.add(shoe);
 }
 function pose(clock:number,hit:number|null,speed=1.37){
  const phase=clock/.92,beat=phase*Math.PI*2,impact=hit!==null,wrap=impact?T.MathUtils.smoothstep(hit,0,.44):0,slide=impact?T.MathUtils.smoothstep(hit,.45,1.55):0;
  // Solve feet in the body's frame: a supporting foot travels backwards by
  // exactly the root's advance. Swing is lifted, with matching takeoff/landing velocity.
  const stance=.6,travel=speed*.92*stance,feet=[0,.5].map(offset=>{
   const u=((phase+offset)%1+1)%1,v=(u-stance)/(1-stance);
   return {planted:u<stance,z:u<stance?travel*(.5-u/stance):travel*(T.MathUtils.smoothstep(v,0,1)-.5)-speed*.92*(1-stance)*v*(1-v)*(1-2*v),y:.084+(u<stance?0:.115*Math.sin(v*Math.PI))};
  });
  const support=Math.min(...feet.filter(f=>f.planted).map(f=>Math.abs(f.z)));
  body.position.y=.084+Math.sqrt(.81**2-support**2)-.005-pivot.position.y-legs[0].position.y;
  pivot.rotation.set(-.15*slide*(1-slide),0,1.3*wrap+.24*slide);
  torso.rotation.set(T.MathUtils.lerp(Math.sin(beat)*.012,-.13,wrap),0,Math.sin(beat)*.012*(1-wrap)+.19*wrap*(1-slide));
  head.rotation.set(T.MathUtils.lerp(.015,-.22,wrap),T.MathUtils.lerp(.25,-.38,wrap),-.14*wrap*(1-slide));
  for(let i=0;i<2;i++){
   const {y,z}=feet[i];
   const dy=y-(pivot.position.y+body.position.y+legs[i].position.y),distance=Math.min(.809,Math.hypot(dy,z));
   const knee=2*Math.acos(distance/.81),hip=Math.atan2(-z,-dy)-knee/2;
   legs[i].rotation.set(T.MathUtils.lerp(hip,-.15+(i?-.36:.22),wrap),0,0);
   knees[i].rotation.x=T.MathUtils.lerp(knee,.48+(i?.28:.08)*slide,wrap);
   ankles[i].rotation.x=-legs[i].rotation.x-knees[i].rotation.x;
   const swing=Math.sin(beat+i*Math.PI);
   arms[i].rotation.set(T.MathUtils.lerp(-swing*(i?.24:.07),-.8+(i?.35:-.1)*slide,wrap),(i?.3:-.3)*wrap*(1-slide),(i?.55:-.55)*wrap*(1-slide));
   elbows[i].rotation.x=T.MathUtils.lerp(-.18,-1.3,wrap);wrists[i].rotation.x=-.25*wrap;
   poseSkinArm(sleeves[i],arms[i],elbows[i],wrists[i]);poseSkinArm(trousers[i],legs[i],knees[i],ankles[i]);
  }
 }
 if(appearance==='driver'){root.scale.set(1.08,1.06,1.05);head.scale.set(1.06,1.02,1.03);}
 pose(0,null);return {root,pose,pivot};
}
