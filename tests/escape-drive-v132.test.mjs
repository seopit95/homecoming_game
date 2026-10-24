import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildCarDeparture} from '../lib/car-departure.ts';
import {buildRoad} from '../lib/prologue.ts';
const ctx={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},arc(){},fill(){}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};

test('V132 the ramp accelerates to road speed and keeps moving across the handoff',()=>{
 const r=buildCarDeparture(new T.Group(),[]),c=new T.PerspectiveCamera(72,16/9,.06,220);
 c.position.set(3.2,1.65,-17.8);
 assert.ok(r.duration<=13,'boarding plus urgent ramp exit must not take24seconds');
 assert.ok(r.pose(10,c,false)>6,'accelerating well above walking speed midway up the ramp');
 const speed=r.pose(r.duration,c,false),end=c.position.clone(),q=c.quaternion.clone();
 assert.ok(speed>=9&&speed<=12,'the car must not brake to a stop at the crest');
 assert.ok(Math.abs(r.car.position.z+44)<1e-8,'same ramp endpoint');
 const road=buildRoad(new T.Scene(),true);road.setDepartureFrame(r.roadFrame);
 const next=road.pose('car_escape',0,c,false);
 assert.ok(c.position.distanceTo(end)<.00001&&c.quaternion.angleTo(q)<.00001,'continuous seated camera');
 assert.ok(Math.abs(next-speed)<.02,'continuous velocity at the road handoff');
 const a=c.position.clone();road.pose('car_escape',.05,c,false);
 assert.ok(c.position.distanceTo(a)/.05>9,'no second startup crawl on the road');
 road.dispose();
});
