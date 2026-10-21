import * as T from 'three';
import {livingMaterial} from './materials.ts';

// One unprinted fabric survives from the accident into the damaged apparition.
export function victimDressMaterial(wet=false){
 const material=livingMaterial('shirt');material.map?.dispose();material.map=null;
 material.name='victim-grey-dress';material.color.set('#999891');material.roughness=wet?.62:.9;
 material.sheen=wet?.12:.3;material.clearcoat=wet?.18:0;material.clearcoatRoughness=.38;
 return material;
}

export function createVictimSkirt(torso:T.Group,material:T.Material){
 const skirt=new T.Mesh(new T.CylinderGeometry(1,1,1,48,24,true),material);
 skirt.name='pedestrian-dress-skirt';skirt.castShadow=skirt.receiveShadow=true;torso.add(skirt);return skirt;
}

export function poseVictimSkirt(skirt:T.Mesh,torso:T.Group,knees:T.Group[],ankles:T.Group[],floor:number){
 torso.updateWorldMatrix(true,false);const body=torso.parent!,intoBody=body.matrixWorld.clone().invert(),intoTorso=torso.matrixWorld.clone().invert();
 const top=new T.Vector3(0,.055,0).applyMatrix4(torso.matrixWorld).applyMatrix4(intoBody);
 const guides=knees.map((knee,i)=>{
  const hip=knee.parent!.getWorldPosition(new T.Vector3()).applyMatrix4(intoBody),joint=knee.getWorldPosition(new T.Vector3()).applyMatrix4(intoBody),hem=ankles[i].getWorldPosition(new T.Vector3()).applyMatrix4(intoBody);hem.y+=.065;
  return new T.CatmullRomCurve3([top,hip,joint,hem]);
 });
 const p=skirt.geometry.getAttribute('position'),left=new T.Vector3(),right=new T.Vector3(),center=new T.Vector3(),span=new T.Vector3(),tangent=new T.Vector3(),other=new T.Vector3(),across=new T.Vector3(),depth=new T.Vector3(),point=new T.Vector3();
 for(let row=0;row<=24;row++){
  // Arc-length rows keep the flare proportional to real cloth length. Uniform
  // curve parameters bunched wide rings at the nearly level waist/hip guides.
  const t=row/24,lower=T.MathUtils.smoothstep(t,0,1);guides[0].getPointAt(t,left);guides[1].getPointAt(t,right);center.copy(left).lerp(right,.5);span.copy(right).sub(left).multiplyScalar(.5);
  guides[0].getTangentAt(t,tangent);guides[1].getTangentAt(t,other);tangent.add(other).normalize();across.set(1,0,0).projectOnPlane(tangent).normalize();depth.crossVectors(tangent,across).normalize();
  const width=.16+t*.128,thickness=.115+t*.035+Math.abs(span.dot(depth));
  for(let col=0;col<=48;col++){
   const angle=col/48*Math.PI*2,fold=1+Math.sin(angle*10+t*5)*.025*lower;
   point.copy(center).addScaledVector(across,Math.cos(angle)*width*fold).addScaledVector(depth,Math.sin(angle)*thickness*fold).applyMatrix4(body.matrixWorld);
   // Flatten loose cloth against the same support as the hands and shoes.
   point.y=Math.max(floor,point.y);point.applyMatrix4(intoTorso);p.setXYZ(row*49+col,point.x,point.y,point.z);
  }
 }
 p.needsUpdate=true;skirt.geometry.computeVertexNormals();skirt.geometry.computeBoundingSphere();
}
