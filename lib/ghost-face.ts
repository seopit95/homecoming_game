import * as T from 'three';
import {faceMaterial,ghostEnamelMaterial} from './materials.ts';
import anatomy from './assets/ghost-head.json' with {type:'json'};
import dentition from './assets/ghost-teeth.json' with {type:'json'};

// One anatomical skin; the lower face follows the same turning mandible as
// its dentition. The posterior neck and upper skull retain their rest shape.
export function createFace(head:T.Group,skin:T.Material){
  const jaw=new T.Group();jaw.name='ghost-jaw';head.add(jaw);
  const face=new T.Mesh(new T.BufferGeometry(),faceMaterial());face.name='ghost-continuous-face';head.add(face);
  const base=new Float32Array(anatomy.position),weights=new Float32Array(anatomy.jawWeights),lift=new Float32Array(base.length/3);
  // Soft tissue retains the same seated eyes and skull. One swollen upper
  // lid hangs lower; the opposite eye remains exposed beneath a strained brow.
  const eyesAt=Object.values(anatomy.eyes).map(e=>e.center);
  for(let i=0;i<base.length;i+=3){
    const x=base[i],y=base[i+1],z=base[i+2],front=T.MathUtils.smoothstep(z,.035,.085)*T.MathUtils.smoothstep(y,.025,.06),g=(cx:number,cy:number,sx:number,sy:number)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2)*front;
    for(const [cx,cy] of eyesAt){
      base[i+1]+=(cx<0?-.015:.0035)*g(cx,cy+.013,.034,.013);
      base[i+1]+=.004*g(cx*.42,cy+.041,.025,.018);
    }
    base[i+2]+=.006*g(-.082,.075,.035,.034);
    base[i]-=.0035*g(0,.065,.027,.026);
  }
  for(let row=0;row<anatomy.patchRows;row++)for(let i=0;i<N;i++)lift[anatomy.patchStart+row*N+i]=.004*(1+.65*Math.cos(i/N*Math.PI*2))*Math.max(0,Math.sin(i/N*Math.PI*2))**2*(1-T.MathUtils.smoothstep(row/anatomy.patchRows,0,1));
  face.geometry.setAttribute('position',new T.BufferAttribute(base.slice(),3));face.geometry.setAttribute('uv',new T.Float32BufferAttribute(anatomy.uv,2));face.geometry.setIndex(anatomy.index);
  face.userData.mouthBorder=anatomy.mouthBorder;
  const blend=new Float32Array(base.length/3);for(let i=0;i<blend.length;i++)blend[i]=T.MathUtils.smoothstep(base[i*3+2],.025,.105);face.geometry.setAttribute('faceBlend',new T.BufferAttribute(blend,1));
  const mouth=new T.Group();mouth.name='ghost-attack-mouth';head.add(mouth);
  const throat=new T.Mesh(new T.BufferGeometry(),new T.MeshPhysicalMaterial({color:'#68434b',roughness:.68,clearcoat:.08,clearcoatRoughness:.65,vertexColors:true,side:T.DoubleSide}));throat.name='ghost-oral-cavity';mouth.add(throat);
  const lip=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#32191e',roughness:.38,side:T.DoubleSide}));lip.name='ghost-lip-rim';mouth.add(lip);
  const gums=[false,true].map(bottom=>{const mesh=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#44262b',roughness:.48,side:T.DoubleSide}));mesh.name=bottom?'ghost-lower-gum':'ghost-upper-gum';mouth.add(mesh);return mesh;});
  const teeth=new T.Group();head.add(teeth);const lower=new T.Group();lower.name='ghost-lower-teeth';jaw.add(lower);
  const tongueGeometry=new T.SphereGeometry(1,24,16),tongueShape=(tongueGeometry.getAttribute('position').array as Float32Array).slice();
  // Mapping sphere depth into the receding floor reverses its orientation.
  // Reverse each triangle once so the raised tongue keeps outward normals.
  const tongueIndices=tongueGeometry.index!;
  for(let i=0;i<tongueIndices.count;i+=3){const b=tongueIndices.getX(i+1);tongueIndices.setX(i+1,tongueIndices.getX(i+2));tongueIndices.setX(i+2,b);}
  tongueGeometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(tongueShape.length),3));
  const tongue=new T.Mesh(tongueGeometry,new T.MeshPhysicalMaterial({color:'#68434b',roughness:.68,clearcoat:.08,clearcoatRoughness:.65,vertexColors:true}));tongue.name='ghost-tongue';tongue.castShadow=tongue.receiveShadow=true;jaw.add(tongue);
  const enamel=ghostEnamelMaterial();
  for(const [part,group] of [['upper',teeth],['lower',lower]] as const)dentition[part].forEach((data,i)=>{
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);g.computeVertexNormals();
    const tooth=new T.Mesh(g,enamel);tooth.name=`ghost-${part}-tooth-${i}`;tooth.position.fromArray(data.anchor);if(part==='lower')tooth.position.sub(hinge);tooth.scale.fromArray(data.scale);tooth.castShadow=tooth.receiveShadow=true;group.add(tooth);
  });
  const eyes=new T.Group();head.add(eyes);
  for(const [side,eye] of Object.entries(anatomy.eyes)){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(eye.position,3));g.setIndex(eye.index);g.computeVertexNormals();
    const material=new T.MeshPhysicalMaterial({color:'#adb4a5',roughness:.4,clearcoat:.2});
    material.onBeforeCompile=shader=>{
      shader.uniforms.eyeCenter={value:new T.Vector3(...eye.center)};
      shader.uniforms.irisOffset={value:new T.Vector2(eye.center[0]<0?-.001:.002,eye.center[0]<0?.006:.008)};
      shader.vertexShader='varying vec3 vEyePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEyePosition=position;');
      shader.fragmentShader='uniform vec3 eyeCenter; uniform vec2 irisOffset; varying vec3 vEyePosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float eyeRadius=length((vEyePosition.xy-eyeCenter.xy-irisOffset)*vec2(1.0,1.12));
        float front=step(eyeCenter.z,vEyePosition.z);
        float iris=(1.0-smoothstep(.008,.011,eyeRadius))*front;
        float pupil=(1.0-smoothstep(.0014,.0026,eyeRadius))*front;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.25,.22),iris);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.024,.019),pupil);`);
    };
    material.customProgramCacheKey=()=> 'clouded-anatomical-eye-v2';
    const mesh=new T.Mesh(g,material);mesh.name=`ghost-eye-${side}`;mesh.receiveShadow=true;eyes.add(mesh);
  }
  for(const mesh of [face,throat,lip]){mesh.castShadow=true;mesh.receiveShadow=true;}
  const state={face,base,weights,lift,cavity:new Array<number>(17*(N+1)*3+3).fill(0),lipPositions:new Array<number>(3*(N+1)*3).fill(0),gumPositions:[new Array<number>(3*17*3).fill(0),new Array<number>(3*17*3).fill(0)],mouth,throat,lip,jaw,teeth,eyes,lower,gums,tongue,tongueShape,lastOpen:-1};poseFace(state,0);return state;
}
export type FaceRig=ReturnType<typeof createFace>;
const N=64;
const hinge=new T.Vector3(0,.035,.008);
function lipRest(a:number){return new T.Vector3().fromArray(anatomy.position,anatomy.mouthBorder[T.MathUtils.euclideanModulo(Math.round(a/(Math.PI*2)*N),N)]*3);}
function lipPoint(a:number,jaw:T.Group,open:number){
  const s=Math.sin(a),v=lipRest(a);
  const result=v.clone().lerp(v.sub(hinge).applyQuaternion(jaw.quaternion).add(jaw.position),(1-s)*.5);result.y+=.004*(1+.65*Math.cos(a))*Math.max(0,s)**2*open;return result;
}
function grid(mesh:T.Mesh,rows:number,cols:number,positions:number[],uvs?:number[],cap=false){
  const g=mesh.geometry,p=g.getAttribute('position');
  if(p){(p.array as Float32Array).set(positions);p.needsUpdate=true;}
  else{
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(uvs)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    const ids:number[]=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=r*(cols+1)+c;ids.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}g.setIndex(ids);
    if(cap){const center=positions.length/3-1,start=rows*(cols+1);for(let i=0;i<cols;i++)ids.push(start+i,start+i+1,center);g.setIndex(ids);}
  }
  g.computeVertexNormals();g.computeBoundingSphere();
}
export function poseFace(r:FaceRig,open:number){
  if(r.lastOpen===open)return;r.lastOpen=open;r.face.userData.openness=open;
  r.jaw.position.copy(hinge).add(new T.Vector3(-.006*open,-.004*open,.012*open));r.jaw.rotation.set(.90*open,-.025*open,-.075*open);
  const cavity=r.cavity,lips=r.lipPositions,positions=r.face.geometry.getAttribute('position');
  const rest=new T.Vector3(),posed=new T.Vector3();
  for(let i=0;i<positions.count;i++){
    rest.fromArray(r.base,i*3);posed.copy(rest).sub(hinge).applyQuaternion(r.jaw.quaternion).add(r.jaw.position);rest.lerp(posed,r.weights[i]);positions.setXYZ(i,rest.x,rest.y+r.lift[i]*open,rest.z);
  }
  positions.needsUpdate=true;r.face.geometry.computeVertexNormals();r.face.geometry.computeBoundingSphere();
  const center=lipPoint(-Math.PI/2,r.jaw,open).lerp(lipPoint(Math.PI/2,r.jaw,open),.5);
  // Roof and floor share the lip's two-bone blend through their full depth.
  // The mandibular floor and its teeth retain their relative shape as it turns.
  for(let row=0;row<=16;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,s=Math.sin(a),t=row/16,shrink=Math.cos(t*Math.PI*.43),source=lipRest(a);
    const fold=Math.sin(t*Math.PI)*Math.sin(t*25+Math.cos(a)*2)*.0028*Math.max(0,Math.sin(a));
    rest.set(source.x*shrink,-.006+(source.y+.006)*shrink,source.z-.004-t*.096+fold);
    posed.copy(rest).sub(hinge).applyQuaternion(r.jaw.quaternion).add(r.jaw.position);rest.lerp(posed,(1-s)*.5);
    const k=(row*(N+1)+i)*3;cavity[k]=rest.x;cavity[k+1]=rest.y+.004*(1+.65*Math.cos(a))*Math.max(0,s)**2*open*(1-t);cavity[k+2]=rest.z;
  }
  rest.set(0,-.006,.054);posed.copy(rest).sub(hinge).applyQuaternion(r.jaw.quaternion).add(r.jaw.position);rest.lerp(posed,.5);
  cavity[cavity.length-3]=rest.x;cavity[cavity.length-2]=rest.y;cavity[cavity.length-1]=rest.z;
  grid(r.throat,16,N,cavity,undefined,true);
  if(!r.throat.geometry.getAttribute('color')){
    const colors:number[]=[];
    for(let row=0;row<=16;row++)for(let i=0;i<=N;i++){
      const t=row/16,a=i/N*Math.PI*2,light=(.82*(1-t)**1.8+.055)*(1+Math.sin(a*7+t*18)*.07);
      colors.push(light,light*.88,light*.91);
    }
    colors.push(.018,.014,.018);r.throat.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  }
  for(let row=0;row<=2;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,v=lipPoint(a,r.jaw,open),width=.0028*Math.sin(row/2*Math.PI);
    const k=(row*(N+1)+i)*3;lips[k]=center.x+(v.x-center.x)*(1+row*.021);lips[k+1]=center.y+(v.y-center.y)*(1+row*.012);lips[k+2]=v.z+.001+width;
  }
  grid(r.lip,2,N,lips);
  // The tongue grows from the lower cavity, with its underside embedded in
  // the same floor. Sampling its actual triangles keeps support as the jaw drops.
  const tongue=r.tongue.geometry.getAttribute('position'),colors=r.tongue.geometry.getAttribute('color'),tissue=r.throat.geometry.getAttribute('color'),floor=new T.Vector3(),point=new T.Vector3(),color=new T.Vector3(),inverseJaw=r.jaw.quaternion.clone().invert();
  for(let i=0;i<tongue.count;i++){
    const x=r.tongueShape[i*3],y=r.tongueShape[i*3+1],z=r.tongueShape[i*3+2],row=(.38+(z+1)*.25)*16,col=(.75+x*.08)*N;
    const j=Math.floor(row),k=Math.floor(col),u=row-j,v=col-k,a=j*(N+1)+k,b=a+1,c=a+N+1,d=c+1;
    const ids=u+v<=1?[a,b,c]:[b,c,d],weights=u+v<=1?[1-u-v,v,u]:[1-u,1-v,u+v-1];floor.set(0,0,0);
    for(let n=0;n<3;n++)floor.addScaledVector(point.fromArray(cavity,ids[n]*3),weights[n]);
    const height=y>0?y*.012*T.MathUtils.smoothstep(open,0,.6)*T.MathUtils.smoothstep(row,3,6)*(1-.15*Math.exp(-x*x*70)):-.0007*Math.abs(y);
    floor.y+=height-.0003;floor.sub(r.jaw.position).applyQuaternion(inverseJaw);tongue.setXYZ(i,floor.x,floor.y,floor.z);
    color.set(0,0,0);for(let n=0;n<3;n++)color.addScaledVector(point.fromBufferAttribute(tissue,ids[n]),weights[n]);
    color.multiplyScalar(1+Math.max(0,height)*55);colors.setXYZ(i,color.x,color.y,color.z);
  }
  tongue.needsUpdate=colors.needsUpdate=true;r.tongue.geometry.computeVertexNormals();r.tongue.geometry.computeBoundingSphere();
  // Crowns and gum roots share the mandibular frame; the upper arch is fixed.
  [r.teeth,r.lower].forEach((group,row)=>{
    const y=row===0?-.004:-.0085;
    const gum=r.gumPositions[row];
    for(let band=0;band<=2;band++)for(let i=0;i<=16;i++){
      const x=(i-8)*.0062,z=(row===0?.146:.136)-((i-8)/7.34)**2*.035;
      point.set(x,y+(row===0?1:-1)*(.004+band*.004),z+Math.sin(band*Math.PI/2)*.003);if(row===1)point.sub(hinge).applyQuaternion(r.jaw.quaternion).add(r.jaw.position);
      const k=(band*17+i)*3;gum[k]=point.x;gum[k+1]=point.y;gum[k+2]=point.z;
    }
    grid(r.gums[row],2,16,gum);
  });
  // The back of the head is above the lip; the chin is wholly part of the face mesh.
  r.teeth.visible=r.lower.visible=open>.22;r.tongue.visible=open>.22;r.mouth.visible=open>.002;
}
