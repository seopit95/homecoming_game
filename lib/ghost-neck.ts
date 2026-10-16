import * as T from 'three';
import data from './assets/ghost-neck.json' with {type:'json'};
import {poseDressSkin,poseDressNeck} from './ghost-dress.ts';

type NeckState={head:T.Group;face:T.Mesh;gown:T.Mesh;faceBase:Float32Array;openness:number};
const states=new WeakMap<T.Mesh,NeckState>();

// Compress native pelvis/thigh skin against the same cushion and inclined
// bolsters as the dress, with4mm of cloth allowance outside it.
export function constrainSeatedSkin(point:T.Vector3){
 const side=T.MathUtils.smoothstep(Math.abs(point.x),.12,.18);
 point.z=Math.max(point.z,.032+side*.055-.15*point.y);
 point.y=Math.max(point.y,T.MathUtils.lerp(.601,.25,T.MathUtils.smoothstep(point.z,.315,.39)));
}

// The source origin is near the mouth. Keep rotation centered on the actual
// source cervical joint, including pose overrides in capture and the passenger seat.
export function anchorHeadAtNeck(head:T.Group,previous:T.Vector3){
 head.position.sub(previous);const socket=new T.Vector3().fromArray(data.headPivot).multiply(head.scale);
 previous.copy(socket).sub(socket.clone().applyQuaternion(head.quaternion));head.position.add(previous);
}

export function createNeck(torso:T.Group,head:T.Group,face:T.Mesh,gown:T.Mesh,skin:T.MeshStandardMaterial){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setAttribute('faceBlend',new T.Float32BufferAttribute(data.faceBlend,1));g.setIndex(data.index);
 const joins=data.sourcePoint.flatMap((_,i)=>i%3?[]:[T.MathUtils.smoothstep(data.sourcePoint[i+1],.355,.428)]),chestUv=data.sourcePoint.flatMap((_,i)=>i%3?[]:[(data.sourcePoint[i]+.14)/.28,(data.sourcePoint[i+1]-.20)/.228]);
 g.setAttribute('skinJoin',new T.Float32BufferAttribute(joins,1));g.setAttribute('chestUv',new T.Float32BufferAttribute(chestUv,2));
 // Match the actual face sampler at the cut; below the neck use a continuous
 // chest skin patch instead of stretching portrait pixels across the clavicles.
 const faceMaterial=face.material as T.MeshPhysicalMaterial,material=faceMaterial.clone(),compile=faceMaterial.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  compile.call(faceMaterial,shader,renderer);shader.uniforms.chestMap={value:skin.map};
  shader.vertexShader='attribute float skinJoin; attribute vec2 chestUv; varying float vSkinJoin; varying vec2 vChestUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSkinJoin=skinJoin;vChestUv=chestUv;');
  shader.fragmentShader='uniform sampler2D chestMap; varying float vSkinJoin; varying vec2 vChestUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('diffuseColor*=mix(skin,portrait,vFaceBlend);','vec2 chest=vec2(.003,.503)+(1.0-abs(mod(vChestUv,2.0)-1.0))*.494;\n diffuseColor*=mix(texture2D(chestMap,chest),mix(skin,portrait,vFaceBlend),vSkinJoin);');
 };
 material.name='ghost-anatomical-neck-skin';material.customProgramCacheKey=()=> 'anatomical-cervical-skin-v1';
 const mesh=new T.Mesh(g,material);mesh.name='ghost-collar-skin';mesh.castShadow=mesh.receiveShadow=true;torso.add(mesh);
 const faceBase=new Float32Array(face.geometry.getAttribute('position').array);
 states.set(mesh,{head,face,gown,faceBase,openness:face.userData.openness});return mesh;
}

