import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Decode each source once; floor changes own disposable texture clones.
const sources:Partial<Record<'surfaces'|'remains'|'face'|'hand'|'decay'|'hand-view'|'cockpit',T.Texture>>={};
let loading:Promise<void>|undefined;
export function prepareVisuals(){
  if(!loading)loading=(async()=>{
    const loader=new T.TextureLoader();
    const results=await Promise.allSettled((['surfaces','remains','face','hand','decay','hand-view','cockpit'] as const).map(async key=>{
      const texture=await loader.loadAsync(`/textures/${key==='face'?'reference-face':key==='surfaces'?'home-surfaces-v2':key==='hand'?'hand-skin':key}.png`);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return {key,texture};
    }));
    if(results.some(r=>r.status==='rejected')){for(const r of results)if(r.status==='fulfilled')r.value.texture.dispose();loading=undefined;throw new Error('Visual asset loading failed');}
    for(const r of results)if(r.status==='fulfilled')sources[r.value.key]=r.value.texture;
  })();
  return loading;
}
export type Surface='wall'|'tile'|'concrete'|'wood'|'skin'|'cloth'|'hair'|'wound'|'decayWall'|'oldTile'|'garage'|'steel';
const tiles:Record<Surface,[number,number]>={decayWall:[0,1],oldTile:[1,1],garage:[0,0],steel:[1,0],wall:[0,1],tile:[1,1],concrete:[0,0],wood:[1,0],skin:[0,1],cloth:[1,1],hair:[0,0],wound:[1,0]};
const fallback:Record<Surface,string>={decayWall:'#8d9283',oldTile:'#979784',garage:'#626665',steel:'#706e64',wall:'#a7a59a',tile:'#898c86',concrete:'#62696b',wood:'#635348',skin:'#989181',cloth:'#b9b29c',hair:'#0b0a0a',wound:'#3d1718'};
export function surface(kind:Surface,color='#ffffff',options:T.MeshStandardMaterialParameters={}){
  const source=sources[['decayWall','oldTile','garage','steel'].includes(kind)?'decay':['skin','cloth','hair','wound'].includes(kind)?'remains':'surfaces'];
  const map=source?.clone();if(map){map.needsUpdate=true;map.wrapS=map.wrapT=T.RepeatWrapping;}
  const material=new T.MeshStandardMaterial({color:map?color:fallback[kind],roughness:kind==='skin'?.53:kind==='hair'?.29:kind==='tile'?.36:.88,map:map??null,bumpMap:map??null,bumpScale:kind==='wall'?.0005:kind==='wood'?.004:kind==='skin'?.007:.012,...options});
  if(map){
    const decay=['decayWall','garage','steel'].includes(kind);
    const repeat=decay?'(1.0 - abs(mod(uv, 2.0) - 1.0))':`fract(uv * ${kind==='wall'?'3.0':kind==='wood'?'1.4':'1.0'})`;
    const [x,y]=tiles[kind],uv=`vec2(${x===0?'0.002':'0.502'},${y===0?'0.002':'0.502'}) + ${repeat} * 0.496`;
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=`vec2 atlasUv(vec2 uv){return ${uv};}\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, atlasUv(vMapUv) )'));
      const bump=T.ShaderChunk.bumpmap_pars_fragment.replace('texture2D( bumpMap, vBumpMapUv )','texture2D( bumpMap, atlasUv(vBumpMapUv) )').replace('texture2D( bumpMap, vBumpMapUv + dSTdx )','texture2D( bumpMap, atlasUv(vBumpMapUv + dSTdx) )').replace('texture2D( bumpMap, vBumpMapUv + dSTdy )','texture2D( bumpMap, atlasUv(vBumpMapUv + dSTdy) )');
      shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>',bump);
    };
    material.customProgramCacheKey=()=>`apartment-atlas-${kind}-2`;
  }
  return material;
}
export function upholstery(color:string){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#a19e93';ctx.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=4){ctx.fillStyle='#817e77';ctx.fillRect(i,0,1,128);ctx.fillStyle='#c0bcb0';ctx.fillRect(0,i,128,1);}
  const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(12,12);
  return new T.MeshStandardMaterial({color,roughness:.96,bumpMap:map,bumpScale:.0012});
}
export function handSkinMaterial(){
  const map=sources.hand?.clone();if(map){map.needsUpdate=true;map.wrapS=map.wrapT=T.RepeatWrapping;}
  return new T.MeshPhysicalMaterial({color:map?'#cdc7bc':'#a47a60',map:map??null,bumpMap:map??null,bumpScale:.0003,roughness:.68,sheen:.2,sheenColor:'#ba9177'});
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

export function softBox(w:number,h:number,d:number,radius=Math.min(.045,Math.min(w,h,d)*.12)){
  const small=Math.min(w,h,d);return small>=.12&&Math.max(w,h,d)<=4?new RoundedBoxGeometry(w,h,d,radius>.045?3:1,Math.min(radius,small*.45)):new T.BoxGeometry(w,h,d);
}

export function cutoutMaterial(key:'hand-view'|'cockpit'){const map=sources[key]?.clone();if(map)map.needsUpdate=true;return map?new T.MeshBasicMaterial({map,transparent:true,alphaTest:.06,depthWrite:false,toneMapped:false}):null;}
