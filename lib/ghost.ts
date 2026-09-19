import * as T from 'three';
import {surface,faceMaterial} from './materials.ts';
import {skinArm,poseSkinArm} from './ghost-limbs.ts';
import {createHair,settleHair} from './ghost-hair.ts';

type Rig={skinArms:T.Mesh[];body:T.Group;eyes:T.Group;mouth:T.Group;jaw:T.Group;teeth:T.Group;tails:T.Group;torso:T.Group;head:T.Group;arms:T.Group[];forearms:T.Group[];palms:T.Group[];legs:T.Group[];knees:T.Group[];ankles:T.Group[];hair:T.Group;gown:T.Mesh;fringes:T.Mesh[];hem:Float32Array};
const rigs=new WeakMap<T.Group,Rig>();
export function createGhost(parent:T.Object3D){
  const figure=new T.Group();figure.name='resident-remains';figure.rotation.order='YXZ';parent.add(figure);figure.visible=false;
  const skin=surface('skin','#d5d5ce',{roughness:.73}),cloth=surface('cloth','#c1c3b9',{side:T.DoubleSide,roughness:.88});
  const lipMat=new T.MeshStandardMaterial({color:'#645b58',roughness:.76});
  function mesh(g:T.BufferGeometry,m:T.Material,p:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function ellipsoid(p:T.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,m:T.Material){const o=mesh(new T.SphereGeometry(1,18,14),m,p,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function segment(p:T.Object3D,length:number,radius:number,m:T.Material){
    const profile=[[0,.8],[.08,1],[.28,.94],[.56,.8],[.8,.67],[.98,.59],[1,.5]].map(([t,r])=>new T.Vector2(radius*r,-length*t)).reverse();
    const g=new T.LatheGeometry(profile,18);const o=mesh(g,m,p);o.scale.z=.86;return o;
  }
  const torso=new T.Group();torso.position.set(.035,1.16,.02);figure.add(torso);
  const bodiceProfile=[[-.19,.16],[-.04,.135],[.12,.155],[.28,.212],[.35,.217],[.41,.105],[.44,.061]].map(([y,r])=>new T.Vector2(r,y));
  const bodice=mesh(new T.LatheGeometry(bodiceProfile,40),cloth,torso);bodice.scale.z=.65;
  // Crumpled nightdress: uneven silhouette and a torn, separately animated hem.
  const dressGeometry=new T.CylinderGeometry(.14,.32,1.12,40,16,true),dp=dressGeometry.getAttribute('position');
  for(let i=0;i<dp.count;i++){
    const y=dp.getY(i),a=Math.atan2(dp.getZ(i),dp.getX(i)),fold=1+Math.sin(a*11+y*3)*.055+Math.sin(a*23)*.025;
    dp.setXYZ(i,dp.getX(i)*fold+(y<0?Math.sin(y*4)*.035:0),y+(y<-.5?Math.sin(a*7)*.085+Math.cos(a*13)*.04:0),dp.getZ(i)*T.MathUtils.lerp(1.15,.68,(y+.56)/1.12)*fold+(.56-y)/1.12*.18);
  }
  dressGeometry.computeVertexNormals();const gown=mesh(dressGeometry,cloth,torso,0,-.60,0);gown.name='ghost-wet-dress';
  const hem=new Float32Array(dp.array);
  // The intact dress and collar share the same worn weave; anatomy carries the unease.
  const collar=mesh(new T.TorusGeometry(.063,.008,5,32),cloth,torso,0,.432,0);collar.rotation.x=Math.PI/2;
  const belt=mesh(new T.TorusGeometry(.142,.008,5,32),cloth,torso,0,-.04,0);belt.rotation.x=Math.PI/2;belt.scale.y=.72;
  const fringes:T.Mesh[]=[];
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2,strip=mesh(new T.PlaneGeometry(.045,.2+(i%3)*.045,1,3),cloth,torso,Math.sin(a)*.3,-.97,Math.cos(a)*.205);strip.rotation.y=a;strip.rotation.z=Math.sin(i)*.13;fringes.push(strip);}
  const head=new T.Group();head.name='ghost-head';head.position.set(-.075,.48,.14);head.scale.set(.61,.66,.66);torso.add(head);
  segment(head,.31,.055,skin).position.y=-.06;
  const jaw=new T.Group();jaw.name='ghost-jaw';head.add(jaw);
  const cut=Math.acos((-.027-.12)/.226);
  const skull=mesh(new T.SphereGeometry(1,24,20,0,Math.PI*2,0,cut),skin,head,0,.12,0);skull.scale.set(.173,.226,.153);
  const chin=mesh(new T.SphereGeometry(1,24,10,0,Math.PI*2,cut,Math.PI-cut),skin,jaw,0,.12,0);chin.scale.copy(skull.scale);
  const faceMat=faceMaterial(),split=Math.asin((-.027-.12)/.23);
  for(const [parent,low,high] of [[head,split,1.06],[jaw,-Math.PI/2,split]] as const){
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];const rows=22,cols=32;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const a=(i/cols-.5)*Math.PI,b=T.MathUtils.lerp(low,high,j/rows),x=Math.sin(a)*Math.cos(b)*.178,y=Math.sin(b)*.23;
      const nose=.028*Math.exp(-x*x/.00065-(y+.01)*(y+.01)/.002);
      positions.push(x,y+.12,Math.cos(a)*Math.cos(b)*.165+.012+nose);
      // Sample only the inner facial oval: the supplied texture has no useful outer alpha.
      uvs.push(.505+x/.356*.58,.48+y/.46*.83);
      if(i<cols&&j<rows){const k=j*(cols+1)+i;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
    }
    const face=new T.BufferGeometry();face.setAttribute('position',new T.Float32BufferAttribute(positions,3));face.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));face.setIndex(indices);face.computeVertexNormals();mesh(face,faceMat,parent);
  }
  // Upper and lower face part at the lip seam; the recessed cavity spans the opening.
  const mouth=new T.Group();mouth.name='ghost-attack-mouth';mouth.position.set(0,-.021,.174);head.add(mouth);
  const voidMat=new T.MeshStandardMaterial({color:'#080506',roughness:1});
  const profile=Array.from({length:17},(_,i)=>{const a=i/16*Math.PI/2;return new T.Vector2(Math.sin(a),-Math.cos(a));});
  const cavityGeometry=new T.LatheGeometry(profile,32).rotateX(Math.PI/2);voidMat.side=T.DoubleSide;
  const cavity=mesh(cavityGeometry,voidMat,mouth,0,-.105,.016);cavity.scale.set(.088,.117,.1);
  const lip=mesh(new T.TorusGeometry(1,.039,8,40),lipMat,mouth,0,-.105,.018);lip.scale.set(.094,.117,.046);
  const cheekShape=new T.Shape();cheekShape.absellipse(0,-.105,.133,.129,0,Math.PI*2,false,0);
  const mouthHole=new T.Path();mouthHole.absellipse(0,-.105,.094,.115,0,Math.PI*2,true,0);cheekShape.holes.push(mouthHole);
  const cheeks=new T.ExtrudeGeometry(cheekShape,{depth:.024,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:32});cheeks.translate(0,0,-.025);
  const cheekP=cheeks.getAttribute('position'),cheekUV=cheeks.getAttribute('uv');
  for(let i=0;i<cheekP.count;i++)cheekUV.setXY(i,.505+cheekP.getX(i)/.356*.58,.23+(cheekP.getY(i)+.105)*.14);
  mesh(cheeks,faceMat,mouth).name='ghost-stretched-cheeks';
  const tooth=new T.MeshStandardMaterial({color:'#969486',roughness:.55});
  const teeth=new T.Group();head.add(teeth);const lowerTeeth=new T.Group();jaw.add(lowerTeeth);lowerTeeth.name='ghost-lower-teeth';
  for(const side of [-1,1])for(let i=0;i<7;i++){const t=mesh(new T.CapsuleGeometry(.0055,.012+(i%3)*.004,3,6),tooth,side>0?teeth:lowerTeeth,(i-3)*.021,-.027+side*.009,.209-Math.abs(i-3)*.003);t.rotation.z=side>0?Math.PI:0;}
  const eyes=new T.Group();eyes.name='ghost-white-eyes';head.add(eyes);
  // Eye sockets come from the face scan; separate white balls broke the expression.
  const {hair,tails}=createHair(head);
  const arms:T.Group[]=[],forearms:T.Group[]=[],palms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.206,side<0?.3:.25,0);torso.add(arm);arms.push(arm);
    segment(arm,.18,.066,cloth);
    const forearm=new T.Group();forearm.position.y=-.39;arm.add(forearm);forearms.push(forearm);
    const palm=new T.Group();palm.position.y=-.54;forearm.add(palm);palms.push(palm);
    const hand=ellipsoid(palm,0,-.02,.015,.034,.065,.023,skin);hand.name=`ghost-hand-${side}`;hand.rotation.z=side*.35;
    for(let i=0;i<4;i++){
      const finger=new T.Group();finger.position.set((i-1.5)*.017,-.063,.017);finger.rotation.z=(i-1.5)*.09;finger.rotation.x=.18+i*.05;palm.add(finger);
      const length=[.075,.087,.082,.065][i];segment(finger,length,.007,skin);
      ellipsoid(finger,0,-length+.006,.006,.005,.011,.0017,lipMat);
    }
    const thumb=new T.Group();thumb.position.set(side*.029,-.006,.012);thumb.rotation.set(.4,0,side*.62);palm.add(thumb);segment(thumb,.063,.009,skin);
    const leg=new T.Group();leg.name=`ghost-hip-${side}`;leg.position.set(side*.105,.87,.015);figure.add(leg);legs.push(leg);segment(leg,.42,.052,skin);
    const knee=new T.Group();knee.name=`ghost-knee-${side}`;knee.position.y=-.42;leg.add(knee);knees.push(knee);ellipsoid(knee,0,0,.02,.038,.045,.035,skin);segment(knee,.42,.035,skin);
    const ankle=new T.Group();ankle.name=`ghost-ankle-${side}`;ankle.position.y=-.42;knee.add(ankle);ankles.push(ankle);ellipsoid(ankle,0,-.04,.07,.05,.043,.112,skin);
    for(let i=0;i<5;i++)ellipsoid(ankle,(i-2)*.017,-.048,.166-Math.abs(i-1)*.005,.0105,.021,.028,skin);
  }
  const body=new T.Group();body.name='ghost-body';body.add(...figure.children);figure.add(body);
  const skinArms=arms.map(()=>skinArm(body,skin));
  rigs.set(figure,{skinArms,body,eyes,mouth,jaw,teeth,tails,torso,head,arms,forearms,palms,legs,knees,ankles,hair,gown,fringes,hem});animateGhost(figure,0,0,0,false);return figure;
}
export function animateGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0){
  const rig=rigs.get(figure);if(!rig)return;
  rig.body.position.set(0,0,0);rig.body.quaternion.identity();
  rig.mouth.visible=false;rig.eyes.visible=false;rig.teeth.visible=false;rig.jaw.getObjectByName('ghost-lower-teeth')!.visible=false;rig.jaw.position.set(0,0,0);rig.jaw.rotation.set(0,0,0);
  const step=Math.sin(phase),drag=Math.sin(phase/2),jerk=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.7)),22);
  rig.torso.rotation.set(.13+drag*.035*moving,Math.sin(time*.8)*.035,-.09+Math.max(0,step)*.045*moving);
  rig.torso.position.set(.035,1.16+Math.abs(step)*.014*moving,.02);
  rig.head.rotation.set(.16+Math.sin(time*.9)*.025,-.08+Math.sin(time*.73)*.045+jerk*.19,-.43-jerk*.12+proximity*.06);
  rig.arms[0].rotation.set(.1+step*.14*moving,-.1,.08);rig.arms[1].rotation.set(-.13-step*.1*moving,.15,-.16);
  rig.forearms[0].rotation.set(-.17,.1,.08);rig.forearms[1].rotation.set(-.36+jerk*.13,.2,-.22);
  for(let i=0;i<2;i++){
    rig.legs[i].position.set((i===0?-1:1)*.105,.87,.015);rig.palms[i].rotation.set(0,0,0);
    const a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),swing=a<Math.PI,lift=swing?Math.sin(a):0;
    const stride=.39,z=(swing?-Math.cos(a)*stride:stride-(a-Math.PI)/Math.PI*stride*2)*moving,y=-.75+lift*(i===0?.16:.065)*moving;
    const distance=Math.min(.839,Math.hypot(y,z)),bend=Math.acos(distance/.84),hip=Math.atan2(-z,-y)-bend;
    rig.legs[i].rotation.set(hip,0,i===0?.035:-.035);rig.knees[i].rotation.set(bend*2,0,0);
    rig.ankles[i].rotation.set(-hip-bend*2+(swing?Math.sin(a)*(i===0?.17:.08):0)*moving,0,0);
  }
  rig.hair.rotation.set(Math.sin(time*1.6)*.016+Math.sin(phase-.35)*.023*moving,Math.sin(time*.8)*.012,Math.sin(phase-.5)*.028*moving);
  rig.tails.scale.set(1,1,1);rig.tails.rotation.set(Math.sin(phase-.65)*.023*moving,Math.sin(time*.8)*.012,Math.sin(phase-.85)*.04*moving);
  if(crawl>0)crawlPose(rig,phase,moving,T.MathUtils.clamp(crawl,0,1));
  rig.fringes.forEach((strip,i)=>{strip.position.y=-.97;strip.position.z=Math.cos(i/11*Math.PI*2)*.205;});
  const p=rig.gown.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=rig.hem[i*3],y=rig.hem[i*3+1],z=rig.hem[i*3+2],weight=Math.max(0,-y);p.setXYZ(i,x+Math.sin(time*2.2+y*6)*.022*weight,y,z+Math.cos(time*2.5+x*8)*.022*weight);}
  {
    const inverse=rig.torso.quaternion.clone().invert(),point=new T.Vector3();
    for(const strip of rig.fringes){strip.updateMatrix();const vertices=strip.geometry.getAttribute('position');let min=Infinity;
      for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(strip.matrix).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);min=Math.min(min,point.y);}
      if(min<.006)strip.position.y+=(.006-min)/Math.max(.1,Math.cos(rig.torso.rotation.x));
    }
    for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).add(rig.gown.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
      if(point.y<.014){point.y=.014;point.sub(rig.torso.position).applyQuaternion(inverse).sub(rig.gown.position);p.setXYZ(i,point.x,point.y,point.z);}
    }
  }
  p.needsUpdate=true;settleHair(rig.tails,figure,time,crawlFloor(rig));poseArms(rig);
}

