import * as T from 'three';
// Deform one continuous skin surface over the existing arm bones, including the elbow.
export function skinArm(parent:T.Group,material:T.Material){
 const geometry=new T.CylinderGeometry(1,1,1,16,24,true),indices=geometry.getIndex()!;for(let i=0;i<indices.count;i+=3){const a=indices.getX(i);indices.setX(i,indices.getX(i+1));indices.setX(i+1,a);}const mesh=new T.Mesh(geometry,material);mesh.name='ghost-continuous-arm';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function poseSkinArm(mesh:T.Mesh,upper:T.Group,lower:T.Group,palm:T.Group){
 mesh.parent!.updateWorldMatrix(true,false);upper.updateWorldMatrix(true,false);lower.updateWorldMatrix(true,false);palm.updateWorldMatrix(true,false);
 const inverse=mesh.parent!.matrixWorld.clone().invert(),a=upper.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),b=lower.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),c=palm.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
 const curve=new T.CatmullRomCurve3([a,a.clone().lerp(b,.5),b,b.clone().lerp(c,.32),c]),p=mesh.geometry.getAttribute('position');
 const radii=[.059,.052,.034,.04,.023],point=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3();
 for(let row=0;row<=24;row++){
  const t=row/24,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),segment=Math.min(3,Math.floor(t*4)),u=T.MathUtils.smoothstep(t*4-segment,0,1),radius=T.MathUtils.lerp(radii[segment],radii[segment+1],u);
  normal.crossVectors(tangent,Math.abs(tangent.z)>.92?new T.Vector3(0,1,0):new T.Vector3(0,0,1)).normalize();binormal.crossVectors(tangent,normal).normalize();
  for(let col=0;col<=16;col++){const angle=col/16*Math.PI*2;point.copy(center).addScaledVector(normal,Math.cos(angle)*radius).addScaledVector(binormal,Math.sin(angle)*radius*.82);p.setXYZ(row*17+col,point.x,point.y,point.z);}
 }
 p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}
