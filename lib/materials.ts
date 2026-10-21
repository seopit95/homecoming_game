import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {prepareFacilityModels} from './facility-models.ts';
import {loadTexture} from './texture-loader.ts';

// Static printed pixels share GPU storage; each caller still owns its Texture.
const printedSources=new Map<string,T.Source>();
export function sharePrintedTexture(texture:T.CanvasTexture,key:readonly (string|number|boolean)[]){
  const id=JSON.stringify([texture.image.width,texture.image.height,...key]),source=printedSources.get(id);
  if(source)texture.source=source;else printedSources.set(id,texture.source);
  return texture;
}
export function clearPrintedSources(){printedSources.clear();}

// Decode each source once; floor changes own disposable texture clones.
const sources:Partial<Record<'night-sky'|'surfaces'|'remains'|'face'|'teeth'|'hand'|'decay'|'hand-view'|'hair'|'hair-locks'|'cloth'|'pedestrian-skin'|'pedestrian-shirt'|'pedestrian-shirt-normal'|'pedestrian-hair'|'resident-photo',T.Texture>>={};
const physicalSources:Partial<Record<`${'asphalt'|'soil'|'plaster'|'concrete'|'cast-concrete'|'worn-concrete'|'wood'|'wood-floor'|'painted-metal'|'bag-leather'|'cotton'|'paving'|'terrazzo'}-${'color'|'normal'|'arm'}`,T.Texture>>={};
let loading:Promise<void>|undefined;
export function prepareVisuals(){
  if(!loading)loading=(async()=>{
    const jobs=(['night-sky','surfaces','remains','face','teeth','hand','hand-view','hair','hair-locks','cloth','resident-photo'] as const).map(async key=>{
      const file=key==='hand-view'?'smartphone-hand-v1.webp':key==='night-sky'?'courtyard-night-sky-2k.jpg':key==='teeth'?'ghost-teeth-v1.webp':key==='resident-photo'?'resident-memory-photo-v1.webp':key==='hair-locks'?'ghost-hair-locks-v1.webp':key==='hair'?'ghost-hair-long01-v1.webp':key==='cloth'?'ghost-cloth-v5.webp':`${key==='face'?'ghost-face-v4':key==='surfaces'?'environment-v3':key==='remains'?'ghost-surfaces-v4':key==='hand'?'hand-skin':key}.webp`;
      const texture=await loadTexture(`/textures/${file}`);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;if(key==='night-sky')texture.mapping=T.EquirectangularReflectionMapping;return {key,texture};
    });
    const livingJobs=(['pedestrian-skin','pedestrian-shirt','pedestrian-shirt-normal','pedestrian-hair'] as const).map(async key=>{
      const texture=await loadTexture('/textures/'+key+'-v1.webp');texture.colorSpace=key.endsWith('-normal')?T.NoColorSpace:T.SRGBColorSpace;texture.anisotropy=8;return {key,texture};
    });
    const physicalJobs=(['asphalt-color','asphalt-normal','asphalt-arm','soil-color','soil-normal','soil-arm','plaster-color','plaster-normal','plaster-arm','concrete-color','concrete-normal','concrete-arm','cast-concrete-color','cast-concrete-normal','cast-concrete-arm','worn-concrete-color','worn-concrete-normal','worn-concrete-arm','wood-color','wood-normal','wood-arm','wood-floor-color','wood-floor-normal','wood-floor-arm','painted-metal-color','painted-metal-normal','painted-metal-arm','bag-leather-color','bag-leather-normal','bag-leather-arm','cotton-color','cotton-normal','cotton-arm','paving-color','paving-normal','paving-arm','terrazzo-color','terrazzo-normal','terrazzo-arm'] as const).map(async key=>{
      const texture=await loadTexture(`/textures/pbr/${key}.${key.startsWith('painted-metal')||key.startsWith('bag-leather')||key.startsWith('paving')?'webp':'jpg'}`);texture.colorSpace=key.endsWith('color')?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=8;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.setScalar(.9);return {key,texture};
    });
    const [results,physical,facility]=await Promise.all([Promise.allSettled([...jobs,...livingJobs]),Promise.allSettled(physicalJobs),Promise.allSettled([prepareFacilityModels()])]);
    if([...results,...physical,...facility].some(r=>r.status==='rejected')){for(const r of [...results,...physical])if(r.status==='fulfilled'){r.value.texture.dispose();r.value.texture.image?.close?.();}loading=undefined;throw new Error('Visual asset loading failed');}
    for(const r of results)if(r.status==='fulfilled')sources[r.value.key]=r.value.texture;
    for(const r of physical)if(r.status==='fulfilled')physicalSources[r.value.key]=r.value.texture;
  })();
  return loading;
}
export function courtyardSky(){return sources['night-sky'];}

