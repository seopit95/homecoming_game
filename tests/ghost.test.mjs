import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeFigure} from '../lib/building.ts';

test('ghost animation preserves its navigation root and remains finite at every pose',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts');
  const root=new T.Group(),figure=makeFigure(root);figure.position.set(3,0,-4);figure.rotation.y=.7;
  const before=figure.position.toArray();
  for(const t of [0,.2,1,2.5,9,100,10000]){
    animateGhost(figure,t,1,.8,false);figure.updateMatrixWorld(true);
    assert.deepEqual(figure.position.toArray(),before);assert.equal(figure.rotation.y,.7);
    const bounds=new T.Box3().setFromObject(figure);assert.ok(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
    assert.ok(bounds.max.y-bounds.min.y<2.7,'animation must stay within human-scale room clearances');
  }
});
test('repeating the same paused time produces exactly the same pose',async()=>{
  const {animateGhost}=await import('../lib/ghost.ts'),figure=makeFigure(new T.Group());
  const pose=()=>{figure.updateMatrixWorld(true);const result=[];figure.traverse(o=>result.push(...o.matrix.elements));return result;};
  animateGhost(figure,5,1,.8,false);const before=pose();animateGhost(figure,5,1,.8,false);assert.deepEqual(pose(),before);
});
