import * as T from 'three';
import {surface} from './materials.ts';
import {createAnatomicalArm,poseAnatomicalArm} from './ghost-arms.ts';
import {createAnatomicalLeg} from './ghost-legs.ts';
import {createHair,settleHair} from './ghost-hair.ts';
import {createFace,poseFace,type FaceRig} from './ghost-face.ts';
import {createDress,poseDress,poseDressArms} from './ghost-dress.ts';
import {createNeck,poseNeck,anchorHeadAtNeck,constrainSeatedSkin} from './ghost-neck.ts';
import {extremity} from './ghost-anatomy.ts';
import type {Solid} from './world.ts';

type Clearance={side:number;front:number;back:number};
type Contact={point:T.Vector3;rotation:T.Quaternion;stance:boolean;withdrawing:boolean;from:T.Vector3;fromRotation:T.Quaternion};
type Steps={position:T.Vector3;yaw:number;time:number;phase:number;crawl:number;tuck:Clearance;live:boolean;contacts:Contact[]};
const openClearance:Clearance={side:0,front:0,back:0};
const armTuck=(t:Clearance)=>T.MathUtils.smoothstep(Math.max(t.side,t.front),0,.65);
type Rig={steps?:Steps;crawl:number;kneel:number;tuck:Clearance;drips:T.InstancedMesh;neck:T.Mesh;headOffset:T.Vector3;face:FaceRig;skinArms:T.Mesh[];skinLegs:T.Mesh[];body:T.Group;mouth:T.Group;tails:T.Group;torso:T.Group;head:T.Group;arms:T.Group[];forearms:T.Group[];palms:T.Group[];legs:T.Group[];knees:T.Group[];ankles:T.Group[];hair:T.Group;gown:T.Mesh;hem:Float32Array};
const rigs=new WeakMap<T.Group,Rig>();
export function createGhost(parent:T.Object3D){
  const figure=new T.Group();figure.name='resident-remains';figure.rotation.order='YXZ';parent.add(figure);figure.visible=false;
  const skin=surface('skin','#bfc7c3',{roughness:.62}),cloth=surface('cloth','#aeb5b0',{side:T.DoubleSide,roughness:.82,bumpScale:.00035,vertexColors:true});
  const torso=new T.Group();torso.position.set(.035,1.16,.02);figure.add(torso);
  const {gown,hem}=createDress(torso,cloth);
  const head=new T.Group();head.name='ghost-head';head.position.set(0,.502,.00816);head.scale.set(.67,.68,.68);torso.add(head);
  const face=createFace(head,skin),{mouth}=face;
  const neck=createNeck(torso,head,face.face,gown,skin);
  const {hair,tails}=createHair(head);
  const arms:T.Group[]=[],forearms:T.Group[]=[],palms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.name=`ghost-shoulder-${side}`;arm.position.set(side*.18,side<0?.308:.245,side<0?0:-.015);torso.add(arm);arms.push(arm);
    const forearm=new T.Group();forearm.position.y=-.46;arm.add(forearm);forearms.push(forearm);
    const palm=new T.Group();palm.position.y=-.49;forearm.add(palm);palms.push(palm);
    palm.add(extremity('hand',side,skin));
    const leg=new T.Group();leg.name=`ghost-hip-${side}`;leg.position.set(side*.105,.87,.015);figure.add(leg);legs.push(leg);
    const knee=new T.Group();knee.name=`ghost-knee-${side}`;knee.position.y=-.42;leg.add(knee);knees.push(knee);
    const ankle=new T.Group();ankle.name=`ghost-ankle-${side}`;ankle.position.y=-.42;knee.add(ankle);ankles.push(ankle);ankle.add(extremity('foot',side,skin));
  }
  const body=new T.Group();body.name='ghost-body';body.add(...figure.children);figure.add(body);
  const skinArms=arms.map((_,i)=>createAnatomicalArm(body,i===0?-1:1,skin,palms[i].children[0] as T.Mesh));
  const skinLegs=legs.map((_,i)=>createAnatomicalLeg(body,i===0?-1:1,skin,ankles[i].children[0] as T.Mesh));
  const drips=new T.InstancedMesh(new T.SphereGeometry(.003,6,5),new T.MeshPhysicalMaterial({color:'#39090c',roughness:.25,clearcoat:.7}),6);drips.name='ghost-blood-drips';drips.frustumCulled=false;body.add(drips);
  rigs.set(figure,{crawl:0,kneel:0,tuck:openClearance,drips,neck,headOffset:new T.Vector3(),face,skinArms,skinLegs,body,mouth,tails,torso,head,arms,forearms,palms,legs,knees,ankles,hair,gown,hem});animateGhost(figure,0,0,0,false);return figure;
}
function poseGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0,tuck:Clearance=openClearance,walking=false,kneeGround=1){
  const rig=rigs.get(figure);if(!rig)return;
  rig.tuck=tuck;rig.crawl=crawl;rig.kneel=0;
  rig.body.position.set(0,0,0);rig.body.quaternion.identity();
  rig.head.position.set(0,.502,.00816);rig.headOffset.set(0,0,0);rig.arms[1].position.y=.245;
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
  if(walking&&crawl<1){
    const stride=.39*(1-Math.max(tuck.front,tuck.back)*.65);
    const feet=[0,1].map(i=>{const a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),swing=a<Math.PI;return {swing,a,z:(swing?-Math.cos(a)*stride:stride-(a-Math.PI)/Math.PI*stride*2)};});
    const hip=Math.min(.87,.07+Math.sqrt(.83**2-Math.max(...feet.map(f=>f.z*f.z))));
    rig.torso.position.y-=.87-hip;
    for(let i=0;i<2;i++){
      const side=i===0?-1:1,f=feet[i],lift=f.swing&&moving>.01?Math.sin(f.a):0;
      rig.legs[i].position.y=hip;
      reach(rig.legs[i],rig.knees[i],new T.Vector3(side*.105,.07+lift*(i===0?.075:.035),.015+f.z),.42,.42,side,new T.Vector3(0,0,1));
      rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert().multiply(new T.Quaternion().setFromEuler(new T.Euler(lift*(i===0?.17:.08),0,0)));
    }
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
    crawlPose(rig,phase,moving,T.MathUtils.clamp(crawl,0,1),tuck,kneeGround,reducedMotion?0:1);
    const twitch=reducedMotion?0:Math.pow(Math.max(0,Math.sin(time*1.43)),20)*.085;
    rig.head.rotation.y+=twitch*crawl;rig.head.rotation.z-=twitch*.6*crawl;
  }
  anchorHeadAtNeck(rig.head,rig.headOffset);return rig;
}
export function animateGhost(figure:T.Group,time:number,moving:number,proximity:number,reducedMotion:boolean,phase=time*6.1,crawl=0,heightAt?:(x:number,z:number)=>number,solids:Solid[]=[]){
  const tuck=crawlClearance(figure,solids);
  const previous=rigs.get(figure)?.steps,dt=previous?time-previous.time:0;
  const turned=previous?Math.abs(Math.atan2(Math.sin(figure.rotation.y-previous.yaw),Math.cos(figure.rotation.y-previous.yaw))):0;
  const continuous=!!previous&&dt>=0&&dt<=.12&&figure.position.distanceTo(previous.position)<.35&&turned<.5&&(crawl<.05&&previous.crawl<.05||crawl>.95&&previous.crawl>.95)&&(dt>0||phase===previous.phase);
  const live=continuous&&(previous!.live||dt>0&&(figure.position.distanceToSquared(previous!.position)>1e-10||turned>1e-6));
  const kneeGround=heightAt?1-T.MathUtils.smoothstep(Math.abs(groundSlope(figure,heightAt)),0,.05):1;
  const rig=poseGhost(figure,time,moving,proximity,reducedMotion,phase,crawl,tuck,moving>.01||live,kneeGround);if(!rig)return;
  poseFace(rig.face,0);rig.mouth.visible=false;
  if(heightAt)groundGhost(figure,heightAt,false);
  plantContacts(figure,rig,time,phase,crawl,moving,live,continuous?previous:undefined);
  poseDress(rig.gown,rig.hem,rig.torso,rig.knees,crawl,false,tuck.back,tuck.side,tuck.front);
  settleHair(rig.tails,figure,time,crawlFloor(rig),heightAt);poseArms(rig);bloodDrops(rig,time);
}

