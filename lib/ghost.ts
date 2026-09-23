import * as T from 'three';
import {surface} from './materials.ts';
import {skinArm,poseSkinArm} from './ghost-limbs.ts';
import {createHair,settleHair} from './ghost-hair.ts';
import {createFace,poseFace,type FaceRig} from './ghost-face.ts';
import {createDress,poseDress} from './ghost-dress.ts';
import {extremity} from './ghost-anatomy.ts';

type Rig={drips:T.InstancedMesh;neck:T.Mesh;face:FaceRig;sleeves:T.Mesh[];skinArms:T.Mesh[];body:T.Group;mouth:T.Group;tails:T.Group;torso:T.Group;head:T.Group;arms:T.Group[];forearms:T.Group[];palms:T.Group[];legs:T.Group[];knees:T.Group[];ankles:T.Group[];hair:T.Group;gown:T.Mesh;hem:Float32Array};
const rigs=new WeakMap<T.Group,Rig>();
export function createGhost(parent:T.Object3D){
  const figure=new T.Group();figure.name='resident-remains';figure.rotation.order='YXZ';parent.add(figure);figure.visible=false;
  const skin=surface('skin','#bfc7c3',{roughness:.62}),cloth=surface('cloth','#aeb5b0',{side:T.DoubleSide,roughness:.82,bumpScale:.00035,vertexColors:true});
  function mesh(g:T.BufferGeometry,m:T.Material,p:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function ellipsoid(p:T.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,m:T.Material){const o=mesh(new T.SphereGeometry(1,18,14),m,p,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function segment(p:T.Object3D,length:number,radius:number,m:T.Material){
    const profile=[[0,.8],[.08,1],[.28,.94],[.56,.8],[.8,.67],[.98,.59],[1,.5]].map(([t,r])=>new T.Vector2(radius*r,-length*t)).reverse();
    const g=new T.LatheGeometry(profile,18);const o=mesh(g,m,p);o.scale.z=.86;return o;
  }
  const torso=new T.Group();torso.position.set(.035,1.16,.02);figure.add(torso);
  const {gown,hem}=createDress(torso,cloth);
  const head=new T.Group();head.name='ghost-head';head.position.set(-.025,.46,.028);head.scale.set(.67,.68,.68);torso.add(head);
  const neck=ellipsoid(torso,0,.41,0,.036,.09,.033,skin);neck.name='ghost-neck';
  const face=createFace(head,skin),{mouth}=face;
  const {hair,tails}=createHair(head);
  const arms:T.Group[]=[],forearms:T.Group[]=[],palms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.18,side<0?.308:.245,side<0?0:-.015);torso.add(arm);arms.push(arm);
    const forearm=new T.Group();forearm.position.y=-.46;arm.add(forearm);forearms.push(forearm);
    const palm=new T.Group();palm.position.y=-.49;forearm.add(palm);palms.push(palm);
    palm.add(extremity('hand',side,skin));
    const leg=new T.Group();leg.name=`ghost-hip-${side}`;leg.position.set(side*.105,.87,.015);figure.add(leg);legs.push(leg);
    const knee=new T.Group();knee.name=`ghost-knee-${side}`;knee.position.y=-.42;leg.add(knee);knees.push(knee);ellipsoid(knee,0,-.014,0,.029,.048,.027,skin);segment(knee,.42,.035,skin);
    const ankle=new T.Group();ankle.name=`ghost-ankle-${side}`;ankle.position.y=-.42;knee.add(ankle);ankles.push(ankle);ankle.add(extremity('foot',side,skin));
  }
  const body=new T.Group();body.name='ghost-body';body.add(...figure.children);figure.add(body);
  const skinArms=arms.map(()=>skinArm(body,skin)),sleeves=arms.map(()=>skinArm(body,cloth,true));
  sleeves[1].userData.torn=true;
  const drips=new T.InstancedMesh(new T.SphereGeometry(.003,6,5),new T.MeshPhysicalMaterial({color:'#39090c',roughness:.25,clearcoat:.7}),6);drips.name='ghost-blood-drips';drips.frustumCulled=false;body.add(drips);
  rigs.set(figure,{drips,neck,face,sleeves,skinArms,body,mouth,tails,torso,head,arms,forearms,palms,legs,knees,ankles,hair,gown,hem});animateGhost(figure,0,0,0,false);return figure;
}
function poseGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0){
  const rig=rigs.get(figure);if(!rig)return;
  rig.body.position.set(0,0,0);rig.body.quaternion.identity();
  rig.face.jaw.rotation.set(0,0,0);rig.head.position.set(-.025,.46,.028);rig.arms[1].position.y=.245;
  const step=Math.sin(phase),drag=Math.sin(phase/2),jerk=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.7)),22);
  rig.torso.rotation.set(.035+drag*.018*moving,Math.sin(time*.8)*.035,-.035+Math.max(0,step)*.025*moving);
  rig.torso.position.set(.035,1.16+Math.abs(step)*.014*moving,.02);
  rig.head.rotation.set(.24+Math.sin(time*.9)*.025,-.12+Math.sin(time*.73)*.045+jerk*.19,-.59-jerk*.12+proximity*.06);
  rig.arms[0].rotation.set(.1+step*.14*moving,-.1,.08);rig.arms[1].rotation.set(-.2-step*.055*moving,.24,-.2);
  rig.forearms[0].rotation.set(-.17,.1,.08);rig.forearms[1].rotation.set(-.56+jerk*.13,.35,-.28);
  for(let i=0;i<2;i++){
    rig.legs[i].position.set((i===0?-1:1)*.105,.87,.015);rig.palms[i].rotation.set(0,0,0);
    const a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),swing=a<Math.PI,lift=swing?Math.sin(a):0;
    const stride=.39,z=(swing?-Math.cos(a)*stride:stride-(a-Math.PI)/Math.PI*stride*2)*moving,y=-.80+lift*(i===0?.075:.035)*moving;
    const distance=Math.min(.839,Math.hypot(y,z)),bend=Math.acos(distance/.84),hip=Math.atan2(-z,-y)-bend;
    rig.legs[i].rotation.set(hip,0,i===0?.035:-.035);rig.knees[i].rotation.set(bend*2,0,0);
    rig.ankles[i].rotation.set(-hip-bend*2+(swing?Math.sin(a)*(i===0?.17:.08):0)*moving,0,0);
  }
  rig.hair.rotation.set(0,0,0);
  rig.tails.scale.set(1,1,1);rig.tails.rotation.set(0,0,0);
  if(crawl>0){
    crawlPose(rig,phase,moving,T.MathUtils.clamp(crawl,0,1));
    const twitch=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.43)),20)*.085;
    rig.head.rotation.y+=twitch*crawl;rig.head.rotation.z-=twitch*.6*crawl;
  }
  return rig;
}
export function animateGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0,heightAt?:(x:number,z:number)=>number){
  const rig=poseGhost(figure,time,moving,proximity,reducedMotion,phase,crawl);if(!rig)return;
  poseFace(rig.face,0);rig.mouth.visible=false;
  poseDress(rig.gown,rig.hem,rig.torso,time,crawl);
  if(heightAt)groundGhost(figure,heightAt,false);
  settleHair(rig.tails,figure,time,crawlFloor(rig),heightAt);poseArms(rig);bloodDrops(rig,time);
}