// Keep the native clavicle and chest triangles. Only the cervical region turns about its source joint;
// hidden thorax boundaries follow exactly the same field as the cloth bodice.
export function poseNeck(mesh:T.Mesh,skinArms:T.Mesh[],legs:T.Group[],skinLegs:T.Mesh[]){
 const state=states.get(mesh)!,{head,face,gown,faceBase}=state,p=mesh.geometry.getAttribute('position'),fp=face.geometry.getAttribute('position'),rest=new T.Vector3(),source=new T.Vector3(),body=new T.Vector3(),v=new T.Vector3(),q=new T.Quaternion();
 const localJoint=new T.Vector3().fromArray(data.headPivot).multiply(head.scale),joint=localJoint.clone().applyQuaternion(head.quaternion).add(head.position),restJoint=new T.Vector3().fromArray(data.neckPivot),translation=joint.clone().sub(restJoint),origin=new T.Vector3().fromArray(data.headRestOrigin),inverseHead=head.quaternion.clone().invert();
 mesh.updateWorldMatrix(true,false);const toBody=mesh.matrixWorld.clone().invert(),toFigure=mesh.parent!.matrix,fromFigure=toFigure.clone().invert(),legMatrices=legs.map(leg=>{leg.updateWorldMatrix(true,false);return toBody.clone().multiply(leg.matrixWorld);}),left=new T.Vector3(),right=new T.Vector3();
 if(state.openness!==face.userData.openness){faceBase.set(fp.array);state.openness=face.userData.openness;}
 // Lower posterior head/neck vertices carry the source cervical weights too.
 // Front facial skin, skull, eyes and oral anatomy remain on the head frame.
 for(let i=0;i<fp.count;i++){
  const w=data.headNeckWeight[i];v.fromArray(faceBase,i*3);
  if(w<.999999||data.headArmWeight[i]>0){source.fromArray(data.headSourcePoint,i*3);poseDressSkin(gown,source,body,data.headArmWeight[i]).sub(source);q.identity().slerp(head.quaternion,w);v.multiply(head.scale).add(origin).add(body).sub(restJoint).applyQuaternion(q).add(restJoint).addScaledVector(translation,w).sub(head.position).applyQuaternion(inverseHead).divide(head.scale);}
  fp.setXYZ(i,v.x,v.y,v.z);
 }
 fp.needsUpdate=true;face.geometry.computeVertexNormals();face.geometry.computeBoundingSphere();
 poseDressNeck(gown,head.quaternion,restJoint,translation);
 for(let i=0;i<p.count;i++){
  const w=data.neckWeight[i];rest.fromArray(data.position,i*3);source.fromArray(data.sourcePoint,i*3);poseDressSkin(gown,source,body,data.armWeight[i]).sub(source);
  v.copy(rest).add(body);
  // Skin follows its actual thigh bones. The loose skirt intentionally bridges
  // the stride and is not a valid deformation field for the flesh beneath it.
  const wl=data.legLeftWeight[i],wr=data.legRightWeight[i];
  if(wl+wr>0){left.fromArray(data.legLocalLeft,i*3).applyMatrix4(legMatrices[1]);right.fromArray(data.legLocalRight,i*3).applyMatrix4(legMatrices[0]);v.multiplyScalar(1-wl-wr).addScaledVector(left,wl).addScaledVector(right,wr);}
  q.identity().slerp(head.quaternion,w);v.sub(restJoint).applyQuaternion(q).add(restJoint).addScaledVector(translation,w);
  if(gown.userData.seated&&source.y<-.10){v.applyMatrix4(toFigure);constrainSeatedSkin(v);v.applyMatrix4(fromFigure);}
  p.setXYZ(i,v.x,v.y,v.z);
 }
 data.neckRing.forEach((id,i)=>{v.fromBufferAttribute(fp,data.headRing[i]).multiply(head.scale).applyQuaternion(head.quaternion).add(head.position);p.setXYZ(id,v.x,v.y,v.z);});
 // The body's original humerus cuts meet the retained anatomical arm roots.
 // Use their final posed vertices, including the elbow's smooth bend field.
 const joins=(['r','l'] as const).flatMap((key,side)=>[
  {body:data.armRings[key].body,limb:data.armRings[key].arm,mesh:skinArms[side]},
  {body:data.legRings[key].body,limb:data.legRings[key].leg,mesh:skinLegs[side]},
 ]).map(join=>{join.mesh.updateWorldMatrix(true,false);return {...join,matrix:toBody.clone().multiply(join.mesh.matrixWorld)};});
 for(const join of joins){const ap=join.mesh.geometry.getAttribute('position');join.body.forEach((id,i)=>{v.fromBufferAttribute(ap,join.limb[i]).applyMatrix4(join.matrix);p.setXYZ(id,v.x,v.y,v.z);});}
 p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
 const nn=mesh.geometry.getAttribute('normal'),fn=face.geometry.getAttribute('normal');
 head.updateMatrix();const normalMatrix=new T.Matrix3().getNormalMatrix(head.matrix),toHead=normalMatrix.clone().invert();
 data.neckRing.forEach((id,i)=>{
  v.fromBufferAttribute(fn,data.headRing[i]).applyMatrix3(normalMatrix).normalize().add(rest.fromBufferAttribute(nn,id)).normalize();nn.setXYZ(id,v.x,v.y,v.z);v.applyMatrix3(toHead).normalize();fn.setXYZ(data.headRing[i],v.x,v.y,v.z);
 });
 for(const join of joins){const an=join.mesh.geometry.getAttribute('normal'),matrix=new T.Matrix3().getNormalMatrix(join.matrix),inverse=matrix.clone().invert();
  join.body.forEach((id,i)=>{v.fromBufferAttribute(an,join.limb[i]).applyMatrix3(matrix).normalize().add(rest.fromBufferAttribute(nn,id)).normalize();nn.setXYZ(id,v.x,v.y,v.z);v.applyMatrix3(inverse).normalize();an.setXYZ(join.limb[i],v.x,v.y,v.z);});an.needsUpdate=true;
 }
 nn.needsUpdate=fn.needsUpdate=true;
}