// A support belongs to the floor, not the translating/turning animation root.
// Teleports, a new scene and stand-to-crawl blends seed fresh contacts instead.
function plantContacts(figure:T.Group,rig:Rig,time:number,phase:number,crawl:number,moving:number,live:boolean,previous?:Steps){
  const arms=crawl>.95,stable=arms||crawl<.05,contacts:Contact[]=[];
  const tightening=!!previous&&Math.max(rig.tuck.side-previous.tuck.side,rig.tuck.front-previous.tuck.front,rig.tuck.back-previous.tuck.back)>1e-5;
  figure.updateMatrixWorld(true);
  for(let j=0;j<(arms&&rig.kneel>.95?4:2);j++){
    const knee=j>=2,i=j%2,upper=arms&&!knee?rig.arms[i]:rig.legs[i],lower=arms&&!knee?rig.forearms[i]:rig.knees[i],end=knee?rig.knees[i]:arms?rig.palms[i]:rig.ankles[i];
    const point=end.getWorldPosition(new T.Vector3()),rotation=end.getWorldQuaternion(new T.Quaternion()),u=T.MathUtils.euclideanModulo(phase+i*Math.PI+(knee?Math.PI/2:0),Math.PI*2)/(Math.PI*2),swing=arms?.36:.5,stance=u>=swing||moving<=.01;
    const old=previous?.contacts[j],contact:Contact={point:point.clone(),rotation:rotation.clone(),stance,withdrawing:false,from:old?.from.clone()??point.clone(),fromRotation:old?.fromRotation.clone()??rotation.clone()};
    if(live&&stable&&old){
      // Withdraw before a moving leaf takes the old support, without snapping.
      if(tightening||old.withdrawing&&(!stance||old.stance)){
        const blend=1-Math.exp(-Math.max(0,time-previous!.time)*16);
        contact.point.lerpVectors(old.point,point,blend);contact.rotation.slerpQuaternions(old.rotation,rotation,blend);
        contact.point.sub(old.point).clampLength(0,Math.max(0,time-previous!.time)*1.5).add(old.point);
        contact.withdrawing=contact.point.distanceToSquared(point)>.000004||contact.rotation.angleTo(rotation)>.01;
        contact.from.copy(contact.point);contact.fromRotation.copy(contact.rotation);
      }
      // Once clearance is steady, the next touchdown ends withdrawal at the
      // reached support rather than chasing a faster moving nominal target.
      else if(stance&&(old.stance||old.withdrawing||moving<=.01)){contact.point.copy(old.point);contact.rotation.copy(old.rotation);if(moving<=.01)contact.point.y=Math.max(point.y,contact.point.y-Math.max(0,time-previous!.time)*.45);}
      else if(!stance){
        if(old.stance){contact.from.copy(old.point);contact.fromRotation.copy(old.rotation);}
        const blend=T.MathUtils.smoothstep(u/swing,0,1);contact.point.lerpVectors(contact.from,point,blend);contact.rotation.slerpQuaternions(contact.fromRotation,rotation,blend);
      }
      const parent=upper.parent!,pole=parent.worldToLocal(lower.getWorldPosition(new T.Vector3())).sub(upper.position),target=parent.worldToLocal(contact.point.clone());
      if(knee){
        // A planted knee supports the thigh directly; keeping a foot target
        // instead would pull the knee across the floor with the moving root.
        const flat=new T.Vector2(target.x-upper.position.x,target.z-upper.position.z);
        if(flat.length()>.37){flat.clampLength(0,.37);target.x=upper.position.x+flat.x;target.z=upper.position.z+flat.y;contact.point.copy(parent.localToWorld(target.clone()));contact.withdrawing=true;}
        poseCrawlKnee(rig,i,target,1);
      }else{
        reach(upper,lower,target,arms?.46:.42,arms?.49:.42,i===0?-1:1,pole);
        end.quaternion.copy(lower.getWorldQuaternion(new T.Quaternion()).invert().multiply(contact.rotation));
      }
      figure.updateMatrixWorld(true);
    }
    contacts.push(contact);
  }
  rig.steps={position:figure.position.clone(),yaw:figure.rotation.y,time,phase,crawl,tuck:rig.tuck,live:live&&stable,contacts};
}