function bloodDrops(rig:Rig,time:number,floor=.022){
  rig.palms[1].updateWorldMatrix(true,false);rig.body.updateWorldMatrix(true,false);
  const source=rig.body.worldToLocal(rig.palms[1].getWorldPosition(new T.Vector3())),matrix=new T.Matrix4(),scale=new T.Vector3(),point=new T.Vector3(),rotation=new T.Quaternion();
  for(let i=0;i<6;i++){
    const age=(time*.8+i/6)%1,fall=age*age*2.4;
    point.set(source.x+.014*Math.sin(i*7),Math.max(floor,source.y-fall),source.z+.011*Math.cos(i*3));
    const air=point.y>floor+.003,size=air?.0035:.01*(1-age);scale.set(size/.003,(air?.0075:.0007)/.003,size/.003);matrix.compose(point,rotation,scale);rig.drips.setMatrixAt(i,matrix);
  }
  rig.drips.instanceMatrix.needsUpdate=true;rig.drips.computeBoundingBox();rig.drips.computeBoundingSphere();
}

function poseArms(rig:Rig){
  const bottom=new T.Vector3(0,.37,-.012),top=new T.Vector3(0,.045,-.073).multiply(rig.head.scale).applyQuaternion(rig.head.quaternion).add(rig.head.position),axis=top.clone().sub(bottom);
  rig.neck.position.copy(bottom).lerp(top,.5);rig.neck.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize());rig.neck.scale.set(.035,axis.length()*.5+.023,.032);
  [rig.skinArms,rig.sleeves].forEach(meshes=>meshes.forEach((mesh,i)=>poseSkinArm(mesh,rig.arms[i],rig.forearms[i],rig.palms[i])));
}
function crawlFloor(rig:Rig){return rig.torso.position.y<.8?.018:0;}

