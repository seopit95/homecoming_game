import * as T from 'three';
import {facilityModel} from './facility-models.ts';

export function courtyardPlanting(root:T.Group){
 const planting=new T.Group();planting.name='courtyard-living-planting';root.add(planting);
 for(const side of [-1,1])for(const z of [-18,18]){
  for(const variant of ['shrub_02_a','shrub_02_c'] as const){
   const source=facilityModel(variant),part=source.children[0] as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;part.geometry.computeBoundingBox();const size=part.geometry.boundingBox!.getSize(new T.Vector3()),outer=variant==='shrub_02_c',mesh=new T.InstancedMesh(part.geometry,part.material,outer?2:1);mesh.castShadow=mesh.receiveShadow=true;
   const pose=new T.Object3D();for(let i=0;i<mesh.count;i++){
    // Keep the photographed proportions; the wider plants face along the bed.
    const height=outer?.66+(z>0?.02:0):.74,scale=height/size.y;pose.scale.setScalar(scale);pose.rotation.y=outer?Math.PI/2+i*Math.PI:side*.45;pose.position.set(side*29,.51,z+(outer?(i?-.9:.9):0));pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
   }mesh.computeBoundingBox();mesh.computeBoundingSphere();planting.add(mesh);
  }
 }
 return planting;
}