// Match the planted-hand stroke to distance travelled. Tight frontal clearance
// needs shorter, slower steps; a parallel wall only changes the elbow bend.
export function ghostStrideLength(figure:T.Group,solids:Solid[],crawl:boolean){
  const tuck=crawlClearance(figure,solids);
  return crawl?.82*(1-tuck.front*.86):1.56*(1-Math.max(tuck.front,tuck.back)*.65);
}
export function ghostStep(turn:number,speed:number,dt:number,stride:number,crawl:boolean){
  const budget=stride*(crawl?5.2:1.3)*dt,limit=Math.min(2.4*dt,budget/.25),rotation=T.MathUtils.clamp(turn,-limit,limit),facing=Math.max(0,Math.cos(turn));
  return {turn:rotation,distance:Math.min(speed*.85*dt,Math.max(0,budget-Math.abs(rotation)*.25))*facing*facing};
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
  rig.skinArms.forEach((mesh,i)=>poseAnatomicalArm(mesh,rig.arms[i],rig.forearms[i],rig.palms[i]));
  rig.skinLegs.forEach((mesh,i)=>poseAnatomicalArm(mesh,rig.legs[i],rig.knees[i],rig.ankles[i],rig.gown.userData.seated?constrainSeatedSkin:undefined));
  poseDressArms(rig.gown,rig.hem,rig.arms);
  poseNeck(rig.neck,rig.skinArms,rig.legs,rig.skinLegs);
}
function crawlFloor(rig:Rig){return rig.torso.position.y<.8?.018:0;}