// Fit the visual body to the stairs while the navigation root stays on its path.
export function groundGhost(figure:T.Group,heightAt:(x:number,z:number)=>number,finish=true){
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
    reach(upper,lower,upper.parent!.worldToLocal(target),arm?.46:.42,arm?.49:.42,i===0?-1:1);
    tip.quaternion.copy(lower.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
  }
  if(finish){settleHair(rig.tails,figure,0,0,heightAt);poseArms(rig);}
}

function reach(upper:T.Group,lower:T.Group,target:T.Vector3,l1:number,l2:number,side:number){
  const v=target.clone().sub(upper.position),d=T.MathUtils.clamp(v.length(),.05,l1+l2-.001),unit=v.normalize();
  const pole=l1===.42?new T.Vector3(side*.18,-1,.3):new T.Vector3(side*.55,.18,-.55),along=(l1*l1+d*d-l2*l2)/(2*d),out=pole.clone().addScaledVector(unit,-unit.dot(pole)).normalize();
  const elbow=unit.clone().multiplyScalar(along).addScaledVector(out,Math.sqrt(Math.max(0,l1*l1-along*along)));
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),elbow.clone().normalize());upper.quaternion.copy(q);
  const fore=target.clone().sub(upper.position).sub(elbow).applyQuaternion(q.clone().invert()).normalize();
  lower.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),fore);
}

function crawlPose(rig:Rig,phase:number,moving:number,blend:number){
  const walkingHands=rig.arms.map((arm,i)=>new T.Vector3(0,-.49,0).applyQuaternion(rig.forearms[i].quaternion).add(rig.forearms[i].position).applyQuaternion(arm.quaternion).add(arm.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position));
  rig.torso.position.lerp(new T.Vector3(Math.sin(phase)*.033*moving, .445+Math.cos(phase*2)*.014*moving,-.1+Math.sin(phase*2-.9)*.022*moving),blend);
  rig.torso.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(1.17,Math.sin(phase)*.025*moving,Math.sin(phase)*.055*moving)),blend);
  rig.head.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(-1.13+Math.sin(phase-.9)*.035*moving,.065,-.28+Math.sin(phase-1)*.035*moving)),blend);
  rig.arms[1].position.y=T.MathUtils.lerp(.245,.292,blend);
  const inverse=rig.torso.quaternion.clone().invert();
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),u=a/(Math.PI*2),swing=u<.36,lift=(swing?Math.sin(u/.36*Math.PI):0)*moving;
    const handStride=swing?T.MathUtils.lerp(-.2624,.2624,T.MathUtils.smoothstep(u/.36,0,1)):.2624-.82*(u-.36);
    const hand=walkingHands[i].lerp(new T.Vector3(side*(.34+lift*.025),.075+lift*.1,.59+handStride*(moving>.01?1:0)),blend).sub(rig.torso.position).applyQuaternion(inverse);
    reach(rig.arms[i],rig.forearms[i],hand,.46,.49,side);
    const armWorld=rig.torso.quaternion.clone().multiply(rig.arms[i].quaternion).multiply(rig.forearms[i].quaternion);
    rig.palms[i].quaternion.copy(armWorld.invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,side*.16))));
    const walkFoot=new T.Vector3(0,-.42,0).applyQuaternion(rig.knees[i].quaternion).add(rig.knees[i].position).applyQuaternion(rig.legs[i].quaternion).add(rig.legs[i].position);
    rig.legs[i].position.lerp(new T.Vector3(side*.125,.48,-.45),blend);
    reach(rig.legs[i],rig.knees[i],walkFoot.lerp(new T.Vector3(side*.19,.095+Math.max(0,-Math.sin(a))*.015*moving,-1.04+Math.sin(a-.7)*.04*moving),blend),.42,.42,side);
    rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert();
  }
}

