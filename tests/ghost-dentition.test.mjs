import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFace,poseFace} from '../lib/ghost-face.ts';

test('the upper dental arch has posterior chewing surfaces on both sides of the mouth',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());
 poseFace(r,1);head.updateMatrixWorld(true);
 for(const x of [-.045,.045]){
  const ray=new T.Raycaster(new T.Vector3(x,-.065,.09),new T.Vector3(0,1,0),0,.1);
  const hit=ray.intersectObjects(r.teeth.children,false)[0];
  assert.ok(hit,`missing posterior molar surface on side ${Math.sign(x)}`);
  assert.ok(hit.point.y>-.025&&hit.point.y<.025,'the molar belongs to the upper bite plane');
 }
});

test('asymmetric eyelids cover their seated eyeballs without erasing either visible eye',()=>{
 const head=new T.Group(),r=createFace(head,new T.MeshStandardMaterial());head.updateMatrixWorld(true);
 const openings=[];
 for(const eye of r.eyes.children){
  eye.geometry.computeBoundingBox();const c=eye.geometry.boundingBox.getCenter(new T.Vector3()),visible=[];
  for(let y=c.y-.04;y<c.y+.04;y+=.0005){
   const hit=new T.Raycaster(new T.Vector3(c.x,y,1),new T.Vector3(0,0,-1)).intersectObjects([r.face,eye],false)[0];
   if(hit?.object===eye)visible.push(y);
  }
  assert.ok(visible.length>=6,'a damaged eyelid still leaves a readable seated eye');
  openings.push(Math.max(...visible)-Math.min(...visible));
 }
 assert.ok(Math.min(...openings)<Math.max(...openings)*.75,`both eyes retain the same mannequin aperture: ${openings}`);
});