// Fit the visual body to the stairs while the navigation root stays on its path.
function groundSlope(figure:T.Group,heightAt:(x:number,z:number)=>number){
  const p=figure.position,c=Math.cos(figure.rotation.y),s=Math.sin(figure.rotation.y),center=p.z-.35*c,span=1.05*Math.abs(c)+.34*Math.abs(s);
  return (heightAt(p.x,center+span)-heightAt(p.x,center-span))/(2*span);
}
export function groundGhost(figure:T.Group,heightAt:(x:number,z:number)=>number,finish=true){
  const rig=rigs.get(figure);if(!rig)return;
  const p=figure.position,yaw=figure.rotation.y,c=Math.cos(yaw),s=Math.sin(yaw);
  // A solid divider separates the flights: a turning limb must not sample the opposite floor.
  const floorAt=(z:number)=>heightAt(p.x,z);
  const slope=groundSlope(figure,heightAt);
  const normal=new T.Vector3(s*slope,1,-c*slope).normalize();
  rig.body.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);
  let clearance=0;const point=new T.Vector3();
  for(const x of [-.34,.34])for(const z of [-1.4,-.7,0,.7]){
    point.set(x,0,z).applyQuaternion(rig.body.quaternion);
    clearance=Math.max(clearance,floorAt(p.z-s*point.x+c*point.z)-p.y-point.y);
  }
  // Each visible tread differs from the continuous navigation slope by at most 8.3 cm.
  rig.kneel*=1-T.MathUtils.smoothstep(Math.abs(slope),0,.05);
  const flatSupport=rig.kneel;
  rig.body.position.y=clearance+.085*(1-flatSupport);
  figure.updateMatrixWorld(true);
  for(let i=0;i<2;i++)for(const arm of [true,false]){
    if(!arm&&rig.kneel>0){
      const target=rig.knees[i].getWorldPosition(new T.Vector3()),lift=Math.max(0,rig.body.worldToLocal(target.clone()).y-.065);
      const support=Math.max(...[-.08,.08].map(z=>floorAt(target.z+z)));
      target.y=support+.065+lift;poseCrawlKnee(rig,i,rig.body.worldToLocal(target),rig.kneel);continue;
    }
    const upper=arm?rig.arms[i]:rig.legs[i],lower=arm?rig.forearms[i]:rig.knees[i],tip=arm?rig.palms[i]:rig.ankles[i];
    const target=tip.getWorldPosition(new T.Vector3()),orientation=new T.Quaternion().setFromEuler(new T.Euler(arm?-Math.PI/2:0,yaw+(arm?(i===0?1:-1)*.25*armTuck(rig.tuck):0),arm?(i===0?-1:1)*.16:0,'YXZ'));
    const lift=rig.body.worldToLocal(target.clone()).y;
    const bearing=yaw+(arm?(i===0?1:-1)*.25*armTuck(rig.tuck):0);
    const support=Math.max(...[-.1,.1].flatMap(x=>[-.07,arm?.38:.24].map(z=>floorAt(target.z+Math.cos(bearing)*z-Math.sin(bearing)*x))));
    target.y=support+lift+.055*(1-flatSupport);
    // Keep the authored elbow direction, including crawl blends and reduced motion,
    // while fitting the wrist to the floor. Replacing it here made slopes symmetric.
    const side=i===0?-1:1,pole=arm&&rig.crawl>0?upper.parent!.worldToLocal(lower.getWorldPosition(new T.Vector3())).sub(upper.position):arm?new T.Vector3(side*.55,.18,-.55).lerp(new T.Vector3(0,0,-1).applyQuaternion(rig.torso.quaternion.clone().invert()),armTuck(rig.tuck)):new T.Vector3(side*.18,-1,.3).lerp(new T.Vector3(0,0,1),rig.tuck.back);
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

function crawlPose(rig:Rig,phase:number,moving:number,blend:number,tuck:Clearance=openClearance,kneeGround=1,unease=1){
  const front=tuck.front,back=tuck.back,arms=armTuck(tuck);
  const room=1-Math.max(front,back,tuck.side),strain=unease*moving*room;
  // Shoulder-led dragging lags behind the alternating planted hands. The root
  // speed and contact phases stay distance-driven; only the supported body coils.
  const stagger=Math.sin(phase*.5-.4)*.028*strain,pull=(Math.sin(phase*2-.75)*.035+Math.sin(phase*4-.2)*.009)*strain;
  // The knee-led stroke has a longer trailing shin than the gathered drag.
  // Blend out before that rear envelope reaches a nearby divider or leaf.
  rig.kneel=blend*kneeGround*(1-T.MathUtils.smoothstep(Math.max(front,back,tuck.side),0,.25));
  const walkingHands=rig.arms.map((arm,i)=>new T.Vector3(0,-.49,0).applyQuaternion(rig.forearms[i].quaternion).add(rig.forearms[i].position).applyQuaternion(arm.quaternion).add(arm.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position));
  const walkingElbows=rig.arms.map((arm,i)=>rig.forearms[i].position.clone().applyQuaternion(arm.quaternion).add(arm.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position));
  const walkingPalms=rig.arms.map((arm,i)=>rig.torso.quaternion.clone().multiply(arm.quaternion).multiply(rig.forearms[i].quaternion).multiply(rig.palms[i].quaternion));
  rig.torso.position.lerp(new T.Vector3(Math.sin(phase)*.033*moving+stagger, .445+back*.22+Math.cos(phase*2)*.014*moving,-.1-front*.06+Math.sin(phase*2-.9)*.022*moving*(1-front)+pull),blend);
  rig.torso.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(1.17-front*.37+Math.sin(phase*2-.5)*.018*strain,Math.sin(phase)*.025*moving+Math.sin(phase*.5-.6)*.055*strain,Math.sin(phase)*.055*moving+(.035+Math.sin(phase-.5)*.035)*strain)),blend);
  rig.head.quaternion.slerp(new T.Quaternion().setFromEuler(new T.Euler(-1.13+Math.sin(phase-.9)*.035*moving,.065+Math.sin(phase*.5-.7)*.10*strain,-.28+Math.sin(phase-1)*.035*moving-(.14+Math.sin(phase*.5-.8)*.06)*strain)),blend);
  rig.arms[1].position.y=T.MathUtils.lerp(.245,.292,blend);
  const inverse=rig.torso.quaternion.clone().invert();
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,a=T.MathUtils.euclideanModulo(phase+i*Math.PI,Math.PI*2),u=a/(Math.PI*2),swing=u<.36,lift=(swing?Math.sin(u/.36*Math.PI):0)*moving;
    const handStride=swing?T.MathUtils.lerp(-.2624,.2624,T.MathUtils.smoothstep(u/.36,0,1)):.2624-.82*(u-.36);
    // Forward-facing long nails need their full projected reach behind a wall.
    const hand=walkingHands[i].lerp(new T.Vector3(side*(.34-arms*.15+lift*.025*(1-arms)),.075+lift*.1,.59-front*.60+handStride*(moving>.01?1:0)*(1-front*.86)),blend).sub(rig.torso.position).applyQuaternion(inverse);
    const crawlPole=new T.Vector3(side*(.55+(i===0?.10:-.06)*unease),.18+(i===0?.04:-.025)*unease,-.55+(i===0?.08:-.04)*unease).lerp(new T.Vector3(0,0,-1).applyQuaternion(inverse),arms).normalize();
    const elbowPole=walkingElbows[i].sub(rig.torso.position).applyQuaternion(inverse).sub(rig.arms[i].position).normalize().lerp(crawlPole,blend);
    reach(rig.arms[i],rig.forearms[i],hand,.46,.49,side,elbowPole);
    const armWorld=rig.torso.quaternion.clone().multiply(rig.arms[i].quaternion).multiply(rig.forearms[i].quaternion);
    const palmOrientation=walkingPalms[i].slerp(new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,-side*.25*arms,side*.16,'YXZ')),blend);
    rig.palms[i].quaternion.copy(armWorld.invert().multiply(palmOrientation));
    const walkFoot=new T.Vector3(0,-.42,0).applyQuaternion(rig.knees[i].quaternion).add(rig.knees[i].position).applyQuaternion(rig.legs[i].quaternion).add(rig.legs[i].position);
    const kneePole=rig.knees[i].position.clone().applyQuaternion(rig.legs[i].quaternion).normalize().lerp(new T.Vector3(side*.18,-1,.3).lerp(new T.Vector3(0,0,1),back).normalize(),blend);
    const footOrientation=rig.legs[i].quaternion.clone().multiply(rig.knees[i].quaternion).multiply(rig.ankles[i].quaternion).slerp(new T.Quaternion(),blend);
    rig.legs[i].position.lerp(new T.Vector3(side*.125,.48+back*.2,-.45+back*.25),blend);
    reach(rig.legs[i],rig.knees[i],walkFoot.lerp(new T.Vector3(side*(.19-back*.07),.095+Math.max(0,-Math.sin(a))*.015*moving,-1.04+back*.82+Math.sin(a-.7)*.04*moving*(1-back)),blend),.42,.42,side,kneePole);
    rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert().multiply(footOrientation);
    if(rig.kneel>0){
      const u=T.MathUtils.euclideanModulo(a+Math.PI/2,Math.PI*2)/(Math.PI*2),swing=u<.36;
      const stroke=(swing?T.MathUtils.lerp(-.2624,.2624,T.MathUtils.smoothstep(u/.36,0,1)):.2624-.82*(u-.36))*(moving>.01?1:0);
      poseCrawlKnee(rig,i,new T.Vector3(side*.19,.065+(swing?Math.sin(u/.36*Math.PI)*.085*moving:0),-.45+stroke),rig.kneel);
    }
  }
}

