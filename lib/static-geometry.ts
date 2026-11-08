import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Only anonymous, opaque, direct children are static architecture. Named objects,
// interactive props, nested assemblies and transparent surfaces retain identity.
export function batchStaticGeometry(root:T.Group,interactive:T.Object3D[]){
  const groups=new Map<string,T.Mesh[]>(),retired=new Set<T.BufferGeometry>();
  for(const object of root.children){
    if(!(object instanceof T.Mesh)||object instanceof T.SkinnedMesh||object.name||object.children.length||interactive.includes(object)||Array.isArray(object.material)||object.material.transparent||!object.visible)continue;
    const geometry=object.geometry as T.BufferGeometry;
    const attributes=Object.keys(geometry.attributes).map(name=>{const a=geometry.getAttribute(name);return `${name}/${a.itemSize}/${a.normalized}/${a.array.constructor.name}`;}).sort().join(',');
    const key=[object.material.uuid,object.castShadow,object.receiveShadow,!!object.geometry.index,attributes,Math.floor(object.position.x/8),Math.floor(object.position.z/8)].join(':');
    const list=groups.get(key)??[];list.push(object);groups.set(key,list);
  }
  for(const meshes of groups.values()){
    if(meshes.length<3)continue;
    const copies=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
    const geometry=mergeGeometries(copies);copies.forEach(g=>g.dispose());if(!geometry)continue;
    const first=meshes[0],batch=new T.Mesh(geometry,first.material);batch.name='static-architecture';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;root.add(batch);
    for(const mesh of meshes){retired.add(mesh.geometry);root.remove(mesh);}
  }
  root.traverse(object=>{if(object instanceof T.Mesh)retired.delete(object.geometry);});retired.forEach(g=>g.dispose());
}
