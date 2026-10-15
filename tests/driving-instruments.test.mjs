import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createDrivingCar} from '../lib/driving-car.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};

test('the physical speedometer follows the supplied vehicle speed and returns to rest',()=>{
 const car=createDrivingCar(false),needle=car.root.getObjectByName('hero-speed-needle');
 assert.ok(needle,'a real speed needle is visible in the instrument cluster');
 const tip=()=>{car.root.updateMatrixWorld(true);return needle.localToWorld(new T.Vector3(0,.043,0));};
 car.pose(0,0,true,0,0,0);const rest=tip();
 car.pose(20,0,true,0,0,8);const moving=tip();assert.ok(moving.distanceTo(rest)>.02,'normal driving must move the needle off its stop');
 car.pose(22,0,true,0,0,0);assert.ok(tip().distanceTo(rest)<.00001,'the stopped car must not still display cruising speed');
});

test('the steering rim faces the seated driver instead of lying edge-on',()=>{
 const car=createDrivingCar(false),wheel=car.root.getObjectByName('hero-steering-wheel');car.root.updateMatrixWorld(true);
 const center=wheel.getWorldPosition(new T.Vector3()),eye=new T.Vector3(-.38,1.22,-.24),normal=new T.Vector3(0,0,1).transformDirection(wheel.matrixWorld);
 assert.ok(Math.abs(normal.dot(eye.sub(center).normalize()))>.85,'the wheel plane should face the actual seated eye');
});