function poseCrawlKnee(rig:Rig,i:number,target:T.Vector3,blend:number){
  const hip=rig.legs[i],knee=rig.knees[i],ankle=rig.ankles[i],dx=target.x-hip.position.x,dz=target.z-hip.position.z;
  const height=target.y+Math.sqrt(Math.max(.01,.42**2-dx*dx-dz*dz)),origin=hip.position.clone();origin.y=height;
  const thigh=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),target.clone().sub(origin).normalize());
  const shin=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3(0,.03,-Math.sqrt(.42**2-.03**2)).normalize());
  hip.position.y=T.MathUtils.lerp(hip.position.y,height,blend);hip.quaternion.slerp(thigh,blend);
  knee.quaternion.slerp(thigh.clone().invert().multiply(shin),blend);
  ankle.quaternion.slerp(shin.clone().invert(),blend);
}

export function animateGhostPassenger(figure:T.Group,time:number,scare:number,reducedMotion:boolean,cabinReach=false){
  const rig=poseGhost(figure,time,0,1,reducedMotion,0);if(!rig)return;
  rig.torso.position.set(0,.81,.03);rig.head.position.y-=.02;rig.torso.rotation.set(.08,0,-.12);
  for(let i=0;i<2;i++){rig.legs[i].position.set((i===0?-1:1)*.12,.61,.04);rig.legs[i].rotation.set(-1.75,0,0);rig.knees[i].rotation.set(2.28,0,0);rig.ankles[i].rotation.set(-.53,0,0);rig.arms[i].rotation.set(-.55-(cabinReach?0:scare*.65),0,(i===0?-1:1)*.18);rig.forearms[i].rotation.set(-.85,0,0);}
  // Plant the complete feet ahead of the cushion frame. The old fixed angles
  // folded the heels under the seat even though the visible toes looked clear.
  for(let i=0;i<2;i++){
    const foot=rig.ankles[i].children[0] as T.Mesh;if(!foot.geometry.boundingBox)foot.geometry.computeBoundingBox();
    reach(rig.legs[i],rig.knees[i],new T.Vector3((i===0?-1:1)*.12,.245-foot.geometry.boundingBox!.min.y,.38),.42,.42,i===0?-1:1,new T.Vector3(0,0,1));
    rig.ankles[i].quaternion.copy(rig.legs[i].quaternion).multiply(rig.knees[i].quaternion).invert();
  }
  // The low sedan needs the resting hands ahead of the lap, then a reach across
  // toward the driver. The existing solver retains the full arm/hand surfaces.
  if(cabinReach)for(let i=0;i<2;i++){
    const upper=rig.arms[i],lower=rig.forearms[i],palm=rig.palms[i];
    // Seat/lap targets stay in the figure frame while the upper body leans.
    // The far hand braces on the lap; only the near hand reaches at the driver.
    const inverse=rig.torso.quaternion.clone().invert(),hand=new T.Vector3(i===0?-.13:.13,.55,.56).lerp(i===0?new T.Vector3(-.13,.58,.50):new T.Vector3(.65,1.02,.17),scare).sub(rig.torso.position).applyQuaternion(inverse);
    const pole=new T.Vector3(i===0?-.15:.7,-1,i===0?.6:.25);if(i===1)pole.lerp(new T.Vector3(.2,-1,1.8),scare);pole.applyQuaternion(inverse);
    reach(upper,lower,hand,.46,.49,i===0?-1:1,pole);
    const orientation=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0)).slerp(new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)),scare);
    palm.quaternion.copy(upper.quaternion).multiply(lower.quaternion).invert().multiply(orientation);
  }
  rig.head.rotation.set(.05,cabinReach?.7:-.7,-.26+(reducedMotion?0:Math.sin(time*21)*.025*scare));
  rig.head.position.z+=scare*.055;anchorHeadAtNeck(rig.head,rig.headOffset);poseFace(rig.face,scare);rig.tails.scale.y=.68;
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
  rig.head.position.z+=.055*opening;anchorHeadAtNeck(rig.head,rig.headOffset);poseFace(rig.face,gape);rig.mouth.visible=true;
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
  anchorHeadAtNeck(rig.head,rig.headOffset);
  poseFace(rig.face,0);rig.mouth.visible=false;
  poseDress(rig.gown,rig.hem,rig.torso,rig.knees,1);poseArms(rig);
  settleHair(rig.tails,figure,time,-figure.position.y);bloodDrops(rig,time);
}