function poseArms(rig:Rig){rig.skinArms.forEach((mesh,i)=>poseSkinArm(mesh,rig.arms[i],rig.forearms[i],rig.palms[i]));}
function crawlFloor(rig:Rig){return rig.torso.position.y<.8?.018:0;}

// Fit the visual body to the stairs while the navigation root stays on its path.
export function groundGhost(figure:T.Group,heightAt:(x:number,z:number)=>number){
  const rig=rigs.get(figure);if(!rig)return;
  const p=figure.position,yaw=figure.rotation.y,c=Math.cos(yaw),s=Math.sin(yaw);
  // A solid divider separates the flights: a turning limb must not sample the opposite floor.
  const floorAt=(z:number)=>heightAt(p.x,z);
  const center=p.z-.35*c,span=1.05*Math.abs(c)+.34*Math.abs(s);
  const slope=(floorAt(center+span)-floorAt(center-span))/(2*span);
  const normal=new T.Vector3(s*slope,1,-c*slope).normalize();
  rig.body.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);
  let clearance=0;const point=new T.Vector3();
  for(const x of [-.34,.34])for(const z of [-1.4,-.7,0,.7]){
    point.set(x,0,z).applyQuaternion(rig.body.quaternion);
    clearance=Math.max(clearance,floorAt(p.z-s*point.x+c*point.z)-p.y-point.y);
  }
  // Each visible tread differs from the continuous navigation slope by at most 8.3 cm.
  rig.body.position.y=clearance+.085;
  figure.updateMatrixWorld(true);
  for(let i=0;i<2;i++)for(const arm of [true,false]){
    const upper=arm?rig.arms[i]:rig.legs[i],lower=arm?rig.forearms[i]:rig.knees[i],tip=arm?rig.palms[i]:rig.ankles[i];
    const target=tip.getWorldPosition(new T.Vector3()),orientation=new T.Quaternion().setFromEuler(new T.Euler(arm?-Math.PI/2:0,yaw,arm?(i===0?-1:1)*.16:0,'YXZ'));
    const lift=rig.body.worldToLocal(target.clone()).y;
    const support=Math.max(...[-.07,0,.24].map(z=>floorAt(target.z+c*z)));
    target.y=support+lift+.085;
    reach(upper,lower,upper.parent!.worldToLocal(target),arm?.39:.42,arm?.54:.42,i===0?-1:1);
    tip.quaternion.copy(lower.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
  }
  settleHair(rig.tails,figure,0,0,heightAt);poseArms(rig);
}