export function animateGhostPassenger(figure:T.Group,time:number,scare:number,reducedMotion:boolean){
  const rig=poseGhost(figure,time,0,1,reducedMotion,0);if(!rig)return;
  rig.torso.position.set(0,.83,.03);rig.torso.rotation.set(-.12,0,-.12);
  for(let i=0;i<2;i++){rig.legs[i].position.set((i===0?-1:1)*.12,.61,.04);rig.legs[i].rotation.set(-1.75,0,0);rig.knees[i].rotation.set(2.28,0,0);rig.ankles[i].rotation.set(-.53,0,0);rig.arms[i].rotation.set(-.55-scare*.65,0,(i===0?-1:1)*.18);rig.forearms[i].rotation.set(-.85,0,0);}
  rig.head.rotation.set(.05,-.7,-.26+(reducedMotion?0:Math.sin(time*21)*.025*scare));
  rig.head.position.z+=scare*.055;poseFace(rig.face,scare);rig.tails.scale.y=.68;
  poseDress(rig.gown,rig.hem,rig.torso,time,0,true);
  settleHair(rig.tails,figure,time,.25);poseArms(rig);bloodDrops(rig,time,.255);

}

export function animateGhostAttack(figure:T.Group,time:number,reducedMotion:boolean,eyeHeight=1.65){
  const rig=poseGhost(figure,time,0,1,reducedMotion,0);if(!rig)return;
  const opening=T.MathUtils.smoothstep(time,.12,.48),convulsion=(reducedMotion?.018:.12)*opening,fall=T.MathUtils.smoothstep(time,1.05,2.55);
  rig.torso.position.y=T.MathUtils.lerp(eyeHeight-.48,1.16,fall);
  rig.torso.position.z=.02+.055*opening*(1-fall);
  rig.torso.rotation.set(.02+Math.sin(time*17)*convulsion*.4,Math.sin(time*13)*convulsion*.3,-.06+Math.sin(time*19)*convulsion*.4);
  rig.head.rotation.set(T.MathUtils.lerp(.16,-.09,opening)+Math.sin(time*31)*convulsion*.6,.025+Math.sin(time*23)*convulsion*.55,T.MathUtils.lerp(-.43,-.03,opening)+Math.sin(time*27)*convulsion*.65);
  const gape=opening*(1+Math.sin(time*33)*(reducedMotion?.006:.025));
  rig.head.position.z+=.055*opening;poseFace(rig.face,gape);rig.mouth.visible=true;
  rig.hair.rotation.set(0,0,0);rig.tails.rotation.set(0,0,0);
  for(let i=0;i<2;i++){const side=i===0?-1:1;rig.arms[i].rotation.set(-2.05+Math.sin(time*18+i)*convulsion*2,side*.3,side*.35);rig.forearms[i].rotation.set(-.8+Math.sin(time*21+i)*convulsion,0,side*.2);}
  poseDress(rig.gown,rig.hem,rig.torso,time,0);settleHair(rig.tails,figure,time,0);poseArms(rig);bloodDrops(rig,time);
}

export function animateGhostEmergence(figure:T.Group,time:number,reducedMotion:boolean){
  const rig=poseGhost(figure,time,.35,.45,reducedMotion,time*2.5,1);if(!rig)return;
  const release=T.MathUtils.smoothstep(time,1.2,4.2);
  rig.body.rotation.x=1.32*(1-release);
  rig.head.rotation.z-=.16*(1-release);
  poseFace(rig.face,0);rig.mouth.visible=false;
  poseDress(rig.gown,rig.hem,rig.torso,time,1);poseArms(rig);
  settleHair(rig.tails,figure,time,-figure.position.y);bloodDrops(rig,time);
}
