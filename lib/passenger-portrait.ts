import * as T from 'three';
import {loadTexture} from './texture-loader.ts';

let portraitTexture:T.Texture|undefined,loading:Promise<void>|undefined;
export function preparePassengerPortrait(){
  if(!loading)loading=loadTexture('/textures/ghost-passenger-v127.webp').then(texture=>{
    texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;portraitTexture=texture;
  }).catch(error=>{loading=undefined;throw error;});
  return loading;
}

// A small curved photographic head stays on the native cervical anchor. The
// rest of the adult body remains the original seated, physically fitted rig.
export function createPassengerPortrait(figure:T.Group,texture?:T.Texture|null){
  const head=figure.getObjectByName('ghost-head')!,collar=figure.getObjectByName('ghost-collar-skin') as T.Mesh;
  const geometry=new T.PlaneGeometry(.32,.48,24,32),positions=geometry.attributes.position,uv=geometry.attributes.uv,colors:number[]=[];
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)/.16,y=positions.getY(i)/.24;
    positions.setZ(i,.018*(1-x*x)-.008+.004*Math.cos(y*Math.PI/2));
    colors.push(1,1,1,T.MathUtils.smoothstep(uv.getY(i),0,.12));
  }
  positions.needsUpdate=true;geometry.setAttribute('color',new T.Float32BufferAttribute(colors,4));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const material=new T.MeshBasicMaterial({color:'#c6d1cc',transparent:true,alphaTest:.012,depthWrite:false,side:T.DoubleSide,vertexColors:true});
  const mesh=new T.Mesh(geometry,material);mesh.name='finale-passenger-portrait';mesh.visible=false;figure.add(mesh);
  // The near sleeve is genuinely ahead of the neck anchor. Keep ordinary
  // cabin depth on the head, but blend only the photographed neck/clavicles
  // over that sleeve instead of letting a rigid shoulder cut through the skin.
  const headIndices:number[]=[],junctionIndices:number[]=[],index=geometry.index!;
  for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],target=ids.reduce((sum,id)=>sum+uv.getY(id),0)/3<.375?junctionIndices:headIndices;target.push(...ids);}
  const junctionGeometry=geometry.clone();junctionGeometry.setIndex(junctionIndices);geometry.setIndex(headIndices);
  const junctionMaterial=material.clone();junctionMaterial.depthTest=false;
  const junction=new T.Mesh(junctionGeometry,junctionMaterial);junction.name='finale-passenger-portrait-junction';junction.renderOrder=2;mesh.add(junction);
  // Mask only the upper cervical/chest triangles underneath the photograph.
  // A live uniform keeps the complete old head/neck as a safe loading fallback.
  const neckMaterial=collar.material as T.MeshStandardMaterial,compile=neckMaterial.onBeforeCompile,cacheKey=neckMaterial.customProgramCacheKey(),mask={value:0};
  neckMaterial.onBeforeCompile=(shader,renderer)=>{
    compile.call(neckMaterial,shader,renderer);shader.uniforms.passengerPortraitReady=mask;
    shader.vertexShader='varying float vPassengerNeckY;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPassengerNeckY=position.y;');
    shader.fragmentShader='uniform float passengerPortraitReady;varying float vPassengerNeckY;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(passengerPortraitReady>.5&&vPassengerNeckY>.28)discard;');
  };
  neckMaterial.customProgramCacheKey=()=>cacheKey+'-passenger-portrait-v127';neckMaterial.needsUpdate=true;
  const anchor=new T.Vector3(),eye=new T.Vector3(),up=new T.Vector3(),scale=new T.Vector3(),orientation=new T.Quaternion(),parentRotation=new T.Quaternion(),rotation=new T.Matrix4();
  function pose(camera:T.PerspectiveCamera,time:number,reduced:boolean,frame?:T.Matrix4){
    const ready=texture===undefined?portraitTexture:texture;
    mesh.visible=!!ready;head.visible=!ready;mask.value=ready?1:0;if(!ready)return;
    if(!material.map){material.map=ready.clone();material.map.needsUpdate=true;material.needsUpdate=true;junctionMaterial.map=material.map;junctionMaterial.needsUpdate=true;}
    head.getWorldPosition(anchor);figure.getWorldQuaternion(parentRotation);up.set(0,1,0).applyQuaternion(parentRotation);
    eye.copy(camera.position);if(frame)eye.applyMatrix4(frame);
    orientation.setFromRotationMatrix(rotation.lookAt(eye,anchor,up));
    mesh.position.copy(figure.worldToLocal(anchor));mesh.position.y+=reduced?0:Math.sin(time*1.15)*.0007;
    mesh.quaternion.copy(parentRotation.invert()).multiply(orientation);
    figure.getWorldScale(scale);mesh.scale.set(1/scale.x,1/scale.y,1/scale.z);
    mesh.updateMatrix();
  }
  return {mesh,pose};
}
