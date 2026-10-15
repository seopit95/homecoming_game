import * as T from 'three';
import {surface} from './materials.ts';
import {skinArm,poseSkinArm,connectWrist} from './ghost-limbs.ts';
import {createHair,settleHair} from './ghost-hair.ts';
import {createFace,poseFace,type FaceRig} from './ghost-face.ts';
import {createDress,createClavicle,poseClavicle,poseDress,poseDressArms} from './ghost-dress.ts';
import {extremity} from './ghost-anatomy.ts';
import type {Solid} from './world.ts';

type Clearance={side:number;front:number;back:number};
const openClearance:Clearance={side:0,front:0,back:0};
const armTuck=(t:Clearance)=>T.MathUtils.smoothstep(Math.max(t.side,t.front),0,.65);
type Rig={crawl:number;tuck:Clearance;drips:T.InstancedMesh;neck:T.Mesh;clavicle:T.Mesh;face:FaceRig;skinArms:T.Mesh[];body:T.Group;mouth:T.Group;tails:T.Group;torso:T.Group;head:T.Group;arms:T.Group[];forearms:T.Group[];palms:T.Group[];legs:T.Group[];knees:T.Group[];ankles:T.Group[];hair:T.Group;gown:T.Mesh;hem:Float32Array};
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
  const clavicle=createClavicle(torso,skin);
  const face=createFace(head,skin),{mouth}=face;
  const {hair,tails}=createHair(head);
  const arms:T.Group[]=[],forearms:T.Group[]=[],palms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.18,side<0?.308:.245,side<0?0:-.015);torso.add(arm);arms.push(arm);
    const forearm=new T.Group();forearm.position.y=-.46;arm.add(forearm);forearms.push(forearm);
    const palm=new T.Group();palm.position.y=-.49;forearm.add(palm);palms.push(palm);
    palm.add(extremity('hand',side,skin));
    const leg=new T.Group();leg.name=`ghost-hip-${side}`;leg.position.set(side*.105,.87,.015);figure.add(leg);legs.push(leg);
    segment(leg,.42,.07,skin).name='ghost-thigh';
    const knee=new T.Group();knee.name=`ghost-knee-${side}`;knee.position.y=-.42;leg.add(knee);knees.push(knee);ellipsoid(knee,0,-.014,0,.029,.048,.027,skin);segment(knee,.42,.035,skin);
    const ankle=new T.Group();ankle.name=`ghost-ankle-${side}`;ankle.position.y=-.42;knee.add(ankle);ankles.push(ankle);ankle.add(extremity('foot',side,skin));
  }
  const body=new T.Group();body.name='ghost-body';body.add(...figure.children);figure.add(body);
  const skinArms=arms.map(()=>skinArm(body,skin));
  // The opaque authored sleeves replace covered shoulder skin; keep an overlap
  // before the cuff and the complete exposed elbow/forearm/wrist surfaces.
  skinArms.forEach(arm=>{
    const source=arm.geometry.index!,visible:number[]=[];
    for(let i=0;i<source.count;i+=3){const face=[source.getX(i),source.getX(i+1),source.getX(i+2)];if(face.every(v=>Math.floor(v/17)>=6))visible.push(...face);}
    arm.geometry.setIndex(visible);
  });
  skinArms.forEach((arm,i)=>connectWrist(arm,palms[i].children[0] as T.Mesh));
  const drips=new T.InstancedMesh(new T.SphereGeometry(.003,6,5),new T.MeshPhysicalMaterial({color:'#39090c',roughness:.25,clearcoat:.7}),6);drips.name='ghost-blood-drips';drips.frustumCulled=false;body.add(drips);
  rigs.set(figure,{crawl:0,tuck:openClearance,drips,neck,clavicle,face,skinArms,body,mouth,tails,torso,head,arms,forearms,palms,legs,knees,ankles,hair,gown,hem});animateGhost(figure,0,0,0,false);return figure;
}
function poseGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0,tuck:Clearance=openClearance){
  const rig=rigs.get(figure);if(!rig)return;
  rig.tuck=tuck;rig.crawl=crawl;
  rig.body.position.set(0,0,0);rig.body.quaternion.identity();
  rig.head.position.set(-.025,.46,.028);rig.arms[1].position.y=.245;
  const step=Math.sin(phase),drag=Math.sin(phase/2),jerk=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.7)),22);
  rig.torso.rotation.set(.035+drag*.018*moving,Math.sin(time*.8)*.035,-.035+Math.max(0,step)*.025*moving);
  rig.torso.position.set(.035,1.16+Math.abs(step)*.014*moving,.02);
  rig.head.rotation.set(.24+Math.sin(time*.9)*.025,-.12+Math.sin(time*.73)*.045+jerk*.19,-.59-jerk*.12+proximity*.06);
  rig.arms[0].rotation.set(.1+step*.14*moving,-.1,.08);rig.arms[1].rotation.set(-.2-step*.055*moving,.24,-.2);
  rig.forearms[0].rotation.set(-.17,.1,.08);rig.forearms[1].rotation.set(-.56+jerk*.13,.35,-.28);
  for(let i=0;i<2;i++){
    rig.legs[i].position.set((i===0?-1:1)*.105,.87,.015);rig.palms[i].rotation.set(0,0,0);
    const a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),swing=a<Math.PI,lift=swing?Math.sin(a):0;
    const stride=.39*(1-Math.max(tuck.front,tuck.back)*.65),z=(swing?-Math.cos(a)*stride:stride-(a-Math.PI)/Math.PI*stride*2)*moving,y=-.80+lift*(i===0?.075:.035)*moving;
    const distance=Math.min(.839,Math.hypot(y,z)),bend=Math.acos(distance/.84),hip=Math.atan2(-z,-y)-bend;
    rig.legs[i].rotation.set(hip,0,i===0?.035:-.035);rig.knees[i].rotation.set(bend*2,0,0);
    rig.ankles[i].rotation.set(-hip-bend*2+(swing?Math.sin(a)*(i===0?.17:.08):0)*moving,0,0);
  }
  rig.hair.rotation.set(0,0,0);
  rig.tails.scale.set(1,1,1);rig.tails.rotation.set(0,0,0);
  // Wall avoidance also applies to the walking end of a crawl transition.
  if(Math.max(tuck.side,tuck.front)>0){
    const fold=Math.max(tuck.side,tuck.front);
    const inverse=rig.torso.quaternion.clone().invert();
    for(let i=0;i<2;i++){
      const side=i===0?-1:1,hand=new T.Vector3(0,-.49,0).applyQuaternion(rig.forearms[i].quaternion).add(rig.forearms[i].position).applyQuaternion(rig.arms[i].quaternion).add(rig.arms[i].position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
      hand.lerp(new T.Vector3(side*.21,.54,.015),fold).sub(rig.torso.position).applyQuaternion(inverse);
      reach(rig.arms[i],rig.forearms[i],hand,.46,.49,side,new T.Vector3(side*.1,0,-1).applyQuaternion(inverse));
      const wrist=rig.torso.quaternion.clone().multiply(rig.arms[i].quaternion).multiply(rig.forearms[i].quaternion);
      rig.palms[i].quaternion.slerp(wrist.invert(),fold);
    }
  }
  if(crawl>0){
    crawlPose(rig,phase,moving,T.MathUtils.clamp(crawl,0,1),tuck);
    const twitch=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.43)),20)*.085;
    rig.head.rotation.y+=twitch*crawl;rig.head.rotation.z-=twitch*.6*crawl;
  }
  return rig;
}
export function animateGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0,heightAt?:(x:number,z:number)=>number,solids:Solid[]=[]){
  const tuck=crawlClearance(figure,solids);
  const rig=poseGhost(figure,time,moving,proximity,reducedMotion,phase,crawl,tuck);if(!rig)return;
  poseFace(rig.face,0);rig.mouth.visible=false;
  if(heightAt)groundGhost(figure,heightAt,false);
  poseDress(rig.gown,rig.hem,rig.torso,rig.knees,crawl,false,tuck.back,tuck.side,tuck.front);
  settleHair(rig.tails,figure,time,crawlFloor(rig),heightAt);poseArms(rig);bloodDrops(rig,time);
}

