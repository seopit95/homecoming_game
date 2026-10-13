import * as T from 'three';
import {faceMaterial} from './materials.ts';
import anatomy from './assets/ghost-head.json' with {type:'json'};

// The lip, cheeks and chin are one deforming surface. Opening the jaw stretches
// that surface; it never places an oval prop over the resting face.
export function createFace(head:T.Group,skin:T.Material){
  const jaw=new T.Group();jaw.name='ghost-jaw';head.add(jaw);
  const face=new T.Mesh(new T.BufferGeometry(),faceMaterial());face.name='ghost-continuous-face';head.add(face);
  const base=new Float32Array(anatomy.position),delta=new Float32Array(base.length),curve=new Float32Array(base.length);
  face.geometry.setAttribute('position',new T.BufferAttribute(base.slice(),3));face.geometry.setAttribute('uv',new T.Float32BufferAttribute(anatomy.uv,2));face.geometry.setIndex(anatomy.index);
  face.userData.mouthBorder=anatomy.mouthBorder;
  const hairDepth=new Float32Array(145*309);face.userData.hairDepth=hairDepth;
  delta.set(anatomy.skinDelta);
  // Bake the local annulus coefficients once. Every later pose writes directly
  // into the same position buffer; the upper anatomical skull stays untouched.
  for(let row=0;row<anatomy.patchRows;row++)for(let i=0;i<N;i++){
    const k=(anatomy.patchStart+row*N+i)*3,a=i/N*Math.PI*2,t=row/anatomy.patchRows,rest=lipPoint(a,0),gape=lipPoint(a,1),boundary=anatomy.patchBoundaryDelta[i];
    curve[k]=.008*.22*Math.sin(a)*Math.cos(a)*(1-t);
    delta[k]=(gape.x-rest.x)*(1-t)+boundary[0]*t-curve[k];delta[k+1]=(gape.y-rest.y)*(1-t)+boundary[1]*t;delta[k+2]=(gape.z-rest.z)*(1-t)+boundary[2]*t;
  }
  const blend=new Float32Array(base.length/3);for(let i=0;i<blend.length;i++)blend[i]=T.MathUtils.smoothstep(base[i*3+2],.025,.105);face.geometry.setAttribute('faceBlend',new T.BufferAttribute(blend,1));
  const mouth=new T.Group();mouth.name='ghost-attack-mouth';head.add(mouth);
  const throat=new T.Mesh(new T.BufferGeometry(),new T.MeshPhysicalMaterial({color:'#68434b',roughness:.68,clearcoat:.08,clearcoatRoughness:.65,vertexColors:true,side:T.DoubleSide}));throat.name='ghost-oral-cavity';mouth.add(throat);
  const lip=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#32191e',roughness:.38,side:T.DoubleSide}));mouth.add(lip);
  const gums=[false,true].map(bottom=>{const mesh=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#44262b',roughness:.48,side:T.DoubleSide}));mesh.name=bottom?'ghost-lower-gum':'ghost-upper-gum';mouth.add(mesh);return mesh;});
  const teeth=new T.Group();head.add(teeth);const lower=new T.Group();lower.name='ghost-lower-teeth';jaw.add(lower);
  const tongueGeometry=new T.SphereGeometry(1,24,16),tongueShape=(tongueGeometry.getAttribute('position').array as Float32Array).slice();
  // Mapping sphere depth into the receding floor reverses its orientation.
  // Reverse each triangle once so the raised tongue keeps outward normals.
  const tongueIndices=tongueGeometry.index!;
  for(let i=0;i<tongueIndices.count;i+=3){const b=tongueIndices.getX(i+1);tongueIndices.setX(i+1,tongueIndices.getX(i+2));tongueIndices.setX(i+2,b);}
  tongueGeometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(tongueShape.length),3));
  const tongue=new T.Mesh(tongueGeometry,new T.MeshPhysicalMaterial({color:'#68434b',roughness:.68,clearcoat:.08,clearcoatRoughness:.65,vertexColors:true}));tongue.name='ghost-tongue';tongue.castShadow=tongue.receiveShadow=true;jaw.add(tongue);
  const enamel=new T.MeshStandardMaterial({color:'#a8a091',roughness:.56});
  for(let i=0;i<8;i++)for(const bottom of [false,true]){
    const crown=new T.SphereGeometry(1,16,12),positions=crown.getAttribute('position');
    for(let j=0;j<positions.count;j++){
      const x=positions.getX(j),y=positions.getY(j),z=positions.getZ(j),tip=y*(bottom?1:-1),taper=1-.12*T.MathUtils.smoothstep(-tip,0,1);
      positions.setXYZ(j,Math.sign(x)*Math.abs(x)**.58*taper,y,Math.sign(z)*Math.abs(z)**.65);
    }
    crown.computeVertexNormals();
    const tooth=new T.Mesh(crown,enamel);tooth.name=`ghost-${bottom?'lower':'upper'}-tooth-${i}`;tooth.scale.set(.0052+(i===3||i===4?.001:0),.008+(i%3)*.001,.006);if(i===1&&!bottom||i===6&&bottom)tooth.scale.y*=.35;
    tooth.rotation.z=(i-3.5)*.035+Math.sin(i*3.1)*.14;(bottom?lower:teeth).add(tooth);
  }
  const eyes=new T.Group();head.add(eyes);
  for(const [side,eye] of Object.entries(anatomy.eyes)){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(eye.position,3));g.setIndex(eye.index);g.computeVertexNormals();
    const material=new T.MeshPhysicalMaterial({color:'#adb4a5',roughness:.4,clearcoat:.2});
    material.onBeforeCompile=shader=>{
      shader.uniforms.eyeCenter={value:new T.Vector3(...eye.center)};
      shader.vertexShader='varying vec3 vEyePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEyePosition=position;');
      shader.fragmentShader='uniform vec3 eyeCenter; varying vec3 vEyePosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float eyeRadius=length((vEyePosition.xy-eyeCenter.xy-vec2(.001,.003))*vec2(1.0,1.12));
        float front=step(eyeCenter.z,vEyePosition.z);
        float iris=(1.0-smoothstep(.008,.011,eyeRadius))*front;
        float pupil=(1.0-smoothstep(.0014,.0026,eyeRadius))*front;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.25,.22),iris);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.024,.019),pupil);`);
    };
    material.customProgramCacheKey=()=> 'clouded-anatomical-eye-v1';
    const mesh=new T.Mesh(g,material);mesh.name=`ghost-eye-${side}`;mesh.receiveShadow=true;eyes.add(mesh);
  }
  for(const mesh of [face,throat,lip]){mesh.castShadow=true;mesh.receiveShadow=true;}
  const state={face,base,delta,curve,hairDepth,cavity:new Array<number>(17*(N+1)*3+3).fill(0),lipPositions:new Array<number>(3*(N+1)*3).fill(0),gumPositions:[new Array<number>(3*17*3).fill(0),new Array<number>(3*17*3).fill(0)],mouth,throat,lip,jaw,teeth,eyes,lower,gums,tongue,tongueShape,lastOpen:-1};poseFace(state,0);return state;
}
export type FaceRig=ReturnType<typeof createFace>;
const N=64;
// Head-local skin depth. Hair passes its own rig's current raster; the baked
// rest envelope remains available to callers without a constructed face.
export function faceDepth(x:number,y:number,current?:Float32Array){
  if(current){
    if(x<-.18||x>.18||y<-.4||y>.37)return 0;
    const i=Math.floor((x+.18)/.0025),j=Math.floor((y+.4)/.0025);let z=0;
    // Conservative neighbouring samples cover the silhouette between grid rays.
    for(let row=Math.max(0,j-1);row<=Math.min(308,j+2);row++)for(let col=Math.max(0,i-1);col<=Math.min(144,i+2);col++)z=Math.max(z,current[row*145+col]);
    return z;
  }
  const {width:w,height:h,depth}=anatomy.envelope,u=T.MathUtils.clamp((x+.18)/.36,0,1)*(w-1),v=T.MathUtils.clamp((y+.12)/.49,0,1)*(h-1),i=Math.min(w-2,Math.floor(u)),j=Math.min(h-2,Math.floor(v));
  return T.MathUtils.lerp(T.MathUtils.lerp(depth[j*w+i],depth[j*w+i+1],u-i),T.MathUtils.lerp(depth[(j+1)*w+i],depth[(j+1)*w+i+1],u-i),v-j);
}
export function scalpPoint(angle:number,theta:number,out:T.Vector3){
  const u=((angle/(Math.PI*2)%1)+1)%1*96,v=T.MathUtils.clamp(theta/2.7,0,1)*48,i=Math.min(95,Math.floor(u)),j=Math.min(47,Math.floor(v));
  for(let axis=0;axis<3;axis++)out.setComponent(axis,T.MathUtils.lerp(T.MathUtils.lerp(anatomy.scalp[(j*97+i)*3+axis],anatomy.scalp[(j*97+i+1)*3+axis],u-i),T.MathUtils.lerp(anatomy.scalp[((j+1)*97+i)*3+axis],anatomy.scalp[((j+1)*97+i+1)*3+axis],u-i),v-j));
  return out;
}
function lipPoint(a:number,open:number){
  const s=Math.sin(a),c=Math.cos(a),width=.056+open*.008;
  return new T.Vector3(c*width*(1+open*.22*s)+open*.018*s, -.006+s*.0025-open*.111*(1-s)+open*.016*c, .164-Math.abs(c)*.011+open*.006*(1-s));
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
  if(r.lastOpen===open)return;r.lastOpen=open;
  const cavity=r.cavity,lips=r.lipPositions,positions=r.face.geometry.getAttribute('position');
  for(let i=0;i<r.base.length;i++)(positions.array as Float32Array)[i]=r.base[i]+r.delta[i]*open+r.curve[i]*open*open;
  positions.needsUpdate=true;r.face.geometry.computeVertexNormals();r.face.geometry.computeBoundingSphere();
  // Rasterize the current skin into this rig's reusable hair envelope. This is
  // one triangle pass only when opening changes, with no raycaster or allocation.
  const depth=r.hairDepth,ids=anatomy.index,p=positions.array;depth.fill(0);
  for(let k=0;k<ids.length;k+=3){
    const a=ids[k]*3,b=ids[k+1]*3,c=ids[k+2]*3,ax=p[a],ay=p[a+1],bx=p[b],by=p[b+1],cx=p[c],cy=p[c+1],den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
    if(Math.abs(den)<1e-12)continue;
    const left=Math.max(0,Math.ceil((Math.min(ax,bx,cx)+.18)/.0025)),right=Math.min(144,Math.floor((Math.max(ax,bx,cx)+.18)/.0025)),bottom=Math.max(0,Math.ceil((Math.min(ay,by,cy)+.4)/.0025)),top=Math.min(308,Math.floor((Math.max(ay,by,cy)+.4)/.0025));
    for(let row=bottom;row<=top;row++)for(let col=left;col<=right;col++){
      const x=-.18+col*.0025,y=-.4+row*.0025,u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/den,v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/den;
      if(u>=0&&v>=0&&u+v<=1){const n=row*145+col;depth[n]=Math.max(depth[n],u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2]);}
    }
  }
  // The deep tissue clears the fixed anterior neck by 10 mm; the lip and
  // front half of the cavity retain their original dental/tongue fit.
  for(let row=0;row<=16;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,v=lipPoint(a,open),t=row/16,center=-.006-open*.111,shrink=Math.cos(t*Math.PI*.43);
    const fold=Math.sin(t*Math.PI)*Math.sin(t*25+Math.cos(a)*2)*.0028*Math.max(0,Math.sin(a));
    const k=(row*(N+1)+i)*3;cavity[k]=v.x*shrink;cavity[k+1]=center+(v.y-center)*shrink;cavity[k+2]=v.z-.004-t*.096+fold+T.MathUtils.smoothstep(t,.5,1)*.010;
  }
  cavity[cavity.length-3]=-open*.003;cavity[cavity.length-2]=-.006-open*.111;cavity[cavity.length-1]=.164-.004-.105+.010;
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
    const a=i/N*Math.PI*2,v=lipPoint(a,open),width=.0028*Math.sin(row/2*Math.PI),center=-.006-open*.111;
    const k=(row*(N+1)+i)*3;lips[k]=v.x*(1+row*.021);lips[k+1]=center+(v.y-center)*(1+row*.012);lips[k+2]=v.z+.001+width;
  }
  grid(r.lip,2,N,lips);
  r.jaw.position.set(-open*.018,-.222*open,.009*open);
  // The tongue grows from the lower cavity, with its underside embedded in
  // the same floor. Sampling its actual triangles keeps support as the jaw drops.
  const tongue=r.tongue.geometry.getAttribute('position'),colors=r.tongue.geometry.getAttribute('color'),tissue=r.throat.geometry.getAttribute('color'),floor=new T.Vector3(),point=new T.Vector3(),color=new T.Vector3();
  for(let i=0;i<tongue.count;i++){
    const x=r.tongueShape[i*3],y=r.tongueShape[i*3+1],z=r.tongueShape[i*3+2],row=(.015+(z+1)*.4)*16,col=(.75+x*(.057+.05*T.MathUtils.smoothstep(row,4,8)))*N;
    const j=Math.floor(row),k=Math.floor(col),u=row-j,v=col-k,a=j*(N+1)+k,b=a+1,c=a+N+1,d=c+1;
    const ids=u+v<=1?[a,b,c]:[b,c,d],weights=u+v<=1?[1-u-v,v,u]:[1-u,1-v,u+v-1];floor.set(0,0,0);
    for(let n=0;n<3;n++)floor.addScaledVector(point.fromArray(cavity,ids[n]*3),weights[n]);
    const height=y>0?y*.012*T.MathUtils.smoothstep(open,0,.6)*T.MathUtils.smoothstep(row,3,6)*(1-.15*Math.exp(-x*x*70)):-.0007*Math.abs(y);
    floor.y+=height-.0003;floor.sub(r.jaw.position);tongue.setXYZ(i,floor.x,floor.y,floor.z);
    color.set(0,0,0);for(let n=0;n<3;n++)color.addScaledVector(point.fromBufferAttribute(tissue,ids[n]),weights[n]);
    color.multiplyScalar(1+Math.max(0,height)*55);colors.setXYZ(i,color.x,color.y,color.z);
  }
  tongue.needsUpdate=colors.needsUpdate=true;r.tongue.geometry.computeVertexNormals();r.tongue.geometry.computeBoundingSphere();
  // Dental arches stay attached to the jaws; the stretched lips pass over them.
  [r.teeth,r.lower].forEach((group,row)=>{
    const xOffset=row===0?open*.012:r.jaw.position.x,y=row===0?-.014:.010+r.jaw.position.y;
    group.children.forEach((tooth,i)=>{
      const x=(i-3.5)*.013,z=.151+(row===1?r.jaw.position.z:0)-((i-3.5)/3.5)**2*.035;
      tooth.position.set(x+xOffset,y,z);if(row===1)tooth.position.sub(r.jaw.position);
    });
    const gum=r.gumPositions[row];
    for(let band=0;band<=2;band++)for(let i=0;i<=16;i++){
      const x=(i-8)*.0062,z=.146+(row===1?r.jaw.position.z:0)-((i-8)/7.34)**2*.035;
      const k=(band*17+i)*3;gum[k]=x+xOffset;gum[k+1]=y+(row===0?1:-1)*(.004+band*.004);gum[k+2]=z+Math.sin(band*Math.PI/2)*.003;
    }
    grid(r.gums[row],2,16,gum);
  });
  // The back of the head is above the lip; the chin is wholly part of the face mesh.
  r.teeth.visible=r.lower.visible=open>.22;r.tongue.visible=open>.22;r.mouth.visible=open>.002;
}
