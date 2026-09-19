import * as T from 'three';
import {surface,faceMaterial} from './materials.ts';

type Rig={body:T.Group;eyes:T.Group;mouth:T.Group;jaw:T.Group;teeth:T.Group;blood:T.Group;tails:T.Group;torso:T.Group;head:T.Group;arms:T.Group[];forearms:T.Group[];palms:T.Group[];legs:T.Group[];knees:T.Group[];ankles:T.Group[];hair:T.Group;gown:T.Mesh;fringes:T.Mesh[];hem:Float32Array};
const rigs=new WeakMap<T.Group,Rig>();
export function createGhost(parent:T.Object3D){
  const figure=new T.Group();figure.name='resident-remains';figure.rotation.order='YXZ';parent.add(figure);figure.visible=false;
  const skin=surface('skin','#aab4b3',{roughness:.43}),cloth=surface('cloth','#a8ada9',{side:T.DoubleSide,roughness:.67}),hairMat=surface('hair','#161c20',{roughness:.2}),wound=surface('wound','#773831',{roughness:.28});
  const bloodMat=new T.MeshStandardMaterial({color:'#510a13',roughness:.18,metalness:.08});
  function mesh(g:T.BufferGeometry,m:T.Material,p:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function ellipsoid(p:T.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,m:T.Material){const o=mesh(new T.SphereGeometry(1,18,14),m,p,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function segment(p:T.Object3D,length:number,radius:number,m:T.Material){return mesh(new T.CapsuleGeometry(radius,length-radius*2,6,12),m,p,0,-length/2,0);}
  const torso=new T.Group();torso.position.set(.035,1.16,.02);figure.add(torso);
  ellipsoid(torso,0,.12,0,.245,.38,.14,cloth);ellipsoid(torso,-.215,.32,0,.11,.12,.115,skin);ellipsoid(torso,.2,.25,0,.09,.095,.1,wound);
  // Crumpled nightdress: uneven silhouette and a torn, separately animated hem.
  const dressGeometry=new T.CylinderGeometry(.18,.32,1.28,40,16,true),dp=dressGeometry.getAttribute('position');
  for(let i=0;i<dp.count;i++){
    const y=dp.getY(i),a=Math.atan2(dp.getZ(i),dp.getX(i)),fold=1+Math.sin(a*11+y*3)*.055+Math.sin(a*23)*.025;
    dp.setXYZ(i,dp.getX(i)*fold+(y<0?Math.sin(y*4)*.035:0),y+(y<-.5?Math.sin(a*7)*.085+Math.cos(a*13)*.04:0),dp.getZ(i)*.66*fold);
  }
  dressGeometry.computeVertexNormals();const gown=mesh(dressGeometry,cloth,torso,0,-.46,0);gown.name='ghost-wet-dress';
  const hem=new Float32Array(dp.array);
  // A torn shoulder and collar expose bruised skin without a plastic doll joint.
  ellipsoid(torso,.145,.22,.1,.11,.19,.035,wound);
  for(let i=0;i<7;i++){const strip=mesh(new T.PlaneGeometry(.025,.22+i*.011,1,3),cloth,torso,.14+i*.014,.06,.13);strip.rotation.z=-.2+i*.075;}
  // Narrow wet strips run from the injured collar down the fabric, with irregular hems.
  for(let i=0;i<7;i++){
    const x=.09+i*.014,length=.22+(i%3)*.14;
    const path=new T.CatmullRomCurve3([new T.Vector3(x,.29,.12),new T.Vector3(x-.035,.08,.152),new T.Vector3(x-.04,-length,.17)]);
    mesh(new T.TubeGeometry(path,9,.004+(i%2)*.003,4,false),bloodMat,torso);
  }
  const belt=mesh(new T.TorusGeometry(.187,.012,5,32),cloth,torso,0,-.04,0);belt.rotation.x=Math.PI/2;belt.scale.y=.72;
  const fringes:T.Mesh[]=[];
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2,strip=mesh(new T.PlaneGeometry(.045,.2+(i%3)*.045,1,3),cloth,torso,Math.sin(a)*.3,-.97,Math.cos(a)*.205);strip.rotation.y=a;strip.rotation.z=Math.sin(i)*.13;fringes.push(strip);}
  const head=new T.Group();head.name='ghost-head';head.position.set(-.075,.48,.14);head.scale.set(.63,.74,.68);torso.add(head);
  segment(head,.31,.055,skin).position.y=-.06;
  const jaw=new T.Group();jaw.name='ghost-jaw';head.add(jaw);
  const cut=Math.acos((-.027-.12)/.226);
  const skull=mesh(new T.SphereGeometry(1,24,20,0,Math.PI*2,0,cut),skin,head,0,.12,0);skull.scale.set(.173,.226,.153);
  const chin=mesh(new T.SphereGeometry(1,24,10,0,Math.PI*2,cut,Math.PI-cut),skin,jaw,0,.12,0);chin.scale.copy(skull.scale);
  const faceMat=faceMaterial(),split=Math.asin((-.027-.12)/.23);
  for(const [parent,low,high] of [[head,split,Math.PI/2],[jaw,-Math.PI/2,split]] as const){
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];const rows=22,cols=32;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const a=(i/cols-.5)*Math.PI,b=T.MathUtils.lerp(low,high,j/rows),x=Math.sin(a)*Math.cos(b)*.178,y=Math.sin(b)*.23;
      const nose=.028*Math.exp(-x*x/.00065-(y+.01)*(y+.01)/.002);
      positions.push(x,y+.12,Math.cos(a)*Math.cos(b)*.165+.012+nose);
      // Sample only the inner facial oval: the supplied texture has no useful outer alpha.
      uvs.push(.5+x/.356*.54,.505+y/.46*.81);
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
  const lip=mesh(new T.TorusGeometry(1,.085,8,32),bloodMat,mouth,0,-.105,.018);lip.scale.set(.094,.117,.046);
  const tooth=new T.MeshStandardMaterial({color:'#969486',roughness:.55});
  const teeth=new T.Group();head.add(teeth);const lowerTeeth=new T.Group();jaw.add(lowerTeeth);lowerTeeth.name='ghost-lower-teeth';
  for(const side of [-1,1])for(let i=0;i<7;i++){const t=mesh(new T.ConeGeometry(.007,.021+(i%3)*.008,5),tooth,side>0?teeth:lowerTeeth,(i-3)*.021,-.027+side*.009,.209-Math.abs(i-3)*.003);t.rotation.z=side>0?Math.PI:0;}
  const eyes=new T.Group();eyes.name='ghost-white-eyes';head.add(eyes);
  for(const side of [-1,1]){
    ellipsoid(eyes,side*.093,.168+side*.006,.148,.036,.026,.015,voidMat);
    ellipsoid(eyes,side*.093,.169+side*.006,.162,.026,.021,.011,tooth);
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
  // Shoulder-to-waist locks hang with gravity instead of rotating as one rigid wig.
  const tails=new T.Group();tails.name='ghost-long-hair';torso.add(tails);
  for(let i=0;i<24;i++){
    const side=i<12?-1:1,u=(i%12)/11,x=side*(.1+u*.12),z=.1+Math.sin(i*1.7)*.055;
    const path=new T.CatmullRomCurve3([new T.Vector3(x,.52,z),new T.Vector3(x+side*.025,.25,z+.04),new T.Vector3(x+side*.035,-.19,z+.08),new T.Vector3(x+Math.sin(i)*.035,-.55-(i%4)*.075,z+.025)]);
    mesh(new T.TubeGeometry(path,15,.009+(i%3)*.005,4,false),hairMat,tails);
  }
  const arms:T.Group[]=[],forearms:T.Group[]=[],palms:T.Group[]=[],legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.255,side<0?.3:.21,0);torso.add(arm);arms.push(arm);
    segment(arm,.42,.054,cloth);ellipsoid(arm,0,-.4,0,.051,.064,.048,wound);
    const forearm=new T.Group();forearm.position.y=-.39;arm.add(forearm);forearms.push(forearm);segment(forearm,.52,.032,skin);
    segment(forearm,.27,.038,cloth);ellipsoid(forearm,side*.016,-.35,.027,.021,.15,.011,bloodMat);
    const palm=new T.Group();palm.position.y=-.54;forearm.add(palm);palms.push(palm);
    const hand=ellipsoid(palm,0,-.02,.015,.042,.087,.022,skin);hand.name=`ghost-hand-${side}`;hand.rotation.z=side*.35;
    for(let i=0;i<5;i++){
      const finger=new T.Group();finger.position.set((i-2)*.016,-.07,.016);finger.rotation.z=(i-2)*.18;finger.rotation.x=.45+i*.11;palm.add(finger);
      segment(finger,.1+(i%3)*.012,.0085,skin);mesh(new T.ConeGeometry(.007,.029,5),wound,finger,0,-.12,.009).rotation.x=Math.PI;
    }
    ellipsoid(forearm,side*.02,-.17,.031,.025,.085,.012,wound);
    const leg=new T.Group();leg.name=`ghost-hip-${side}`;leg.position.set(side*.105,.87,.015);figure.add(leg);legs.push(leg);segment(leg,.42,.052,skin);
    const knee=new T.Group();knee.name=`ghost-knee-${side}`;knee.position.y=-.42;leg.add(knee);knees.push(knee);ellipsoid(knee,0,0,.02,.055,.06,.06,wound);segment(knee,.42,.035,skin);
    const ankle=new T.Group();ankle.name=`ghost-ankle-${side}`;ankle.position.y=-.42;knee.add(ankle);ankles.push(ankle);ellipsoid(ankle,0,-.04,.07,.055,.045,.13,skin);
    for(let i=0;i<5;i++)ellipsoid(ankle,(i-2)*.019,-.048,.19,.012,.025,.05,skin);
  }
  const blood=new T.Group();blood.name='ghost-blood-drops';figure.add(blood);
  for(let i=0;i<9;i++)ellipsoid(blood,0,0,0,.007,.021,.007,bloodMat);
  const body=new T.Group();body.name='ghost-body';body.add(...figure.children);figure.add(body);
  rigs.set(figure,{body,eyes,mouth,jaw,teeth,blood,tails,torso,head,arms,forearms,palms,legs,knees,ankles,hair,gown,fringes,hem});animateGhost(figure,0,0,0,false);return figure;
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
  rig.blood.children.forEach((drop,i)=>{const t=(time*.72+i*.173)%1,height=i%3===0?1.35:.55;drop.position.set(i%3===0?.08:i%3===1?-.27:.27,Math.max(.025,height-t*t*height),.12+Math.sin(i)*.06);drop.scale.set(.007,.014+t*.025,.007);});
  if(crawl>0)crawlPose(rig,phase,moving,T.MathUtils.clamp(crawl,0,1));
  rig.fringes.forEach((strip,i)=>{strip.position.y=-.97;strip.position.z=Math.cos(i/11*Math.PI*2)*.205;});
  const p=rig.gown.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){const x=rig.hem[i*3],y=rig.hem[i*3+1],z=rig.hem[i*3+2],weight=Math.max(0,-y);p.setXYZ(i,x+Math.sin(time*2.2+y*6)*.022*weight,y,z+Math.cos(time*2.5+x*8)*.022*weight);}
  if(crawl>0){
    const inverse=rig.torso.quaternion.clone().invert(),point=new T.Vector3();
    for(const strip of rig.fringes){strip.updateMatrix();const vertices=strip.geometry.getAttribute('position');let min=Infinity;
      for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(strip.matrix).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);min=Math.min(min,point.y);}
      if(min<.006)strip.position.y+=(.006-min)/Math.max(.1,Math.cos(rig.torso.rotation.x));
    }
    for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).add(rig.gown.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
      if(point.y<.014){point.y=.014;point.sub(rig.torso.position).applyQuaternion(inverse).sub(rig.gown.position);p.setXYZ(i,point.x,point.y,point.z);}
    }
  }
  p.needsUpdate=true;
}

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
  rig.blood.children.forEach(drop=>{drop.position.y=Math.max(.29,drop.position.y);});
  rig.fringes.forEach((strip,i)=>{strip.position.y=-.42;strip.position.z=Math.cos(i/11*Math.PI*2)*.205+.32;});
  rig.tails.scale.y=.68;
  // Fold the wet skirt over the seated knees instead of through the floorpan.
  const p=rig.gown.geometry.getAttribute('position');
  const inverse=rig.torso.quaternion.clone().invert(),point=new T.Vector3();
  for(let i=0;i<p.count;i++){const y=rig.hem[i*3+1];if(y<-.05){p.setY(i,-.05+(y+.05)*.28);p.setZ(i,rig.hem[i*3+2]+(-y-.05)*.43);}
    point.fromBufferAttribute(p,i).add(rig.gown.position).applyQuaternion(rig.torso.quaternion).add(rig.torso.position);
    if(point.y<.25){point.y=.25;point.sub(rig.torso.position).applyQuaternion(inverse).sub(rig.gown.position);p.setXYZ(i,point.x,point.y,point.z);}
  }
  p.needsUpdate=true;
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
  rig.jaw.position.set(Math.sin(time*29)*convulsion*.055,-.4*gape,.025*gape);rig.jaw.rotation.set(-.12*gape,0,Math.sin(time*19)*convulsion*.15);
  rig.mouth.scale.set(1+gape*.13,.025+gape*1.78,1);
  rig.hair.rotation.set(-.32*opening+Math.sin(time*19)*convulsion,0,Math.sin(time*29)*convulsion*.7);
  rig.tails.rotation.x=-.18*opening;rig.tails.rotation.z=Math.sin(time*21)*convulsion*.7;
  for(let i=0;i<2;i++){const side=i===0?-1:1;rig.arms[i].rotation.set(-2.05+Math.sin(time*18+i)*convulsion*2,side*.3,side*.35);rig.forearms[i].rotation.set(-.8+Math.sin(time*21+i)*convulsion,0,side*.2);}
}
