import * as T from 'three';
import {surface,faceMaterial} from './materials.ts';

type Rig={eyes:T.Group;mouth:T.Group;torso:T.Group;head:T.Group;arms:T.Group[];forearms:T.Group[];legs:T.Group[];knees:T.Group[];ankles:T.Group[];hair:T.Group;gown:T.Mesh;hem:Float32Array};
const rigs=new WeakMap<T.Group,Rig>();
export function createGhost(parent:T.Object3D){
  const figure=new T.Group();figure.name='resident-remains';figure.rotation.order='YXZ';parent.add(figure);figure.visible=false;
  const skin=surface('skin','#cbc8b5'),cloth=surface('cloth','#c0bdb1',{side:T.DoubleSide}),hairMat=surface('hair','#3e3935',{roughness:.32}),wound=surface('wound','#7c5a51',{roughness:.42});
  function mesh(g:T.BufferGeometry,m:T.Material,p:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function ellipsoid(p:T.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,m:T.Material){const o=mesh(new T.SphereGeometry(1,18,14),m,p,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function segment(p:T.Object3D,length:number,radius:number,m:T.Material){return mesh(new T.CapsuleGeometry(radius,length-radius*2,6,12),m,p,0,-length/2,0);}
  const torso=new T.Group();torso.position.set(.035,1.16,.02);figure.add(torso);
  ellipsoid(torso,0,.12,0,.245,.38,.14,cloth);ellipsoid(torso,-.215,.32,0,.11,.12,.115,skin);ellipsoid(torso,.2,.25,0,.09,.095,.1,wound);
  // Crumpled nightdress: uneven silhouette and a torn, separately animated hem.
  const dressGeometry=new T.CylinderGeometry(.19,.37,1.12,40,14,true),dp=dressGeometry.getAttribute('position');
  for(let i=0;i<dp.count;i++){
    const y=dp.getY(i),a=Math.atan2(dp.getZ(i),dp.getX(i)),fold=1+Math.sin(a*11+y*3)*.055+Math.sin(a*23)*.025;
    dp.setXYZ(i,dp.getX(i)*fold+(y<0?Math.sin(y*4)*.035:0),y+(y<-.5?Math.sin(a*7)*.085+Math.cos(a*13)*.04:0),dp.getZ(i)*.66*fold);
  }
  dressGeometry.computeVertexNormals();const gown=mesh(dressGeometry,cloth,torso,0,-.39,0);
  const hem=new Float32Array(dp.array);
  // A torn shoulder and collar expose bruised skin without a plastic doll joint.
  ellipsoid(torso,.145,.22,.1,.11,.19,.035,wound);
  for(let i=0;i<7;i++){const strip=mesh(new T.PlaneGeometry(.025,.22+i*.011,1,3),cloth,torso,.14+i*.014,.06,.13);strip.rotation.z=-.2+i*.075;}
  const head=new T.Group();head.name='ghost-head';head.position.set(-.075,.48,.14);head.scale.set(.63,.74,.68);torso.add(head);
  segment(head,.31,.055,skin).position.y=-.06;
  ellipsoid(head,0,.12,0,.173,.226,.153,skin);
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  const rows=28,cols=28;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const a=(i/cols-.5)*Math.PI,b=(j/rows-.5)*Math.PI;
    const x=Math.sin(a)*Math.cos(b)*.178,y=Math.sin(b)*.23;
    positions.push(x,y+.12,Math.cos(a)*Math.cos(b)*.165+.012);uvs.push(x/.356+.5,y/.46+.5);
    if(i<cols&&j<rows){const k=j*(cols+1)+i;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
  }
  const face=new T.BufferGeometry();face.setAttribute('position',new T.Float32BufferAttribute(positions,3));face.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));face.setIndex(indices);face.computeVertexNormals();mesh(face,faceMaterial(),head);
  // Only the attack exposes the stretched mouth; ordinary walking retains the small head.
  const mouth=new T.Group();mouth.name='ghost-attack-mouth';mouth.position.set(0,-.025,.183);head.add(mouth);
  const voidMat=new T.MeshStandardMaterial({color:'#080506',roughness:1});
  ellipsoid(mouth,0,0,0,.09,.12,.022,voidMat);
  const lip=mesh(new T.TorusGeometry(1,.11,8,32),wound,mouth,0,0,.014);lip.scale.set(.092,.12,.035);
  const tooth=new T.MeshStandardMaterial({color:'#ada998',roughness:.85});
  for(const side of [-1,1])for(let i=0;i<6;i++){const t=mesh(new T.ConeGeometry(.009,.031+(i%3)*.007,5),tooth,mouth,(i-2.5)*.024,side*(.088-Math.abs(i-2.5)*.004),.025);t.rotation.z=side>0?Math.PI:0;}
  const eyes=new T.Group();head.add(eyes);
  for(const side of [-1,1]){
    ellipsoid(eyes,side*.067,.185+side*.013,.164,.036,.029,.015,voidMat);
    ellipsoid(eyes,side*.067,.187+side*.013,.177,.021,.017,.011,tooth);
  }
  const hair=new T.Group();head.add(hair);
  // Individual swept locks have depth from the side and cast real shadows on the face.
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2,x=Math.cos(a)*.166,z=Math.sin(a)*.151;
    const front=z>.06;const length=front?(i%4===0?.28:.56):.7+(i%6)*.045;
    if(front&&Math.abs(x)<.04&&i%3!==0)continue;
    const path=new T.CatmullRomCurve3([new T.Vector3(x*.72,.3,z*.65),new T.Vector3(x*1.07,.15,z*1.04),new T.Vector3(x*1.2,-length*.45,z+.025),new T.Vector3(x*1.15+Math.sin(i)*.028,-length+.19,z+.08)]);
    mesh(new T.TubeGeometry(path,12,.008+(i%3)*.003,4,false),hairMat,hair);
  }
  // Thin strands cross the face; the eyes appear only through uneven gaps.
  for(let i=0;i<9;i++){
    const x=-.12+i*.028;
    const path=new T.CatmullRomCurve3([new T.Vector3(x,.3,.055),new T.Vector3(x+.015,.17,.173),new T.Vector3(x-.022,-.03,.175),new T.Vector3(x+.015,-.29-i*.014,.13)]);
    mesh(new T.TubeGeometry(path,10,.0035+(i%2)*.0015,4,false),hairMat,hair);
  }
  const arms:T.Group[]=[],forearms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.255,side<0?.3:.21,0);torso.add(arm);arms.push(arm);
    segment(arm,.42,.046,side<0?skin:cloth);ellipsoid(arm,0,-.4,0,.051,.064,.048,wound);
    const forearm=new T.Group();forearm.position.y=-.39;arm.add(forearm);forearms.push(forearm);segment(forearm,.52,.032,skin);
    const hand=ellipsoid(forearm,0,-.56,.015,.042,.087,.022,skin);hand.rotation.z=side*.35;
    for(let i=0;i<5;i++){
      const finger=new T.Group();finger.position.set((i-2)*.016,-.61,.016);finger.rotation.z=(i-2)*.18;finger.rotation.x=.45+i*.11;forearm.add(finger);
      segment(finger,.1+(i%3)*.012,.0085,skin);mesh(new T.ConeGeometry(.007,.029,5),wound,finger,0,-.12,.009).rotation.x=Math.PI;
    }
    ellipsoid(forearm,side*.02,-.17,.031,.025,.085,.012,wound);
    const leg=new T.Group();leg.name=`ghost-hip-${side}`;leg.position.set(side*.105,.87,.015);figure.add(leg);legs.push(leg);segment(leg,.42,.052,skin);
    const knee=new T.Group();knee.name=`ghost-knee-${side}`;knee.position.y=-.42;leg.add(knee);knees.push(knee);ellipsoid(knee,0,0,.02,.055,.06,.06,wound);segment(knee,.42,.035,skin);
    const ankle=new T.Group();ankle.name=`ghost-ankle-${side}`;ankle.position.y=-.42;knee.add(ankle);ankles.push(ankle);ellipsoid(ankle,0,-.04,.07,.055,.045,.13,skin);
    for(let i=0;i<5;i++)ellipsoid(ankle,(i-2)*.019,-.048,.19,.012,.025,.05,skin);
  }
  rigs.set(figure,{eyes,mouth,torso,head,arms,forearms,legs,knees,ankles,hair,gown,hem});animateGhost(figure,0,0,0,false);return figure;
}
export function animateGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1){
  const rig=rigs.get(figure);if(!rig)return;
  rig.mouth.visible=false;rig.eyes.visible=false;
  const step=Math.sin(phase),drag=Math.sin(phase/2),jerk=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.7)),22);
  rig.torso.rotation.set(.22+drag*.025*moving,Math.sin(time*.8)*.06,-.14+step*.035*moving);
  rig.torso.position.y=1.16+Math.abs(step)*.014*moving;
  rig.head.rotation.set(.43+Math.sin(time*.9)*.035,-.24+Math.sin(time*.73)*.07+jerk*.29,-.72-jerk*.22+proximity*.12);
  rig.arms[0].rotation.set(.17+step*.12*moving,-.1,.12);rig.arms[1].rotation.set(-.47-step*.06*moving,.22,-.32);
  rig.forearms[0].rotation.set(-.28,.1,.08);rig.forearms[1].rotation.set(-1.05+jerk*.17,.35,-.55);
  for(let i=0;i<2;i++){
    const a=phase+i*Math.PI,lift=Math.max(0,Math.sin(a)),z=-Math.cos(a)*.23*moving,y=-.785+lift*.16*moving;
    const distance=Math.min(.839,Math.hypot(y,z)),bend=Math.acos(distance/.84),hip=Math.atan2(-z,-y)-bend;
    rig.legs[i].rotation.set(hip,0,i===0?.035:-.035);rig.knees[i].rotation.x=bend*2;
    rig.ankles[i].rotation.x=-hip-bend*2+Math.sin(a)*.18*moving;
  }
  rig.hair.rotation.set(Math.sin(time*1.6)*.026,Math.sin(time*.8)*.017,Math.sin(time*1.4)*.045);
  const p=rig.gown.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=rig.hem[i*3],y=rig.hem[i*3+1],z=rig.hem[i*3+2],weight=Math.max(0,-y);p.setXYZ(i,x+Math.sin(time*2.2+y*6)*.022*weight,y,z+Math.cos(time*2.5+x*8)*.022*weight);}
  p.needsUpdate=true;
}

