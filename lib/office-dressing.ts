import * as T from 'three';
import {facilityModel} from './facility-models.ts';
import {surface,softBox,boxUV} from './materials.ts';
import {cabinet,sinkCounter} from './props.ts';
import {batchStaticGeometry} from './static-geometry.ts';

export function officeDesk(root:T.Group){
 const desk=facilityModel('metal_office_desk');desk.name='office-duty-desk';const original=new T.Box3().setFromObject(desk),size=original.getSize(new T.Vector3());desk.scale.set(2.5/size.x,.8/size.y,.95/size.z);
 const bounds=new T.Box3().setFromObject(desk),center=bounds.getCenter(new T.Vector3());desk.position.set(-3-center.x,-bounds.min.y,1.5-center.z);root.add(desk);return desk;
}
export function dressOffice(root:T.Group){
 const room=new T.Group();room.name='office-domestic-shell';root.add(room);const wood=surface('wood','#a59b86'),dark=new T.MeshStandardMaterial({color:'#323c33',roughness:.86});
 function box(x:number,y:number,z:number,w:number,h:number,d:number){const m=new T.Mesh(boxUV(softBox(w,h,d,.006),x,y,z),wood);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;room.add(m);return m;}
 for(const x of [-5.697,5.697])box(x,.055,0,.026,.11,15.42);
 for(const side of [-1,1]){
  for(const z of [-2.15,2.9])box(side*.95,1.18,z,.18,2.36,.045);box(side*.95,2.42,.375,.18,.12,5.05);
  for(const x of [side*1.04,side*2.3])box(x,1.17,-1.6,.035,2.34,.18);box(side*1.67,2.4,-1.6,1.3,.12,.18);
 }
 // The converted flat retains its kitchen. Storage stays in the rear room.
 const kitchen=new T.Group();kitchen.name='office-retained-kitchen';kitchen.position.set(5.4,0,4.3);kitchen.rotation.y=-Math.PI/2;root.add(kitchen);kitchen.add(cabinet(3.3,.82,.62,wood));const counter=sinkCounter(3.3,.66,.6,.55,.4);counter.position.y=.87;kitchen.add(counter);
 const mug=new T.Group();mug.name='office-break-mug';mug.position.set(4.35,.8,3.8);root.add(mug);const ceramic=surface('ceramic','#b5b2a2',{roughness:.38}),profile=[[0,0],[.03,0],[.039,.008],[.043,.09],[.042,.095],[.035,.095],[.034,.088],[.029,.011],[0,.011]].map(([r,y])=>new T.Vector2(r,y));
 const body=new T.Mesh(new T.LatheGeometry(profile,32),ceramic);body.castShadow=body.receiveShadow=true;mug.add(body);const handle=new T.Mesh(new T.TorusGeometry(.023,.006,10,28),ceramic);handle.position.set(.045,.05,0);handle.castShadow=true;mug.add(handle);const coffee=new T.Mesh(new T.CircleGeometry(.033,32),dark);coffee.rotation.x=-Math.PI/2;coffee.position.y=.078;mug.add(coffee);
 batchStaticGeometry(room,[]);return room;
}