// Match the planted-hand stroke to distance travelled. Tight frontal clearance
// needs shorter, slower steps; a parallel wall only changes the elbow bend.
export function ghostStrideLength(figure:T.Group,solids:Solid[],crawl:boolean){
  const tuck=crawlClearance(figure,solids);
  return crawl?.82*(1-tuck.front*.86):1.56*(1-Math.max(tuck.front,tuck.back)*.65);
}

// Reserve room for the full reaching pose, then gather the limbs toward the
// body before a wall can enter their sweep. Ray tests use door-local axes.
function crawlClearance(figure:T.Group,solids:Solid[],height=1.3){
  const p=figure.position,yaw=figure.rotation.y,c=Math.cos(yaw),s=Math.sin(yaw),tuck:Clearance={side:0,front:0,back:0};
  for(const b of solids){
    if((b.y??1.5)+(b.h??3)/2<p.y+.02||(b.y??1.5)-(b.h??3)/2>p.y+height)continue;
    if(Math.hypot(b.x-p.x,b.z-p.z)>Math.hypot(b.w,b.d)/2+1.6)continue;
    const bc=Math.cos(b.yaw??0),bs=Math.sin(b.yaw??0),ox=bc*(p.x-b.x)-bs*(p.z-b.z),oz=bs*(p.x-b.x)+bc*(p.z-b.z);
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/16){
      const ux=Math.cos(angle),uz=Math.sin(angle),length=Math.min(.78/Math.max(.0001,Math.abs(ux)),(uz<0?1.3:1.25)/Math.max(.0001,Math.abs(uz))),x=ux*length,z=uz*length;
      const wx=c*x+s*z,wz=-s*x+c*z,dx=bc*wx-bs*wz,dz=bs*wx+bc*wz;let lo=0,hi=1,entryAxis=0;
      for(const [axis,[origin,d,half]] of [[ox,dx,b.w/2+.035],[oz,dz,b.d/2+.035]].entries()){
        if(Math.abs(d)<1e-8){if(Math.abs(origin)>=half){hi=-1;break;}}
        else{const near=(-half-origin)/d,far=(half-origin)/d,entry=Math.min(near,far);if(entry>lo){lo=entry;entryAxis=axis;}hi=Math.min(hi,Math.max(near,far));}
      }
      if(lo<hi&&lo<1&&hi>0){
        const amount=T.MathUtils.clamp((length-lo*length)/(length-.43),0,1),nx=entryAxis===0?bc:bs,nz=entryAxis===0?-bs:bc;
        tuck.side=Math.max(tuck.side,amount*T.MathUtils.smoothstep(Math.abs(nx*c-nz*s),.05,.35));
        const end=uz<0?'back':'front';tuck[end]=Math.max(tuck[end],amount*T.MathUtils.smoothstep(Math.abs(nx*s+nz*c),.05,.35));
      }
    }
  }
  return tuck;
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
  const bottom=new T.Vector3(0,.37,-.012),top=new T.Vector3(0,-.090,-.020).multiply(rig.head.scale).applyQuaternion(rig.head.quaternion).add(rig.head.position),axis=top.clone().sub(bottom);
  rig.neck.position.copy(bottom).lerp(top,.5);rig.neck.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize());rig.neck.scale.set(.035,axis.length()*.5+.023,.032);
  poseClavicle(rig.clavicle,rig.neck);
  rig.skinArms.forEach((mesh,i)=>poseSkinArm(mesh,rig.arms[i],rig.forearms[i],rig.palms[i]));
  poseDressArms(rig.gown,rig.hem,rig.arms);
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
    const target=tip.getWorldPosition(new T.Vector3()),orientation=new T.Quaternion().setFromEuler(new T.Euler(arm?-Math.PI/2:0,yaw+(arm?(i===0?1:-1)*1.1*armTuck(rig.tuck):0),arm?(i===0?-1:1)*.16:0,'YXZ'));
    const lift=rig.body.worldToLocal(target.clone()).y;
    const bearing=yaw+(arm?(i===0?1:-1)*1.1*armTuck(rig.tuck):0);
    const support=Math.max(...[-.1,.1].flatMap(x=>[-.07,arm?.38:.24].map(z=>floorAt(target.z+Math.cos(bearing)*z-Math.sin(bearing)*x))));
    target.y=support+lift+.055;
    const side=i===0?-1:1,pole=arm?new T.Vector3(side*.55,.18,-.55).lerp(new T.Vector3(0,0,-1).applyQuaternion(rig.torso.quaternion.clone().invert()),armTuck(rig.tuck)):new T.Vector3(side*.18,-1,.3).lerp(new T.Vector3(0,0,1),rig.tuck.back);
    reach(upper,lower,upper.parent!.worldToLocal(target),arm?.46:.42,arm?.49:.42,side,pole);
    tip.quaternion.copy(lower.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
  }
  if(finish){poseDress(rig.gown,rig.hem,rig.torso,rig.knees,rig.crawl,false,rig.tuck.back,rig.tuck.side,rig.tuck.front);settleHair(rig.tails,figure,0,0,heightAt);poseArms(rig);}
}

