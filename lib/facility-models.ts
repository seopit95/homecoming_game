import * as T from 'three';
import {loadTexture} from './texture-loader.ts';
import assets from './assets/facility-models.json' with {type:'json'};

// Source-authored static geometry is available without a browser; images decode
// in the existing visual preload, before any playable world is constructed.
type ModelName=keyof typeof assets.models;
const loader=new T.ObjectLoader(),templates=new Map<ModelName,T.Object3D>();
function template(name:ModelName){let root=templates.get(name);if(!root){root=loader.parse(assets.models[name]);templates.set(name,root);}return root;}
const textures=new Map<string,T.Texture>(),pending=new Map<string,Promise<void>>();
export function prepareFacilityModels(names:readonly ModelName[]=Object.keys(assets.models) as ModelName[]){
 const files=new Set<string>();for(const name of names)template(name).traverse(o=>{if(o instanceof T.Mesh)for(const file of Object.values((o.material as T.Material).userData.facilityTextures) as string[])files.add(file);});
 return Promise.all([...files].map(file=>{
  let job=pending.get(file);if(!job){job=loadTexture('/models/facility/'+file,false).then(texture=>{texture.flipY=false;texture.colorSpace=file.includes('_diff_')?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=8;textures.set(file,texture);}).catch(()=>{pending.delete(file);throw new Error('Facility model textures could not be loaded');});pending.set(file,job);}return job;
 })).then(()=>{});
}
export function facilityModel(name:keyof typeof assets.models){
 const root=template(name).clone(true) as T.Group;
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;o.geometry=o.geometry.clone();const m=(o.material as T.MeshStandardMaterial).clone(),maps=m.userData.facilityTextures;
  const copy=(file:string)=>{const source=textures.get(file);if(!source)return null;const t=source.clone();t.needsUpdate=true;return t;};
  m.map=copy(maps.color);m.normalMap=copy(maps.normal);m.roughnessMap=m.metalnessMap=m.aoMap=copy(maps.arm);o.material=m;o.castShadow=o.receiveShadow=true;
 });return root;
}