function reach(upper:T.Group,lower:T.Group,target:T.Vector3,l1:number,l2:number,side:number){
  const v=target.clone().sub(upper.position),d=T.MathUtils.clamp(v.length(),.05,l1+l2-.001),unit=v.normalize();
  const along=(l1*l1+d*d-l2*l2)/(2*d),out=new T.Vector3(side,.2,0).addScaledVector(unit,-unit.dot(new T.Vector3(side,.2,0))).normalize();
  const elbow=unit.clone().multiplyScalar(along).addScaledVector(out,Math.sqrt(Math.max(0,l1*l1-along*along)));
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),elbow.clone().normalize());upper.quaternion.copy(q);
  const fore=target.clone().sub(upper.position).sub(elbow).applyQuaternion(q.clone().invert()).normalize();
  lower.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),fore);
}

function crawlPose(rig:Rig,phase:number,moving:number,blend:number){
  const walkingHands=rig.arms.map((arm,i)=>new T.Vector3(0,-.54,0).applyQuaternion(rig.forearms[i].quaternion).add(rig.forearms[i].position).applyQuaternion(arm.quaternion).add(arm.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position));
  rig.torso.position.lerp(new T.Vector3(.015,.59+Math.abs(Math.sin(phase))*.022*moving,0),blend);
  rig.torso.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(1.2,0,Math.sin(phase)*.035*moving)),blend);
  rig.head.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(-1.19,.08,-.21)),blend);
  const inverse=rig.torso.quaternion.clone().invert();
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),lift=Math.max(0,Math.sin(a))*moving;
    const handStride=a<Math.PI?-Math.cos(a)*.205:.205-(a-Math.PI)*.41/Math.PI;
    const hand=walkingHands[i].lerp(new T.Vector3(side*.31,.079+lift*.095,.43+handStride*(moving>.01?1:0)),blend).sub(rig.torso.position).applyQuaternion(inverse);
    reach(rig.arms[i],rig.forearms[i],hand,.39,.54,side);
    const armWorld=rig.torso.quaternion.clone().multiply(rig.arms[i].quaternion).multiply(rig.forearms[i].quaternion);
    rig.palms[i].quaternion.copy(armWorld.invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,side*.16))));
    const walkFoot=new T.Vector3(0,-.42,0).applyQuaternion(rig.knees[i].quaternion).add(rig.knees[i].position).applyQuaternion(rig.legs[i].quaternion).add(rig.legs[i].position);
    rig.legs[i].position.lerp(new T.Vector3(side*.13,.38,-.65),blend);
    const footStride=a<Math.PI?.205-a*.41/Math.PI:Math.cos(a)*.205;
    reach(rig.legs[i],rig.knees[i],walkFoot.lerp(new T.Vector3(side*.28,.095+Math.max(0,-Math.sin(a))*.065*moving,-1.12+footStride*(moving>.01?1:0)),blend),.42,.42,side);
    rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert();
  }
}