function reach(upper:T.Group,lower:T.Group,target:T.Vector3,l1:number,l2:number,side:number,poleOverride?:T.Vector3){
  const v=target.clone().sub(upper.position),d=T.MathUtils.clamp(v.length(),.05,l1+l2-.001),unit=v.normalize();
  const pole=poleOverride??(l1===.42?new T.Vector3(side*.18,-1,.3):new T.Vector3(side*.55,.18,-.55)),along=(l1*l1+d*d-l2*l2)/(2*d),out=pole.clone().addScaledVector(unit,-unit.dot(pole)).normalize();
  const elbow=unit.clone().multiplyScalar(along).addScaledVector(out,Math.sqrt(Math.max(0,l1*l1-along*along)));
  // Align the bone by a swing, preserving its authored axial twist and sleeve frame.
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0).applyQuaternion(upper.quaternion),elbow.clone().normalize()).multiply(upper.quaternion);upper.quaternion.copy(q);
  const fore=target.clone().sub(upper.position).sub(elbow).applyQuaternion(q.clone().invert()).normalize();
  lower.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),fore);
}

function crawlPose(rig:Rig,phase:number,moving:number,blend:number,tuck:Clearance=openClearance){
  const front=tuck.front,back=tuck.back,arms=armTuck(tuck);
  const walkingHands=rig.arms.map((arm,i)=>new T.Vector3(0,-.49,0).applyQuaternion(rig.forearms[i].quaternion).add(rig.forearms[i].position).applyQuaternion(arm.quaternion).add(arm.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position));
  const walkingElbows=rig.arms.map((arm,i)=>rig.forearms[i].position.clone().applyQuaternion(arm.quaternion).add(arm.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position));
  const walkingPalms=rig.arms.map((arm,i)=>rig.torso.quaternion.clone().multiply(arm.quaternion).multiply(rig.forearms[i].quaternion).multiply(rig.palms[i].quaternion));
  rig.torso.position.lerp(new T.Vector3(Math.sin(phase)*.033*moving, .445+back*.22+Math.cos(phase*2)*.014*moving,-.1-front*.06+Math.sin(phase*2-.9)*.022*moving*(1-front)),blend);
  rig.torso.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(1.17-front*.37,Math.sin(phase)*.025*moving,Math.sin(phase)*.055*moving)),blend);
  rig.head.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(-1.13+Math.sin(phase-.9)*.035*moving,.065,-.28+Math.sin(phase-1)*.035*moving)),blend);
  rig.arms[1].position.y=T.MathUtils.lerp(.245,.292,blend);
  const inverse=rig.torso.quaternion.clone().invert();
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),u=a/(Math.PI*2),swing=u<.36,lift=(swing?Math.sin(u/.36*Math.PI):0)*moving;
    const handStride=swing?T.MathUtils.lerp(-.2624,.2624,T.MathUtils.smoothstep(u/.36,0,1)):.2624-.82*(u-.36);
    const hand=walkingHands[i].lerp(new T.Vector3(side*(.34-arms*.15+lift*.025*(1-arms)),.075+lift*.1,.59-front*.44+handStride*(moving>.01?1:0)*(1-front*.86)),blend).sub(rig.torso.position).applyQuaternion(inverse);
    const crawlPole=new T.Vector3(side*.55,.18,-.55).lerp(new T.Vector3(0,0,-1).applyQuaternion(inverse),arms).normalize();
    const elbowPole=walkingElbows[i].sub(rig.torso.position).applyQuaternion(inverse).sub(rig.arms[i].position).normalize().lerp(crawlPole,blend);
    reach(rig.arms[i],rig.forearms[i],hand,.46,.49,side,elbowPole);
    const armWorld=rig.torso.quaternion.clone().multiply(rig.arms[i].quaternion).multiply(rig.forearms[i].quaternion);
    const palmOrientation=walkingPalms[i].slerp(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,-side*1.1*arms,side*.16,'YXZ')),blend);
    rig.palms[i].quaternion.copy(armWorld.invert().multiply(palmOrientation));
    const walkFoot=new T.Vector3(0,-.42,0).applyQuaternion(rig.knees[i].quaternion).add(rig.knees[i].position).applyQuaternion(rig.legs[i].quaternion).add(rig.legs[i].position);
    const kneePole=rig.knees[i].position.clone().applyQuaternion(rig.legs[i].quaternion).normalize().lerp(new T.Vector3(side*.18,-1,.3).lerp(new T.Vector3(0,0,1),back).normalize(),blend);
    const footOrientation=rig.legs[i].quaternion.clone().multiply(rig.knees[i].quaternion).multiply(rig.ankles[i].quaternion).slerp(new T.Quaternion(),blend);
    rig.legs[i].position.lerp(new T.Vector3(side*.125,.48+back*.2,-.45+back*.25),blend);
    reach(rig.legs[i],rig.knees[i],walkFoot.lerp(new T.Vector3(side*(.19-back*.07),.095+Math.max(0,-Math.sin(a))*.015*moving,-1.04+back*.82+Math.sin(a-.7)*.04*moving*(1-back)),blend),.42,.42,side,kneePole);
    rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert().multiply(footOrientation);
  }
}

