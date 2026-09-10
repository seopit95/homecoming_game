import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Decode each source once; floor changes own disposable texture clones.
const sources:Partial<Record<'surfaces'|'remains'|'face',T.Texture>>={};
let loading:Promise<void>|undefined;
export function prepareVisuals(){
  if(!loading)loading=(async()=>{
    const loader=new T.TextureLoader();
    const results=await Promise.allSettled((['surfaces','remains','face'] as const).map(async key=>{
      const texture=await loader.loadAsync(`/textures/${key}.png`);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return {key,texture};
    }));
    if(results.some(r=>r.status==='rejected')){for(const r of results)if(r.status==='fulfilled')r.value.texture.dispose();loading=undefined;throw new Error('Visual asset loading failed');}
    for(const r of results)if(r.status==='fulfilled')sources[r.value.key]=r.value.texture;
  })();
  return loading;
}
export type Surface='wall'|'tile'|'concrete'|'wood'|'skin'|'cloth'|'hair'|'wound';
const tiles:Record<Surface,[number,number]>={wall:[0,1],tile:[1,1],concrete:[0,0],wood:[1,0],skin:[0,1],cloth:[1,1],hair:[0,0],wound:[1,0]};
const fallback:Record<Surface,string>={wall:'#a7a59a',tile:'#898c86',concrete:'#62696b',wood:'#635348',skin:'#989181',cloth:'#b9b29c',hair:'#0b0a0a',wound:'#3d1718'};
export function surface(kind:Surface,color='#ffffff',options:T.MeshStandardMaterialParameters={}){
  const source=sources[['skin','cloth','hair','wound'].includes(kind)?'remains':'surfaces'];
  const map=source?.clone();if(map){map.needsUpdate=true;map.wrapS=map.wrapT=T.RepeatWrapping;}
  const material=new T.MeshStandardMaterial({color:map?color:fallback[kind],roughness:kind==='skin'?.53:kind==='hair'?.29:kind==='tile'?.45:.88,map:map??null,bumpMap:map??null,bumpScale:kind==='wood'?.012:kind==='skin'?.007:.022,...options});
  if(map){
    const [x,y]=tiles[kind],uv=`vec2(${x===0?'0.002':'0.502'},${y===0?'0.002':'0.502'}) + fract(uv) * 0.496`;
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=`vec2 atlasUv(vec2 uv){return ${uv};}\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, atlasUv(vMapUv) )'));
      const bump=T.ShaderChunk.bumpmap_pars_fragment.replace('texture2D( bumpMap, vBumpMapUv )','texture2D( bumpMap, atlasUv(vBumpMapUv) )').replace('texture2D( bumpMap, vBumpMapUv + dSTdx )','texture2D( bumpMap, atlasUv(vBumpMapUv + dSTdx) )').replace('texture2D( bumpMap, vBumpMapUv + dSTdy )','texture2D( bumpMap, atlasUv(vBumpMapUv + dSTdy) )');
      shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>',bump);
    };
    material.customProgramCacheKey=()=>`apartment-atlas-${kind}-1`;
  }
  return material;
}
export function faceMaterial(){
  const map=sources.face?.clone();if(map)map.needsUpdate=true;
  return new T.MeshStandardMaterial({color:map?'#e4ded1':'#ada995',map:map??null,alphaTest:.12,roughness:.56,side:T.DoubleSide});
}
export function boxUV(geometry:T.BufferGeometry,x=0,y=0,z=0,scale=1.8){
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
  for(let i=0;i<p.count;i++){
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));
    uv.setXY(i,(nx>.5?p.getZ(i)+z:p.getX(i)+x)/scale,(ny>.5?p.getZ(i)+z:p.getY(i)+y)/scale);
  }
  uv.needsUpdate=true;return geometry;
}

export function softBox(w:number,h:number,d:number){
  const small=Math.min(w,h,d);return small>=.12&&Math.max(w,h,d)<=4?new RoundedBoxGeometry(w,h,d,1,Math.min(.045,small*.12)):new T.BoxGeometry(w,h,d);
}
