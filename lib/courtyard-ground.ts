import * as T from 'three';
import {surface,boxUV} from './materials.ts';

export function buildCourtyardGround(root:T.Group){
 const paving=surface('paving','#a0a59d',{roughness:.88}),concrete=surface('castConcrete','#838a80'),metal=surface('paintedMetal','#69716b',{roughness:.66});
 function slab(name:string,x0:number,x1:number,z0:number,z1:number,m:T.Material,y=-.13,h=.26){
  const x=(x0+x1)/2,z=(z0+z1)/2,o=new T.Mesh(boxUV(new T.BoxGeometry(x1-x0,h,z1-z0),x,y,z),m);o.name=name;o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;
 }
 // Walking surfaces meet at y=0. Real gaps beside the plinths receive the
 // gutters; the repair compound has its own concrete working slab.
 for(const side of [-1,1]){
  // Keep the existing 6m guard-booth foundations; exterior paving must not
  // share their top plane, even when both materials used to look alike.
  for(const [a,b,c,d] of [[31.5,32,-44,48],[18.1,22,-44,48],[28,31.2,-44,48],[22,28,-44,27],[22,28,33,48]])slab('courtyard-paving',Math.min(side*a,side*b),Math.max(side*a,side*b),c,d,paving);
 }
 slab('courtyard-paving',-18.1,18.1,-44,-23.1,paving);slab('courtyard-paving',-18.1,18.1,23.1,48,paving);
 slab('courtyard-repair-slab',-18.1,18.1,-23.1,23.1,concrete);
 // The north opening between x12.5 and15.5 remains the existing stair well.
 for(const [x0,x1] of [[-32,-31.5],[-31.2,12.5],[15.5,31.2],[31.5,32]])slab('courtyard-paving',x0,x1,-48,-44,paving);
 const matrix=new T.Matrix4(),bars=new T.BoxGeometry(.26,.026,.024);
 for(const x of [-31.35,31.35]){
  slab('courtyard-drain-channel',x-.15,x+.15,-48,48,concrete,-.155,.05);
  for(const dx of [-.1475,.1475])slab('courtyard-drain-frame',x+dx-.0175,x+dx+.0175,-48,48,metal,-.025,.05);
  const grate=new T.InstancedMesh(bars,metal,960);grate.name='courtyard-drain-grate';grate.receiveShadow=true;
  for(let i=0;i<960;i++)grate.setMatrixAt(i,matrix.makeTranslation(x,-.013,-47.95+i*.1));
  grate.computeBoundingSphere();root.add(grate);
 }
}