export function animateGhostAttack(figure:T.Group,time:number,reducedMotion:boolean,eyeHeight=1.65){
  animateGhost(figure,time,0,1,reducedMotion,0);
  const rig=rigs.get(figure);if(!rig)return;
  const convulsion=reducedMotion?.025:.17,envelope=Math.min(1,time*7),fall=T.MathUtils.smoothstep(time,1.05,2.55);
  rig.torso.position.y=T.MathUtils.lerp(eyeHeight-.48,1.16,fall);
  rig.torso.rotation.set(.02+Math.sin(time*17)*convulsion*.4,Math.sin(time*13)*convulsion*.3,-.06+Math.sin(time*19)*convulsion*.4);
  rig.head.rotation.set(-.07+Math.sin(time*31)*convulsion,.08+Math.sin(time*23)*convulsion,-.1+Math.sin(time*27)*convulsion*1.2);
  rig.mouth.visible=true;rig.eyes.visible=true;rig.mouth.scale.set(1+envelope*.15,.3+envelope*(1.25+Math.sin(time*33)*.1),1);
  rig.hair.rotation.set(-.2+Math.sin(time*19)*convulsion,0,Math.sin(time*29)*convulsion);
  for(let i=0;i<2;i++){const side=i===0?-1:1;rig.arms[i].rotation.set(-2.05+Math.sin(time*18+i)*convulsion*2,side*.3,side*.35);rig.forearms[i].rotation.set(-.8+Math.sin(time*21+i)*convulsion,0,side*.2);}
}
