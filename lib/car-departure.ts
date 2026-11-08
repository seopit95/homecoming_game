import * as T from 'three';
import {createDrivingCar} from './driving-car.ts';
import {surface} from './materials.ts';
import {carDepartureDuration} from './story.ts';
import type {Solid} from './world.ts';

export type CarDeparture={car:T.Group;duration:number;pose(time:number,camera:T.PerspectiveCamera,reduced:boolean):number;roadFrame:T.Matrix4;reset():void};
// Flat crest is shared with the road's existing coordinate system.
export const departureFrame=new T.Matrix4().makeTranslation(4.15,1.2,-189);
export function rampHeight(z:number){return 1.2*T.MathUtils.smoothstep(-z,24,40);}
export function buildCarDeparture(root:T.Group,solids:Solid[]):CarDeparture{
  const rig=createDrivingCar(),car=rig.root;root.add(car);
  const concrete=surface('concrete','#747b7c'),floor=surface('concrete','#454b50',{roughness:.28,bumpScale:.009});
  const steel=new T.MeshStandardMaterial({color:'#626f75',roughness:.4,metalness:.65});
  const glow=new T.MeshStandardMaterial({color:'#a29372',emissive:'#c7ad80',emissiveIntensity:.55});
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=true){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);if(solid)solids.push({x,y,z,w,h,d});return o;}
  // Each metre is an actual ramp slab and roof slab, including the eased crest.
  for(let z=-22.5;z>-71;z--){
    const a=rampHeight(z+.5),b=rampHeight(z-.5),y=(a+b)/2,angle=Math.atan2(b-a,1),length=Math.hypot(1,b-a);
    const slab=box('vehicle-ramp',5.8,y-.1,z,5.5,.2,length,floor,false);slab.rotation.x=angle;
    const roof=box('vehicle-tunnel-roof',5.8,y+2.77,z,5.72,.18,length,concrete);roof.rotation.x=angle;
    for(const x of [3.05,8.55])box('vehicle-tunnel-wall',x,y+1.35,z,.22,2.7,1,concrete);
  }
  for(const z of [-25,-31,-37,-43,-49,-55,-61,-67]){const y=rampHeight(z);box('vehicle-exit-light',5.8,y+2.65,z,1,.05,.18,glow,false);const l=new T.PointLight('#8fada8',4,7);l.position.set(5.8,y+2.5,z);root.add(l);}
  const line=new T.MeshStandardMaterial({color:'#9faba5',roughness:.43});
  for(const z of [-45,-51,-57,-63,-69])box('vehicle-exit-marking',4.15,1.208,z,.1,.012,2.8,line,false);
  box('vehicle-exit-edge',8.3,1.208,-55.5,.09,.012,31,line,false);
  for(const x of [2.98,8.62])box('vehicle-shutter-track',x,1.35,-22,.14,2.7,.22,steel);
  box('vehicle-shutter-header',5.8,2.85,-22,5.9,.3,.42,steel);
  box('vehicle-shutter-operator',8.86,2.45,-22,.38,.5,.45,steel);
  const shutter=box('vehicle-shutter',5.8,1.3,-22,5.4,2.6,.12,steel),shutterBlock=solids.at(-1)!;
  for(let y=.1;y<2.6;y+=.16){const rib=new T.Mesh(new T.BoxGeometry(5.36,.025,.03),steel);rib.position.set(0,y-1.3,.075);shutter.add(rib);}
  for(const o of root.children)if(o.position.z< -40&&(o.name.startsWith('vehicle-')||o instanceof T.Light))o.userData.departureRoadSurface=true;
  const bodyBlock:Solid={x:5,z:-18,w:2.24,d:4.57,y:.76,h:1.52};
  const doorBlock:Solid={x:4.14,z:-18.355,w:.5,d:1.24,y:.88,h:1.12};solids.push(bodyBlock,doorBlock);
  const seatEuler=new T.Euler(-.055,0,0,'YXZ'),doorEuler=new T.Euler();
  const doorCenter=new T.Vector3(.025,.88,-.585),eye=new T.Vector3(-.38,1.22,-.24),approach=new T.Vector3(),startRotation=new T.Quaternion(),seatRotation=new T.Quaternion(),doorRotation=new T.Quaternion(),temp=new T.Vector3();
  let captured=false;
  function reset(){captured=false;car.position.set(5,0,-18);car.rotation.set(0,0,0);rig.pose(0,0,false);shutter.position.y=1.3;shutter.scale.y=1;shutterBlock.y=1.3;shutterBlock.h=2.6;sync();}
  function sync(){
    car.updateMatrixWorld(true);bodyBlock.x=car.position.x;bodyBlock.z=car.position.z;bodyBlock.y=car.position.y+.76;bodyBlock.yaw=car.rotation.y;
    temp.copy(doorCenter);rig.door.localToWorld(temp);doorBlock.x=temp.x;doorBlock.y=temp.y;doorBlock.z=temp.z;rig.door.getWorldQuaternion(doorRotation);doorBlock.yaw=doorEuler.setFromQuaternion(doorRotation,'YXZ').y;
  }
  function pose(time:number,camera:T.PerspectiveCamera,reduced:boolean){
    const t=T.MathUtils.clamp(time,0,carDepartureDuration);
    if(!captured){approach.copy(camera.position);startRotation.copy(camera.quaternion);captured=true;}
    const drive=T.MathUtils.smoothstep(t,8,carDepartureDuration),distance=26*drive,z=-18-distance;
    const align=T.MathUtils.smoothstep(distance,0,8),x=5+.8*align;
    const slope=(rampHeight(z-1.35)-rampHeight(z+1.35))/2.7;
    const dx=distance>0&&distance<8?.8*6*(distance/8)*(1-distance/8)/8:0;
    car.position.set(x,(rampHeight(z-1.35)+rampHeight(z+1.35))/2,z);car.rotation.set(Math.atan(slope),-Math.atan(dx),0,'YXZ');
    const open=1.08*T.MathUtils.smoothstep(t,1.5,2.5)*(1-T.MathUtils.smoothstep(t,4.8,5.5));rig.pose(Math.max(0,t-6),open,t>=6);
    const lift=T.MathUtils.smoothstep(t,6,8);shutter.position.y=1.3+1.3*lift;shutter.scale.y=1-.995*lift;shutterBlock.y=shutter.position.y;shutterBlock.h=2.6*shutter.scale.y;sync();
    const board=T.MathUtils.smoothstep(t,2.5,4.8);temp.copy(eye);car.localToWorld(temp);camera.position.copy(approach).lerp(temp,board);
    seatEuler.y=(reduced?.45:.7)*T.MathUtils.smoothstep(t,4.6,5)*(1-T.MathUtils.smoothstep(t,5.5,6.2));seatRotation.setFromEuler(seatEuler).premultiply(car.quaternion);camera.quaternion.copy(startRotation).slerp(seatRotation,board);
    if(!reduced&&t>6)camera.position.y+=Math.sin(t*23)*.0015*T.MathUtils.smoothstep(t,6,7)*(1-T.MathUtils.smoothstep(t,23,24));
    camera.updateMatrixWorld();return t>8&&t<carDepartureDuration?26*6*((t-8)/16)*(1-(t-8)/16)/16:0;
  }
  reset();return {car,duration:carDepartureDuration,pose,roadFrame:departureFrame.clone(),reset};
}
