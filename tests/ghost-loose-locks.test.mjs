import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHair} from '../lib/ghost-hair.ts';

test('below the jaw the hair has separate narrow locks instead of a continuous wide curtain',()=>{
 const {tails}=createHair(new T.Group()),g=tails.children[0].geometry,p=g.attributes.position,ix=g.index,adj=new Map();
 const link=(a,b)=>{if(!adj.has(a))adj.set(a,new Set());adj.get(a).add(b);};
 for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(ids.some(i=>p.getY(i)>-.32))continue;for(const a of ids)for(const b of ids)link(a,b);}
 const seen=new Set(),locks=[];
 for(const start of adj.keys()){
  if(seen.has(start))continue;const stack=[start],points=[];
  while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);points.push(i);stack.push(...adj.get(i));}
  const ys=points.map(i=>p.getY(i));if(Math.max(...ys)-Math.min(...ys)<.3)continue;locks.push(points);
 }
 assert.ok(locks.length>=6,'several independently shaped long locks are needed');
 for(const lock of locks)for(const height of [-.45,-.8]){
  const band=lock.filter(i=>Math.abs(p.getY(i)-height)<.07);if(band.length<2)continue;
  const xs=band.map(i=>p.getX(i)),zs=band.map(i=>p.getZ(i));
  assert.ok(Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))<.12,'a lower hair surface spans the head like a broad curtain');
 }
});