export function animateGhostPassenger(figure:T.Group,time:number,scare:number,reducedMotion:boolean,cabinReach=false){
  const rig=poseGhost(figure,time,0,1,reducedMotion,0);if(!rig)return;
  rig.torso.position.set(0,.83,.03);rig.torso.rotation.set(-.12,0,-.12);
  for(let i=0;i<2;i++){rig.legs[i].position.set((i===0?-1:1)*.12,.61,.04);rig.legs[i].rotation.set(-1.75,0,0);rig.knees[i].rotation.set(2.28,0,0);rig.ankles[i].rotation.set(-.53,0,0);rig.arms[i].rotation.set(-.55-(cabinReach?0:scare*.65),0,(i===0?-1:1)*.18);rig.forearms[i].rotation.set(-.85,0,0);}
  // The low sedan needs the resting hands ahead of the lap, then a reach across
  // toward the driver. The existing solver retains the full arm/hand surfaces.
  if(cabinReach)for(let i=0;i<2;i++){
    const upper=rig.arms[i],lower=rig.forearms[i],palm=rig.palms[i];
    const hand=new T.Vector3(i===0?-.13:.13,-.32,.50).lerp(new T.Vector3(i===0?.48:.65,i===0?.16:.20,.12),scare);
    reach(upper,lower,hand,.46,.49,i===0?-1:1,new T.Vector3(.8,-1,.3).lerp(new T.Vector3(.2,-1,1.8),scare));
    const orientation=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0)).slerp(new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)),scare);
    palm.quaternion.copy(upper.quaternion).multiply(lower.quaternion).invert().multiply(orientation);
  }
  rig.head.rotation.set(.05,cabinReach?.7:-.7,-.26+(reducedMotion?0:Math.sin(time*21)*.025*scare));
  rig.head.position.z+=scare*.055;poseFace(rig.face,scare);rig.tails.scale.y=.68;
  poseDress(rig.gown,rig.hem,rig.torso,rig.knees,0,true);
  settleHair(rig.tails,figure,time,.25);poseArms(rig);bloodDrops(rig,time,.255);

}

