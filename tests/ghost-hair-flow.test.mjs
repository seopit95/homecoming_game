import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair,settleHair} from '../lib/ghost-hair.ts';

test('wet strand cutouts vary in width and end separately instead of making a comb edge',()=>{
 const {tails}=createHair(new T.Group()),material=tails.children[0].material,{data,width,height}=material.alphaMap.image;
 const visible=(x,y)=>data[(y*width+x)*4+1]/255>=material.alphaTest;
 const runs=y=>{const widths=[];let run=0;for(let x=0;x<width;x++){if(visible(x,y))run++;else if(run){widths.push(run);run=0;}}return widths;};
 const widths=runs(80);
 assert.ok(Math.max(...widths)-Math.min(...widths)>=4,'wet clumps need visibly different widths');
 assert.ok(runs(Math.floor(height*.86)).length<=widths.length-2,'several strand tips must end before the full-length strands');
 assert.equal(material.alphaToCoverage,true,'the existing MSAA renderer should soften the alpha silhouette');
});

test('the rear scalp-to-hanging curve has no coarse angular kink',()=>{
 const figure=new T.Group(),head=new T.Group();figure.add(head);head.position.y=1.4;
 const {tails}=createHair(head);settleHair(tails,figure,0,.02);
 const mesh=tails.children[0],specs=mesh.userData.locks,p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
 const cols=Array.from({length:uv.count},(_,i)=>uv.getY(i)).findIndex(v=>v>0)-1,rows=p.count/specs.length/(cols+1)-1;
 const k=specs.findIndex(s=>Math.abs(s.angle-1.5*Math.PI)<.04);
 const center=j=>new T.Vector3().fromBufferAttribute(p,k*(rows+1)*(cols+1)+j*(cols+1)+cols/2);
 for(let j=2;j<rows-1;j++)if(j/rows<.65){
  const bend=center(j).sub(center(j-1)).angleTo(center(j+1).sub(center(j)));
  assert.ok(bend<.23,`scalp/hanging bend ${bend} radians at ${j/rows} gives a visible facet`);
 }
});
