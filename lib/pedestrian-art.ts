import * as T from 'three';
import asset from './assets/pedestrian-art.json' with {type:'json'};
import {livingMaterial} from './materials.ts';
export const livingHead=asset.head;

function mesh(data:{position:number[];uv:number[];index:number[]},material:T.Material,parent:T.Object3D,name:string){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);g.computeVertexNormals();
 const m=new T.Mesh(g,material);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
export function createLivingHair(head:T.Group){return mesh(asset.hair,livingMaterial('hair'),head,'pedestrian-authored-hair');}
export function createLivingShirt(torso:T.Group,pants:T.Material){
 const chest=mesh(asset.chest,livingMaterial('skin'),torso,'pedestrian-clavicle');
 const shirt=mesh(asset.shirt,livingMaterial('shirt'),torso,'pedestrian-authored-shirt');
 mesh(asset.seat,pants,torso,'pedestrian-trouser-seat');
 const down=new T.Vector3(0,-1,0),references=[0,1].map(side=>[0,1].map(j=>{
  const a=new T.Vector3(...asset.references[j][side] as [number,number,number]),b=new T.Vector3(...asset.references[j+1][side] as [number,number,number]);
  const direction=b.sub(a),length=direction.length(),q=new T.Quaternion().setFromUnitVectors(down,direction.normalize());
  return {inverse:new T.Matrix4().compose(a,q,new T.Vector3(1,1,1)).invert(),stretch:new T.Matrix4().makeScale(1,(j===0?.27:.25)/length,1)};
 }));
 return {shirt,chest,references};
}
export function poseLivingShirt(clothes:ReturnType<typeof createLivingShirt>,torso:T.Group,arms:T.Group[],elbows:T.Group[],head:T.Group){
 torso.updateWorldMatrix(true,false);const inverse=torso.matrixWorld.clone().invert();
 const matrices=arms.map((arm,side)=>[arm,elbows[side]].map((bone,j)=>{bone.updateWorldMatrix(true,false);const ref=clothes.references[side][j];return inverse.clone().multiply(bone.matrixWorld).multiply(ref.stretch).multiply(ref.inverse);}));
 const p=clothes.shirt.geometry.attributes.position,base=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3();
 for(let i=0;i<p.count;i++){
  base.fromArray(asset.shirt.position,i*3);const side=base.x<0?0:1,w=asset.shirt.armWeight[i],lower=asset.shirt.lowerWeight[i];
  a.copy(base).applyMatrix4(matrices[side][0]);b.copy(base).applyMatrix4(matrices[side][1]);
  base.multiplyScalar(1-w).addScaledVector(a,w*(1-lower)).addScaledVector(b,w*lower);p.setXYZ(i,base.x,base.y,base.z);
 }
 p.needsUpdate=true;clothes.shirt.geometry.computeVertexNormals();clothes.shirt.geometry.computeBoundingSphere();
 const neck=clothes.chest.geometry.attributes.position,rest=new T.Vector3(),posed=new T.Vector3();
 for(let i=0;i<neck.count;i++){
  rest.fromArray(asset.chest.position,i*3);posed.copy(rest).sub(head.position).applyQuaternion(head.quaternion).add(head.position);
  rest.lerp(posed,T.MathUtils.smoothstep(rest.y,.48,.545));neck.setXYZ(i,rest.x,rest.y,rest.z);
 }
 neck.needsUpdate=true;clothes.chest.geometry.computeVertexNormals();clothes.chest.geometry.computeBoundingSphere();
}