export function animateGhostAttack(figure:T.Group,time:number,reducedMotion:boolean,eyeHeight=1.65,solids:Solid[]=[]){
  const rig=poseGhost(figure,time,0,1,reducedMotion,0);if(!rig)return;
  const opening=T.MathUtils.smoothstep(time,.12,.48),convulsion=(reducedMotion?.018:.12)*opening,fall=T.MathUtils.smoothstep(time,1.05,2.55);
  rig.torso.position.y=T.MathUtils.lerp(eyeHeight-.48,1.16,fall);
  rig.torso.position.z=.02+.055*opening*(1-fall);
  rig.torso.rotation.set(.02+Math.sin(time*17)*convulsion*.4,Math.sin(time*13)*convulsion*.3,-.06+Math.sin(time*19)*convulsion*.4);
  // Keep the pelvis below the lowered waist and balance it over planted feet.
  // This keeps the waist/hip/knee guides descending and bends the knees forward
  // on the same branch as the ordinary standing pose.
  const clearance=crawlClearance(figure,solids,3),lower=Math.min(0,rig.torso.position.y-.95);
  if(lower<0)for(let i=0;i<2;i++){
    const foot=rig.ankles[i].position.clone().applyQuaternion(rig.knees[i].quaternion).add(rig.knees[i].position).applyQuaternion(rig.legs[i].quaternion).add(rig.legs[i].position);
    const orientation=rig.legs[i].quaternion.clone().multiply(rig.knees[i].quaternion).multiply(rig.ankles[i].quaternion);
    rig.legs[i].position.y+=lower;rig.legs[i].position.z-=Math.min(.22,-lower*.8);
    const side=i===0?-1:1;
    reach(rig.legs[i],rig.knees[i],foot,.42,.42,side,new T.Vector3(0,0,1));
    rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert().multiply(orientation);
  }
  rig.head.rotation.set(T.MathUtils.lerp(.16,-.09,opening)+Math.sin(time*31)*convulsion*.6,.025+Math.sin(time*23)*convulsion*.55,T.MathUtils.lerp(-.43,-.03,opening)+Math.sin(time*27)*convulsion*.65);
  const gape=opening*(1+Math.sin(time*33)*(reducedMotion?.006:.025));
  rig.head.position.z+=.055*opening;poseFace(rig.face,gape);rig.mouth.visible=true;
  rig.hair.rotation.set(0,0,0);rig.tails.rotation.set(0,0,0);
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,hand=new T.Vector3(side*.34,.06+Math.sin(time*18+i)*convulsion*.18,.40+Math.sin(time*21+i)*convulsion*.08);
    reach(rig.arms[i],rig.forearms[i],hand,.46,.49,side,new T.Vector3(side*.9,-.65,-.2));
    const fore=rig.arms[i].quaternion.clone().multiply(rig.forearms[i].quaternion),palm=new T.Quaternion().setFromEuler(new T.Euler(-1.38+Math.sin(time*21+i)*convulsion*.3,side*.12,side*.06));
    rig.palms[i].quaternion.copy(fore).invert().multiply(palm);
  }
  const fold=armTuck(clearance),inverse=rig.torso.quaternion.clone().invert();
  if(fold>0)for(let i=0;i<2;i++){
    const side=i===0?-1:1,upper=rig.arms[i].quaternion.clone(),fore=upper.clone().multiply(rig.forearms[i].quaternion);
    const elbow=new T.Vector3(0,-1,0).applyQuaternion(upper),foreAxis=new T.Vector3(0,-1,0).applyQuaternion(fore);
    const hand=foreAxis.clone().multiplyScalar(.49).add(elbow.clone().multiplyScalar(.46)).add(rig.arms[i].position);
    hand.lerp(new T.Vector3(side*.17,rig.torso.position.y+.06,.22).sub(rig.torso.position).applyQuaternion(inverse),fold);
    const pole=elbow.clone().lerp(new T.Vector3(0,-1,-.2).normalize().applyQuaternion(inverse),fold);
    reach(rig.arms[i],rig.forearms[i],hand,.46,.49,side,pole);
    const bentElbow=new T.Vector3(0,-1,0).applyQuaternion(rig.arms[i].quaternion),bentFore=new T.Vector3(0,-1,0).applyQuaternion(rig.forearms[i].quaternion).applyQuaternion(rig.arms[i].quaternion);
    rig.arms[i].quaternion.setFromUnitVectors(elbow,bentElbow).multiply(upper);
    const foreOrientation=new T.Quaternion().setFromUnitVectors(foreAxis,bentFore).multiply(fore);
    rig.forearms[i].quaternion.copy(rig.arms[i].quaternion).invert().multiply(foreOrientation);
    const wrist=rig.torso.quaternion.clone().multiply(fore).multiply(rig.palms[i].quaternion).slerp(new T.Quaternion(),fold);
    rig.palms[i].quaternion.copy(rig.torso.quaternion).multiply(foreOrientation).invert().multiply(wrist);
  }
  poseDress(rig.gown,rig.hem,rig.torso,rig.knees,0,false,clearance.back,clearance.side,clearance.front);settleHair(rig.tails,figure,time,0);poseArms(rig);bloodDrops(rig,time);
}

export function animateGhostEmergence(figure:T.Group,time:number,reducedMotion:boolean){
  const rig=poseGhost(figure,time,.35,.45,reducedMotion,time*2.5,1);if(!rig)return;
  const release=T.MathUtils.smoothstep(time,1.2,4.2);
  rig.body.rotation.x=1.32*(1-release);
  rig.head.rotation.z-=.16*(1-release);
  poseFace(rig.face,0);rig.mouth.visible=false;
  poseDress(rig.gown,rig.hem,rig.torso,rig.knees,1);poseArms(rig);
  settleHair(rig.tails,figure,time,-figure.position.y);bloodDrops(rig,time);
}
