import * as T from 'three';
import {loadTexture} from './texture-loader.ts';
import assets from './assets/facility-models.json' with {type:'json'};

// Source-authored static geometry is available without a browser; images decode
// in the existing visual preload, before any playable world is constructed.
const loader=new T.ObjectLoader(),templates=Object.fromEntries(Object.entries(assets.models).map(([name,data])=>[name,loader.parse(data)]));
const textures=new Map<string,T.Texture>();
let loading:Promise<void>|undefined;
export function prepareFacilityModels(){
 if(!loading)loading=(async()=>{
  const files=new Set<string>();for(const root of Object.values(templates))root.traverse(o=>{if(o instanceof T.Mesh)for(const file of Object.values((o.material as T.Material).userData.facilityTextures) as string[])files.add(file);});
  const results=await Promise.allSettled([...files].map(async file=>{const texture=await loadTexture('/models/facility/'+file,false);texture.flipY=false;texture.colorSpace=file.includes('_diff_')?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=8;return {file,texture};}));
  if(results.some(r=>r.status==='rejected')){for(const r of results)if(r.status==='fulfilled'){r.value.texture.dispose();r.value.texture.image?.close?.();}loading=undefined;throw new Error('Facility model textures could not be loaded');}
  for(const r of results)if(r.status==='fulfilled')textures.set(r.value.file,r.value.texture);
 })();return loading;
}
export function facilityModel(name:keyof typeof assets.models){
 const root=templates[name].clone(true) as T.Group;
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;o.geometry=o.geometry.clone();const m=(o.material as T.MeshStandardMaterial).clone(),maps=m.userData.facilityTextures;
  const copy=(file:string)=>{const source=textures.get(file);if(!source)return null;const t=source.clone();t.needsUpdate=true;return t;};
  m.map=copy(maps.color);m.normalMap=copy(maps.normal);m.roughnessMap=m.metalnessMap=m.aoMap=copy(maps.arm);o.material=m;o.castShadow=o.receiveShadow=true;
 });return root;
}