export function animateGhostPassenger(figure:T.Group,time:number,scare:number,reducedMotion:boolean){
  animateGhost(figure,time,0,1,reducedMotion,0);
  const rig=rigs.get(figure);if(!rig)return;
  rig.torso.position.set(0,.83,.03);rig.torso.rotation.set(-.12,0,-.12);
  for(let i=0;i<2;i++){rig.legs[i].position.set((i===0?-1:1)*.12,.61,.04);rig.legs[i].rotation.set(-1.75,0,0);rig.knees[i].rotation.set(2.28,0,0);rig.ankles[i].rotation.set(-.53,0,0);rig.arms[i].rotation.set(-.55-scare*.65,0,(i===0?-1:1)*.18);rig.forearms[i].rotation.set(-.85,0,0);}
  rig.head.rotation.set(.05,-.7,-.26+(reducedMotion?0:Math.sin(time*21)*.025*scare));
  rig.mouth.visible=scare>0;rig.eyes.visible=scare>0;rig.teeth.visible=scare>0;rig.jaw.getObjectByName('ghost-lower-teeth')!.visible=scare>0;
  rig.jaw.position.set(0,-.37*scare,.025*scare);rig.mouth.scale.set(1.1,.025+scare*1.65,1);
  rig.fringes.forEach((strip,i)=>{strip.position.y=-.42;strip.position.z=Math.cos(i/11*Math.PI*2)*.205+.32;});
  rig.tails.scale.y=.68;
  // Fold the wet skirt over the seated knees instead of through the floorpan.
  const p=rig.gown.geometry.getAttribute('position');
  const inverse=rig.torso.quaternion.clone().invert(),point=new T.Vector3();
  for(let i=0;i<p.count;i++){const y=rig.hem[i*3+1];if(y<-.05){p.setY(i,-.05+(y+.05)*.28);p.setZ(i,rig.hem[i*3+2]+(-y-.05)*.43);}
    point.fromBufferAttribute(p,i).add(rig.gown.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
    if(point.y<.25){point.y=.25;point.sub(rig.torso.position).applyQuaternion(inverse).sub(rig.gown.position);p.setXYZ(i,point.x,point.y,point.z);}
  }
  p.needsUpdate=true;settleHair(rig.tails,figure,time,.25);poseArms(rig);
}

export function animateGhostAttack(figure:T.Group,time:number,reducedMotion:boolean,eyeHeight=1.65){
  animateGhost(figure,time,0,1,reducedMotion,0);
  const rig=rigs.get(figure);if(!rig)return;
  const opening=T.MathUtils.smoothstep(time,.12,.48),convulsion=(reducedMotion?.018:.12)*opening,fall=T.MathUtils.smoothstep(time,1.05,2.55);
  rig.torso.position.y=T.MathUtils.lerp(eyeHeight-.48,1.16,fall);
  rig.torso.position.z=.02+.055*opening*(1-fall);
  rig.torso.rotation.set(.02+Math.sin(time*17)*convulsion*.4,Math.sin(time*13)*convulsion*.3,-.06+Math.sin(time*19)*convulsion*.4);
  rig.head.rotation.set(T.MathUtils.lerp(.16,-.09,opening)+Math.sin(time*31)*convulsion*.6,.025+Math.sin(time*23)*convulsion*.55,T.MathUtils.lerp(-.43,-.03,opening)+Math.sin(time*27)*convulsion*.65);
  rig.mouth.visible=true;rig.eyes.visible=true;rig.teeth.visible=true;rig.jaw.getObjectByName('ghost-lower-teeth')!.visible=true;
  const gape=opening*(1+Math.sin(time*33)*(reducedMotion?.006:.025));
  rig.jaw.position.set(Math.sin(time*29)*convulsion*.055,-.34*gape,.025*gape);rig.jaw.rotation.set(-.12*gape,0,Math.sin(time*19)*convulsion*.15);
  rig.mouth.scale.set(1+gape*.13,.025+gape*1.51,1);
  rig.hair.rotation.set(-.32*opening+Math.sin(time*19)*convulsion,0,Math.sin(time*29)*convulsion*.7);
  rig.tails.rotation.x=-.18*opening;rig.tails.rotation.z=Math.sin(time*21)*convulsion*.7;
  for(let i=0;i<2;i++){const side=i===0?-1:1;rig.arms[i].rotation.set(-2.05+Math.sin(time*18+i)*convulsion*2,side*.3,side*.35);rig.forearms[i].rotation.set(-.8+Math.sin(time*21+i)*convulsion,0,side*.2);}
  settleHair(rig.tails,figure,time,0);poseArms(rig);
}