export type Surface='asphalt'|'soil'|'wall'|'tile'|'concrete'|'castConcrete'|'wornConcrete'|'paving'|'wood'|'woodFloor'|'skin'|'cloth'|'hair'|'wound'|'decayWall'|'oldTile'|'garage'|'steel'|'paintedMetal'|'bagLeather'|'ceramic'|'fabric'|'leather';
const tiles:Record<Surface,[number,number]>={asphalt:[2,2],soil:[2,2],wall:[0,2],wood:[1,2],woodFloor:[1,2],concrete:[2,2],castConcrete:[2,2],wornConcrete:[2,2],paving:[2,2],tile:[0,1],oldTile:[0,1],steel:[1,1],paintedMetal:[1,1],bagLeather:[1,0],ceramic:[2,1],fabric:[0,0],leather:[1,0],decayWall:[2,0],garage:[2,2],skin:[0,1],hair:[1,1],cloth:[0,0],wound:[1,0]};
const fallback:Record<Surface,string>={asphalt:'#393e41',soil:'#473b2d',wall:'#a7a59a',tile:'#898c86',concrete:'#62696b',castConcrete:'#93968e',wornConcrete:'#777d77',paving:'#999a8b',wood:'#635348',woodFloor:'#635348',skin:'#a5a49d',cloth:'#b9b8ac',hair:'#101215',wound:'#49483f',decayWall:'#8d9283',oldTile:'#979784',garage:'#626665',steel:'#706e64',paintedMetal:'#536468',bagLeather:'#514035',ceramic:'#c4c3b8',fabric:'#797975',leather:'#3c4243'};
export function surface(kind:Surface,color='#ffffff',options:T.MeshStandardMaterialParameters={}){
  const physical=kind==='asphalt'?'asphalt':kind==='soil'?'soil':kind==='oldTile'?'terrazzo':kind==='paving'?'paving':kind==='castConcrete'?'cast-concrete':kind==='wornConcrete'?'worn-concrete':kind==='bagLeather'?'bag-leather':kind==='paintedMetal'?'painted-metal':kind==='wood'?'wood':kind==='woodFloor'?'wood-floor':kind==='wall'||kind==='decayWall'?'plaster':kind==='garage'||kind==='concrete'?'concrete':null;
  if(physical&&physicalSources[`${physical}-color`]){
    const wood=physical==='wood'||physical==='wood-floor',building=kind==='asphalt'||kind==='soil'||kind==='castConcrete'||kind==='wornConcrete'||kind==='paving'||kind==='oldTile',repeat=1.8/(physical==='soil'?1.26:physical==='bag-leather'?.4:physical==='wood-floor'?2.03:physical==='worn-concrete'?3:physical==='paving'?1.8:2),normal=wood?.25:building?.22:.65;
    const copy=(channel:'color'|'normal'|'arm')=>{const map=physicalSources[`${physical}-${channel}`]!.clone();map.repeat.setScalar(repeat);map.needsUpdate=true;return map;};
    const arm=copy('arm'),material=new T.MeshStandardMaterial({color,map:copy('color'),normalMap:copy('normal'),normalScale:new T.Vector2(normal,normal),roughness:kind==='castConcrete'?.88:kind==='wornConcrete'?.76:.95,roughnessMap:arm,aoMap:arm,aoMapIntensity:.55,...(kind==='paintedMetal'?{metalness:1,metalnessMap:arm}:{}),...options});
    material.name=`surface-${kind}`;return material;
  }
  const character=['skin','cloth','hair','wound'].includes(kind),direct=kind==='hair'?sources.hair:kind==='cloth'?sources.cloth:undefined,source=direct??sources[character?'remains':'surfaces'];
  const map=source?.clone();if(map){map.needsUpdate=true;map.wrapS=map.wrapT=T.RepeatWrapping;}
  const roughness=kind==='skin'?.72:kind==='hair'?.48:kind==='ceramic'?.24:kind==='steel'?.48:['tile','oldTile'].includes(kind)?.58:kind==='leather'?.55:.86;
  const bumpScale=kind==='skin'?.0007:kind==='hair'?.00045:kind==='cloth'||kind==='fabric'?.0008:kind==='wall'||kind==='decayWall'?.0015:kind==='steel'?.0006:.0025;
  const Material=kind==='hair'?T.MeshPhysicalMaterial:T.MeshStandardMaterial;
  const material=new Material({color:map?color:fallback[kind],roughness,map:map??null,bumpMap:map??null,bumpScale,...(kind==='hair'?{specularIntensity:.12,anisotropy:.25,anisotropyRotation:Math.PI/2}:{}),...options});material.name=`surface-${kind}`;
  if(map&&!direct){
    const [x,y]=tiles[kind],grid=character?2:3,repeat=kind==='fabric'?'8.0':kind==='cloth'?'1.0':kind==='leather'?'4.0':kind==='skin'?'1.0':'1.0';
    const uv=`vec2(${(x/grid+.003).toFixed(5)},${(y/grid+.003).toFixed(5)}) + (1.0 - abs(mod(uv * ${repeat}, 2.0) - 1.0)) * ${(1/grid-.006).toFixed(5)}`;
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=`vec2 atlasUv(vec2 uv){return ${uv};}\n`+shader.fragmentShader;
      let fragment=T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, atlasUv(vMapUv) )');
      if(kind==='woodFloor')fragment+=`\nvec2 board=vec2(vMapUv.x*1.8/.14,vMapUv.y*1.8/.9);board.y+=mod(floor(board.x),3.0)*.333;vec2 edge=min(fract(board),1.0-fract(board));float joint=smoothstep(0.0,.018,edge.x)*smoothstep(0.0,.004,edge.y);diffuseColor.rgb*=mix(.63,1.0,joint);`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',fragment);
      const bump=T.ShaderChunk.bumpmap_pars_fragment.replace('texture2D( bumpMap, vBumpMapUv )','texture2D( bumpMap, atlasUv(vBumpMapUv) )').replace('texture2D( bumpMap, vBumpMapUv + dSTdx )','texture2D( bumpMap, atlasUv(vBumpMapUv + dSTdx) )').replace('texture2D( bumpMap, vBumpMapUv + dSTdy )','texture2D( bumpMap, atlasUv(vBumpMapUv + dSTdy) )');
      shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>',bump);
    };
    material.customProgramCacheKey=()=>`coherent-atlas-${kind}-3`;
  }
  return material;
}
export function upholstery(color:string){return surface('fabric',color,{roughness:.94,bumpScale:.0007});}
// Only domestic assemblies with 1.8 metres per UV unit opt into this material.
export function cottonUpholstery(color:string){
 if(!physicalSources['cotton-color'])return surface('fabric',color,{roughness:.94,bumpScale:.0007});
 const copy=(channel:'color'|'normal'|'arm')=>{const t=physicalSources[`cotton-${channel}`]!.clone();t.repeat.setScalar(6);t.needsUpdate=true;return t;},arm=copy('arm');
 const material=new T.MeshStandardMaterial({color,map:copy('color'),normalMap:copy('normal'),normalScale:new T.Vector2(.22,.22),roughness:.94,roughnessMap:arm,aoMap:arm,aoMapIntensity:.35});material.name='domestic-cotton';return material;
}
export function ghostHairMaterials(){
  const scalp=new T.MeshPhysicalMaterial({color:'#14191a',roughness:.56,bumpScale:.00025,anisotropyRotation:Math.PI/2,alphaTest:.32,alphaToCoverage:true,side:T.DoubleSide});
  scalp.specularIntensity=.4;scalp.anisotropy=.7;scalp.clearcoat=.035;scalp.clearcoatRoughness=.4;
  const loose=scalp.clone(),map=sources['hair-locks']?.clone()??null;if(map)map.needsUpdate=true;
  // A separate UV channel fades the clipped cap into the loose roots. Native
  // alphaMap handling applies the same cutout to the visible and shadow passes.
  const fade=new T.DataTexture(new Uint8Array([0,0,0,255,255,255,255,255]),1,2);fade.channel=1;
  fade.magFilter=fade.minFilter=T.LinearFilter;fade.needsUpdate=true;scalp.alphaMap=loose.alphaMap=fade;
  scalp.name='surface-wet-hair-roots';scalp.map=scalp.bumpMap=map;scalp.color.set('#929c9e');
  loose.name='surface-wet-hair-locks';loose.map=loose.bumpMap=map;loose.color.set('#929c9e');return [scalp,loose];
}
export function livingMaterial(part:'skin'|'shirt'|'hair'){
  const copy=(key:keyof typeof sources)=>{const t=sources[key]?.clone();if(t)t.needsUpdate=true;return t??null;},hair=part==='hair',shirt=part==='shirt';
  return new T.MeshPhysicalMaterial({map:copy(('pedestrian-'+part) as keyof typeof sources),color:hair?'#35302b':'#ffffff',roughness:hair?.6:shirt?.88:.68,sheen:shirt?.3:hair?.18:0,sheenRoughness:.8,normalMap:shirt?copy('pedestrian-shirt-normal'):null,normalScale:new T.Vector2(.35,.35),side:shirt||hair?T.DoubleSide:T.FrontSide,alphaTest:hair?.35:0,alphaToCoverage:false});
}
export function handSkinMaterial(){
  const map=sources.hand?.clone();if(map){map.needsUpdate=true;map.wrapS=map.wrapT=T.RepeatWrapping;}
  return new T.MeshPhysicalMaterial({color:map?'#cdc7bc':'#a47a60',map:map??null,bumpMap:map??null,bumpScale:.0003,roughness:.68,sheen:.2,sheenColor:'#ba9177'});
}
export function faceMaterial(){
  const map=sources.face?.clone();if(map)map.needsUpdate=true;
  const material=new T.MeshPhysicalMaterial({color:'#bcc3bf',map:map??null,roughness:.64,clearcoat:.12,clearcoatRoughness:.4,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float faceBlend; varying float vFaceBlend;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFaceBlend=faceBlend;');
    shader.fragmentShader='varying float vFaceBlend;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec4 portrait=texture2D(map,vMapUv);
      vec2 skinUv=vec2(.73,.30)+vec2(sin(vMapUv.x*18.0),cos(vMapUv.y*16.0))*.028;
      vec4 skin=texture2D(map,skinUv);
      diffuseColor*=mix(skin,portrait,vFaceBlend);
      #endif
      diffuseColor.rgb*=vec3(.96,1.0,1.015);`);
  };
  material.customProgramCacheKey=()=> 'anatomical-accident-face-v5';return material;
}
export function ghostEnamelMaterial(){
 const map=sources.teeth?.clone()??null;if(map)map.needsUpdate=true;
 return new T.MeshPhysicalMaterial({color:'#b3a58c',map,roughness:.48,clearcoat:.15,clearcoatRoughness:.35});
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
  const small=Math.min(w,h,d);return small>=.04?new RoundedBoxGeometry(w,h,d,radius>.045?3:1,Math.min(radius,small*.22)):new T.BoxGeometry(w,h,d);
}

export function cutoutMaterial(key:'hand-view'){const map=sources[key]?.clone();if(map)map.needsUpdate=true;return map?new T.MeshBasicMaterial({map,transparent:true,alphaTest:.06,depthWrite:false,toneMapped:false}):null;}

export function residentPhotoMaterial(){const map=sources['resident-photo']?.clone()??null;if(map)map.needsUpdate=true;return new T.MeshStandardMaterial({map,color:'#ffffff',roughness:.68});}
