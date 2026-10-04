import * as T from 'three';
import {faceMaterial} from './materials.ts';
import anatomy from './assets/ghost-anatomy.json' with {type:'json'};

// The lip, cheeks and chin are one deforming surface. Opening the jaw stretches
// that surface; it never places an oval prop over the resting face.
export function createFace(head:T.Group,skin:T.Material){
  const jaw=new T.Group();jaw.name='ghost-jaw';head.add(jaw);
  const face=new T.Mesh(new T.BufferGeometry(),faceMaterial());face.name='ghost-continuous-face';head.add(face);
  const back=new T.Mesh(new T.SphereGeometry(1,40,32,Math.PI,Math.PI),skin);back.position.y=.12;back.scale.set(.173,.226,.153);head.add(back);
  const mouth=new T.Group();mouth.name='ghost-attack-mouth';head.add(mouth);
  const throat=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#10090d',roughness:.96,side:T.DoubleSide}));mouth.add(throat);
  const lip=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#32191e',roughness:.38,side:T.DoubleSide}));mouth.add(lip);
  const gums=[false,true].map(bottom=>{const mesh=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#44262b',roughness:.48,side:T.DoubleSide}));mesh.name=bottom?'ghost-lower-gum':'ghost-upper-gum';mouth.add(mesh);return mesh;});
  const teeth=new T.Group();head.add(teeth);const lower=new T.Group();lower.name='ghost-lower-teeth';jaw.add(lower);
  const enamel=new T.MeshStandardMaterial({color:'#a8a091',roughness:.56});
  for(let i=0;i<8;i++)for(const bottom of [false,true]){
    const tooth=new T.Mesh(new T.SphereGeometry(1,12,10),enamel);tooth.name=`ghost-${bottom?'lower':'upper'}-tooth-${i}`;tooth.scale.set(.0052+(i===3||i===4?.001:0),.008+(i%3)*.001,.006);if(i===1&&!bottom||i===6&&bottom)tooth.scale.y*=.35;
    tooth.rotation.z=(i-3.5)*.035+Math.sin(i*3.1)*.14;(bottom?lower:teeth).add(tooth);
  }
  const eyes=new T.Group();head.add(eyes);
  for(const mesh of [face,back,throat,lip]){mesh.castShadow=true;mesh.receiveShadow=true;}
  const state={face,back,mouth,throat,lip,jaw,teeth,eyes,lower,gums,lastOpen:-1};poseFace(state,0);return state;
}
export type FaceRig=ReturnType<typeof createFace>;
const N=64,R=24;
export function faceDepth(x:number,y:number){
  const {width:w,height:h,depth}=anatomy.face,u=T.MathUtils.clamp((x+.178)/.356,0,1)*(w-1),v=T.MathUtils.clamp((y+.11)/.46,0,1)*(h-1),i=Math.min(w-2,Math.floor(u)),j=Math.min(h-2,Math.floor(v));
  return T.MathUtils.lerp(T.MathUtils.lerp(depth[j*w+i],depth[j*w+i+1],u-i),T.MathUtils.lerp(depth[(j+1)*w+i],depth[(j+1)*w+i+1],u-i),v-j);
}
function lipPoint(a:number,open:number){
  const s=Math.sin(a),c=Math.cos(a),width=.056+open*.008;
  return new T.Vector3(c*width*(1+open*.22*s)+open*.018*s, -.006+s*.0025-open*.111*(1-s)+open*.016*c, .164-Math.abs(c)*.011+open*.006*(1-s));
}
function grid(mesh:T.Mesh,rows:number,cols:number,positions:number[],uvs?:number[]){
  const g=mesh.geometry,p=g.getAttribute('position');
  if(p){(p.array as Float32Array).set(positions);p.needsUpdate=true;}
  else{
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(uvs)g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    const ids:number[]=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const k=r*(cols+1)+c;ids.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}g.setIndex(ids);
  }
  g.computeVertexNormals();g.computeBoundingSphere();
}
export function poseFace(r:FaceRig,open:number){
  if(r.lastOpen===open)return;r.lastOpen=open;
  const p:number[]=[],uv:number[]=[],cavity:number[]=[],lips:number[]=[];
  for(let row=0;row<=R;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,s=Math.sin(a),c=Math.cos(a),t=row/R,rest=lipPoint(a,0),edge=new T.Vector3(c*.178,.12+s*.23,0);
    // A small, rounded chin, not a spherical doll's jaw.
    edge.x*=1-.13*T.MathUtils.smoothstep(-edge.y,0,.11);
    const x=T.MathUtils.lerp(rest.x,edge.x,t),y=T.MathUtils.lerp(rest.y,edge.y,t),z=faceDepth(x,y);
    const moved=lipPoint(a,open),influence=1-t;
    const chin=T.MathUtils.smoothstep(.055-edge.y,0,.15)*t;
    const cheek=Math.exp(-((x+.095)**2/.002+(y-.095)**2/.006)),temple=Math.exp(-((x-.13)**2/.0018+(y-.235)**2/.009));
    p.push(x+(moved.x-rest.x)*influence+cheek*.012-temple*.014,y+(moved.y-rest.y)*influence-open*.222*chin-cheek*.011,z+(moved.z-z)*(1-t)**4+open*.009*chin-cheek*.018-temple*.012);
    uv.push(.5+x*2.45,.27+y*2.283);
  }
  grid(r.face,R,N,p,uv);
  for(let row=0;row<=10;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,v=lipPoint(a,open),t=row/10,center=-.006-open*.111,shrink=Math.cos(t*Math.PI/2);
    cavity.push(v.x*shrink,center+(v.y-center)*shrink,v.z-.004-t*.067);
  }
  grid(r.throat,10,N,cavity);
  for(let row=0;row<=2;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,v=lipPoint(a,open),width=.0028*Math.sin(row/2*Math.PI),center=-.006-open*.111;
    lips.push(v.x*(1+row*.021),center+(v.y-center)*(1+row*.012),v.z+.001+width);
  }
  grid(r.lip,2,N,lips);
  r.jaw.position.set(-open*.018,-.222*open,.009*open);
  // Dental arches stay attached to the jaws; the stretched lips pass over them.
  [r.teeth,r.lower].forEach((group,row)=>{
    const xOffset=row===0?open*.012:r.jaw.position.x,y=row===0?-.014:.010+r.jaw.position.y;
    group.children.forEach((tooth,i)=>{
      const x=(i-3.5)*.013,z=.151+(row===1?r.jaw.position.z:0)-((i-3.5)/3.5)**2*.035;
      tooth.position.set(x+xOffset,y,z);if(row===1)tooth.position.sub(r.jaw.position);
    });
    const gum:number[]=[];
    for(let band=0;band<=2;band++)for(let i=0;i<=16;i++){
      const x=(i-8)*.0062,z=.146+(row===1?r.jaw.position.z:0)-((i-8)/7.34)**2*.035;
      gum.push(x+xOffset,y+(row===0?1:-1)*(.004+band*.004),z+Math.sin(band*Math.PI/2)*.003);
    }
    grid(r.gums[row],2,16,gum);
  });
  // The back of the head is above the lip; the chin is wholly part of the face mesh.
  r.teeth.visible=r.lower.visible=open>.22;r.mouth.visible=open>.002;
}
