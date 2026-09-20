import * as T from 'three';
// A continuous shoulder / elbow / wrist surface, also used for the fitted sleeves.
export function skinArm(parent:T.Group,material:T.Material,sleeve=false){
 const geometry=new T.CylinderGeometry(1,1,1,20,28,true),indices=geometry.getIndex()!;for(let i=0;i<indices.count;i+=3){const a=indices.getX(i);indices.setX(i,indices.getX(i+1));indices.setX(i+1,a);}if(sleeve){const color=new Float32Array(geometry.getAttribute('position').count*3);color.fill(1);geometry.setAttribute('color',new T.BufferAttribute(color,3));}const mesh=new T.Mesh(geometry,material);mesh.name=sleeve?'ghost-fitted-sleeve':'ghost-continuous-arm';mesh.userData.sleeve=sleeve;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function poseSkinArm(mesh:T.Mesh,upper:T.Group,lower:T.Group,palm:T.Group){
 mesh.parent!.updateWorldMatrix(true,false);upper.updateWorldMatrix(true,false);lower.updateWorldMatrix(true,false);palm.updateWorldMatrix(true,false);
 const inverse=mesh.parent!.matrixWorld.clone().invert(),a=upper.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),b=lower.getWorldPosition(new T.Vector3()).applyMatrix4(inverse),c=palm.getWorldPosition(new T.Vector3()).applyMatrix4(inverse);
 const curve=new T.CatmullRomCurve3([a,a.clone().lerp(b,.4),b,b.clone().lerp(c,.35),c]),p=mesh.geometry.getAttribute('position');
 const sleeve=mesh.userData.sleeve,radii=sleeve?[.083,.067,.052,.051,.038]:[.064,.056,.032,.041,.022],point=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3();
 for(let row=0;row<=28;row++){
  const t=row/28*(sleeve?.89:1),center=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),segment=Math.min(3,Math.floor(t*4)),u=T.MathUtils.smoothstep(t*4-segment,0,1),radius=T.MathUtils.lerp(radii[segment],radii[segment+1],u)*(sleeve?Math.sin(T.MathUtils.clamp(t/.14,0,1)*Math.PI/2):1);
  if(sleeve)center.addScaledVector(tangent,-.067*Math.cos(T.MathUtils.clamp(t/.14,0,1)*Math.PI/2));
  normal.crossVectors(tangent,Math.abs(tangent.z)>.92?new T.Vector3(0,1,0):new T.Vector3(0,0,1)).normalize();binormal.crossVectors(tangent,normal).normalize();
  for(let col=0;col<=20;col++){const angle=col/20*Math.PI*2,fold=sleeve?1+Math.sin(angle*7+t*19)*.045+Math.sin(t*56+angle*2)*.025:1;point.copy(center).addScaledVector(normal,Math.cos(angle)*radius*fold).addScaledVector(binormal,Math.sin(angle)*radius*.84*fold);p.setXYZ(row*21+col,point.x,point.y,point.z);}
 }
 p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}
