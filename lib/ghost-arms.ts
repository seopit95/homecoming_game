import * as T from 'three';
import arms from './assets/ghost-arms.json' with {type:'json'};

type ArmData=typeof arms.r;
type ArmState={data:ArmData;hand:T.Mesh;ring:number[];seam:T.Mesh;handNormals:Float32Array;inverse:T.Matrix4;transforms:T.Matrix4[];upperLength:number;totalLength:number};
const states=new WeakMap<T.Mesh,ArmState>();

function handBoundary(hand:T.Mesh,foot=false){
 const p=hand.geometry.getAttribute('position'),ix=hand.geometry.index!,edges=new Map<string,{a:number;b:number;count:number}>();
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){
  const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),key=a<b?`${a}/${b}`:`${b}/${a}`,edge=edges.get(key);
  if(edge)edge.count++;else edges.set(key,{a,b,count:1});
 }
 const adjacent=new Map<number,number[]>();
 for(const {a,b,count} of edges.values())if(count===1&&(foot||p.getY(a)>0&&p.getY(b)>0)){adjacent.set(a,[...(adjacent.get(a)??[]),b]);adjacent.set(b,[...(adjacent.get(b)??[]),a]);}
 const start=[...adjacent.keys()].sort((a,b)=>p.getX(b)-p.getX(a))[0],ring=[start];let previous=-1;
 while(ring.length<adjacent.size){const current=ring.at(-1)!,next=adjacent.get(current)!.find(i=>i!==previous)!;ring.push(next);previous=current;}
 const area=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+p.getX(a)*p.getZ(b)-p.getX(b)*p.getZ(a);},0);
 if(area<0)ring.splice(1,ring.length-1,...ring.slice(1).reverse());return ring;
}

export function createAnatomicalArm(parent:T.Group,side:number,material:T.Material,hand:T.Mesh){
 return createAnatomicalLimb(parent,side<0?arms.r:arms.l,material,hand,.46,.95,false);
}

export function createAnatomicalLimb(parent:T.Group,data:ArmData,material:T.Material,hand:T.Mesh,upperLength:number,totalLength:number,foot:boolean){
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);
 const mesh=new T.Mesh(g,material);mesh.name=foot?'ghost-continuous-leg':'ghost-continuous-arm';mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
 const ring=handBoundary(hand,foot),n=data.wrist.length,seamGeometry=new T.BufferGeometry(),ids:number[]=[],handUV=hand.geometry.getAttribute('uv'),uv:number[]=[];
 for(const i of data.wrist)uv.push(data.uv[i*2],data.uv[i*2+1]);for(const i of ring)uv.push(handUV.getX(i),handUV.getY(i));
 let a=0,b=0;while(a<n||b<ring.length){if((a+1)/n<=(b+1)/ring.length){ids.push(a%n,(a+1)%n,n+b%ring.length);a++;}else{ids.push(a%n,n+(b+1)%ring.length,n+b%ring.length);b++;}}
 seamGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array((n+ring.length)*3),3));seamGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));seamGeometry.setIndex(ids);
 const seam=new T.Mesh(seamGeometry,material);seam.name=foot?'ghost-ankle-skin':'ghost-wrist-skin';seam.castShadow=seam.receiveShadow=true;mesh.add(seam);
 states.set(mesh,{data,hand,ring,seam,handNormals:new Float32Array(hand.geometry.getAttribute('normal').array),inverse:new T.Matrix4(),transforms:[new T.Matrix4(),new T.Matrix4(),new T.Matrix4()],upperLength,totalLength});return mesh;
}

// Preserve source anatomy around two articulated bones, then blend the last
// few centimetres into the palm orientation. No full-arm spline or elbow cap.
export function poseAnatomicalArm(mesh:T.Mesh,upper:T.Group,lower:T.Group,palm:T.Group,constrain?:(point:T.Vector3)=>void){
 const state=states.get(mesh)!;mesh.updateWorldMatrix(true,false);const {data,hand,ring,seam,inverse,transforms}=state;
 inverse.copy(mesh.matrixWorld).invert();
 [upper,lower,palm].forEach((bone,i)=>{bone.updateWorldMatrix(true,false);transforms[i].multiplyMatrices(inverse,bone.matrixWorld).multiply(new T.Matrix4().makeTranslation(0,i===0?0:i===1?state.upperLength:state.totalLength,0));});
 const p=mesh.geometry.getAttribute('position'),base=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 const upperRotation=new T.Quaternion().setFromRotationMatrix(transforms[0]),lowerRotation=new T.Quaternion().setFromRotationMatrix(transforms[1]),bend=new T.Quaternion(),elbow=lower.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
 for(let i=0;i<p.count;i++){
  base.fromArray(data.position,i*3);bend.copy(upperRotation).slerp(lowerRotation,data.lowerWeight[i]);
  // Turn the preserved radial surface around the shared elbow. Blending
  // matrix-transformed positions pinches the inner bend and flips triangles.
  a.copy(base);a.y+=state.upperLength;a.applyQuaternion(bend).add(elbow);c.copy(base).applyMatrix4(transforms[2]);
  a.lerp(c,data.wristWeight[i]);constrain?.(a);p.setXYZ(i,a.x,a.y,a.z);
 }
 p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
 hand.updateWorldMatrix(true,false);const handTransform=inverse.clone().multiply(hand.matrixWorld),sp=seam.geometry.getAttribute('position'),hp=hand.geometry.getAttribute('position'),n=data.wrist.length;
 data.wrist.forEach((index,i)=>{base.fromBufferAttribute(p,index);sp.setXYZ(i,base.x,base.y,base.z);});
 ring.forEach((index,i)=>{base.fromBufferAttribute(hp,index).applyMatrix4(handTransform);sp.setXYZ(n+i,base.x,base.y,base.z);});
 sp.needsUpdate=true;seam.geometry.computeVertexNormals();seam.geometry.computeBoundingSphere();
 const normals=mesh.geometry.getAttribute('normal'),sn=seam.geometry.getAttribute('normal'),hn=hand.geometry.getAttribute('normal'),normalMatrix=new T.Matrix3().getNormalMatrix(handTransform),toHand=normalMatrix.clone().invert();
 data.wrist.forEach((index,i)=>{a.fromBufferAttribute(normals,index).add(b.fromBufferAttribute(sn,i)).normalize();normals.setXYZ(index,a.x,a.y,a.z);sn.setXYZ(i,a.x,a.y,a.z);});
 ring.forEach((index,i)=>{a.fromArray(state.handNormals,index*3).applyMatrix3(normalMatrix).normalize().add(b.fromBufferAttribute(sn,n+i)).normalize();sn.setXYZ(n+i,a.x,a.y,a.z);a.applyMatrix3(toHand).normalize();hn.setXYZ(index,a.x,a.y,a.z);});
 normals.needsUpdate=sn.needsUpdate=hn.needsUpdate=true;
}
