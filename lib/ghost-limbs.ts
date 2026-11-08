import * as T from 'three';
// A continuous shoulder / elbow / wrist surface, also used for the fitted sleeves.
export function skinArm(parent:T.Group,material:T.Material,sleeve=false){
 const geometry=new T.CylinderGeometry(1,1,1,16,20,true),indices=geometry.getIndex()!;for(let i=0;i<indices.count;i+=3){const a=indices.getX(i);indices.setX(i,indices.getX(i+1));indices.setX(i+1,a);}if(sleeve){const color=new Float32Array(geometry.getAttribute('position').count*3);color.fill(1);geometry.setAttribute('color',new T.BufferAttribute(color,3));}const mesh=new T.Mesh(geometry,material);mesh.name=sleeve?'ghost-fitted-sleeve':'ghost-continuous-arm';mesh.userData.sleeve=sleeve;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function poseSkinArm(mesh:T.Mesh,upper:T.Group,lower:T.Group,palm:T.Group){
 mesh.updateWorldMatrix(true,false);upper.updateWorldMatrix(true,false);lower.updateWorldMatrix(true,false);palm.updateWorldMatrix(true,false);
 const inverse=mesh.parent!.matrixWorld.clone().invert(),a=upper.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),b=lower.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),c=palm.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
 const wrist=mesh.userData.wrist,points=[a,a.clone().lerp(b,.4),b,b.clone().lerp(c,.35)];
 if(wrist)for(const y of [.075,.035])points.push(new T.Vector3(0,y,0).applyMatrix4(palm.matrixWorld).applyMatrix4(inverse));else points.push(c);
 const curve=new T.CatmullRomCurve3(points),p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
 const sleeve=mesh.userData.sleeve,radii: number[]=mesh.userData.radii??(sleeve?[.083,.067,.052,.051,.038]:[.064,.056,.032,.041,.022]),point=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3(),center=new T.Vector3(),tangent=new T.Vector3(),previousTangent=new T.Vector3(),transport=new T.Quaternion();
 for(let step=0;step<=20;step++){
  const row=wrist?20-step:step;
  const t=row/20*(sleeve?(mesh.userData.torn?.33:.55):1),segment=Math.min(3,Math.floor(t*4)),u=T.MathUtils.smoothstep(t*4-segment,0,1),radius=T.MathUtils.lerp(radii[segment],radii[segment+1],u)*(sleeve?Math.sin(T.MathUtils.clamp(t/.14,0,1)*Math.PI/2):1);
  curve.getPoint(t,center);curve.getTangent(t,tangent).normalize();
  if(sleeve)center.addScaledVector(tangent,-.067*Math.cos(T.MathUtils.clamp(t/.14,0,1)*Math.PI/2));
  if(step===0){
   normal.set(1,0,0).transformDirection((wrist?palm:upper).matrixWorld).transformDirection(inverse).projectOnPlane(tangent).normalize();
  }else normal.applyQuaternion(transport.setFromUnitVectors(previousTangent,tangent)).projectOnPlane(tangent).normalize();
  previousTangent.copy(tangent);binormal.crossVectors(tangent,normal).normalize();
  for(let col=0;col<=16;col++){const angle=col/16*Math.PI*2,fold=sleeve?1+Math.sin(angle*7+t*19)*.045+Math.sin(t*56+angle*2)*.025:1;point.copy(center).addScaledVector(normal,Math.cos(angle)*radius*fold).addScaledVector(binormal,Math.sin(angle)*radius*.84*fold);p.setXYZ(row*17+col,point.x,point.y,point.z);if(wrist)uv.setXY(row*17+col,.5+Math.cos(angle)*radius/.24,(.015-.035-(1-t)*.95)/.3);}
 }
 p.needsUpdate=true;if(wrist)uv.needsUpdate=true;mesh.geometry.computeVertexNormals();if(mesh.userData.wrist)poseWrist(mesh);mesh.geometry.boundingSphere??=new T.Sphere(new T.Vector3(0,.9,0),2);
}

// Stitch the two open skin boundaries, retaining the hand's anatomical wrist shape.
export function connectWrist(arm:T.Mesh,hand:T.Mesh){
 const p=hand.geometry.getAttribute('position'),ix=hand.geometry.index!,edges=new Map<string,{a:number;b:number;count:number}>();
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){
  const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),key=a<b?`${a},${b}`:`${b},${a}`,edge=edges.get(key);
  if(edge)edge.count++;else edges.set(key,{a,b,count:1});
 }
 const boundary=[...edges.values()].filter(e=>e.count===1&&p.getY(e.a)>0&&p.getY(e.b)>0),adjacent=new Map<number,number[]>();
 for(const {a,b} of boundary){adjacent.set(a,[...(adjacent.get(a)??[]),b]);adjacent.set(b,[...(adjacent.get(b)??[]),a]);}
 const start=[...adjacent.keys()].sort((a,b)=>p.getX(b)-p.getX(a))[0],ring=[start];let previous=-1;
 while(ring.length<adjacent.size){const current=ring.at(-1)!,next=adjacent.get(current)!.find(i=>i!==previous)!;ring.push(next);previous=current;}
 const area=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+p.getX(a)*p.getZ(b)-p.getX(b)*p.getZ(a);},0);if(area<0)ring.splice(1,ring.length-1,...ring.slice(1).reverse());

 const g=new T.BufferGeometry(),ids:number[]=[],uv:number[]=[];
 g.setAttribute('position',new T.BufferAttribute(new Float32Array((16+ring.length)*3),3));
 for(let i=0;i<16;i++)uv.push(i/16,0);const handUV=hand.geometry.getAttribute('uv');for(const i of ring)uv.push(handUV.getX(i),handUV.getY(i));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 let a=0,b=0;while(a<16||b<ring.length){if((a+1)/16<=(b+1)/ring.length){ids.push(a%16,(a+1)%16,16+b%ring.length);a++;}else{ids.push(a%16,16+(b+1)%ring.length,16+b%ring.length);b++;}}
 g.setIndex(ids);const seam=new T.Mesh(g,arm.material);seam.name='ghost-wrist-skin';seam.castShadow=true;seam.receiveShadow=true;arm.add(seam);arm.userData.wrist={hand,ring,seam};
}
function poseWrist(arm:T.Mesh){
 const {hand,ring,seam}=arm.userData.wrist as {hand:T.Mesh;ring:number[];seam:T.Mesh};
 hand.updateWorldMatrix(true,false);const transform=arm.matrixWorld.clone().invert().multiply(hand.matrixWorld),p=seam.geometry.getAttribute('position'),v=new T.Vector3(),top=arm.geometry.getAttribute('position'),bottom=hand.geometry.getAttribute('position'),uv=seam.geometry.getAttribute('uv'),armUV=arm.geometry.getAttribute('uv');
 for(let i=0;i<16;i++){p.setXYZ(i,top.getX(20*17+i),top.getY(20*17+i),top.getZ(20*17+i));uv.setXY(i,armUV.getX(20*17+i),armUV.getY(20*17+i));}uv.needsUpdate=true;
 ring.forEach((index,i)=>{v.fromBufferAttribute(bottom,index).applyMatrix4(transform);p.setXYZ(16+i,v.x,v.y,v.z);});
 p.needsUpdate=true;seam.geometry.computeVertexNormals();seam.geometry.computeBoundingSphere();
}
