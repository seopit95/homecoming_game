import * as T from 'three';
import {faceMaterial} from './materials.ts';

// The lip, cheeks and chin are one deforming surface. Opening the jaw stretches
// that surface; it never places an oval prop over the resting face.
export function createFace(head:T.Group,skin:T.Material){
  const jaw=new T.Group();jaw.name='ghost-jaw';head.add(jaw);
  const face=new T.Mesh(new T.BufferGeometry(),faceMaterial());face.name='ghost-continuous-face';head.add(face);
  const back=new T.Mesh(new T.SphereGeometry(1,40,32,Math.PI,Math.PI),skin);back.position.y=.12;back.scale.set(.173,.226,.153);head.add(back);
  const mouth=new T.Group();mouth.name='ghost-attack-mouth';head.add(mouth);
  const throat=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#10090d',roughness:.96,side:T.DoubleSide}));mouth.add(throat);
  const lip=new T.Mesh(new T.BufferGeometry(),new T.MeshStandardMaterial({color:'#615052',roughness:.66,side:T.DoubleSide}));mouth.add(lip);
  const teeth=new T.Group();head.add(teeth);const lower=new T.Group();lower.name='ghost-lower-teeth';jaw.add(lower);
  const enamel=new T.MeshStandardMaterial({color:'#aba58c',roughness:.56});
  for(let i=0;i<8;i++)for(const bottom of [false,true]){
    const tooth=new T.Mesh(new T.SphereGeometry(1,8,8),enamel);tooth.scale.set(.006,.013+(i%3)*.001,.008);
    tooth.position.set((i-3.5)*.014,-.006+(bottom?-.015:.011),.163-Math.abs(i-3.5)*.002);tooth.rotation.z=(i-3.5)*.025;(bottom?lower:teeth).add(tooth);
  }
  const eyes=new T.Group();head.add(eyes);
  for(const mesh of [face,back,throat,lip]){mesh.castShadow=true;mesh.receiveShadow=true;}
  const state={face,back,mouth,throat,lip,jaw,teeth,eyes,lower,lastOpen:-1};poseFace(state,0);return state;
}
export type FaceRig=ReturnType<typeof createFace>;
const N=80,R=28;
function surfaceZ(x:number,y:number){
  const oval=Math.sqrt(Math.max(0,1-(x/.178)**2-((y-.12)/.23)**2));
  return .012+.156*oval+.042*Math.exp(-x*x/.00034-(y-.052)**2/.0007)+.018*Math.exp(-x*x/.0003-(y-.108)**2/.005)-.012*Math.exp(-((Math.abs(x)-.073)**2)/.0006-(y-.178)**2/.0007);
}
function lipPoint(a:number,open:number){
  const s=Math.sin(a),c=Math.cos(a),width=.056+open*.016;
  return new T.Vector3(c*width*(1+open*.12*s)+open*.007*s, -.006+s*.0025-open*.122*(1-s)+open*.008*c, .164-Math.abs(c)*.011+open*.006*(1-s));
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
    const x=T.MathUtils.lerp(rest.x,edge.x,t),y=T.MathUtils.lerp(rest.y,edge.y,t),z=surfaceZ(x,y);
    const moved=lipPoint(a,open),influence=1-t;
    const chin=T.MathUtils.smoothstep(.055-edge.y,0,.15)*t;
    p.push(x+(moved.x-rest.x)*influence,y+(moved.y-rest.y)*influence-open*.245*chin,z+(moved.z-z)*(1-t)**4+open*.009*chin);
    uv.push(.505+x/.356*.58,.48+(y-.12)/.46*.83);
  }
  grid(r.face,R,N,p,uv);
  for(let row=0;row<=10;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,v=lipPoint(a,open),t=row/10,center=-.006-open*.122,shrink=Math.cos(t*Math.PI/2);
    cavity.push(v.x*shrink,center+(v.y-center)*shrink,v.z-.004-t*.067);
  }
  grid(r.throat,10,N,cavity);
  for(let row=0;row<=2;row++)for(let i=0;i<=N;i++){
    const a=i/N*Math.PI*2,v=lipPoint(a,open),width=.0028*Math.sin(row/2*Math.PI),center=-.006-open*.122;
    lips.push(v.x*(1+row*.021),center+(v.y-center)*(1+row*.012),v.z+.001+width);
  }
  grid(r.lip,2,N,lips);
  r.jaw.position.set(open*.005,-.244*open,.009*open);
  // The back of the head is above the lip; the chin is wholly part of the face mesh.
  r.teeth.visible=r.lower.visible=open>.02;r.mouth.visible=open>.002;
}
