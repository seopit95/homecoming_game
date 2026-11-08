import * as T from 'three';
import {createSedan} from './sedan.ts';

// One complete sedan for both garage and escape. Canonical forward is -Z,
// driver on -X. The memory sequence deliberately retains its existing model.
export function createDrivingCar(){
  const root=new T.Group();root.name='hero-sedan';
  const shell=createSedan('#222c31',true,true);shell.rotation.y=Math.PI;root.add(shell);
  const door=shell.getObjectByName('hero-driver-door')!;
  const rubber=new T.MeshStandardMaterial({color:'#202623',roughness:.8});
  const steel=new T.MeshStandardMaterial({color:'#a2a8a7',metalness:.8,roughness:.35});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#a6ad9a';ctx.fillRect(0,0,512,128);ctx.fillStyle='#2b3027';ctx.font='64px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('28 가 0317',256,64);const plateMap=new T.CanvasTexture(canvas);plateMap.colorSpace=T.SRGBColorSpace;
  const plateMaterial=new T.MeshStandardMaterial({map:plateMap,roughness:.9});for(const end of [-1,1]){const plate=new T.Mesh(new T.PlaneGeometry(.47,.11),plateMaterial);plate.position.set(0,.548,end*2.263);plate.rotation.y=end>0?0:Math.PI;root.add(plate);}
  const instruments=new T.MeshBasicMaterial({color:'#8bb2a0'});
  box(-.38,.963,-.737,.3,.055,.008,instruments).name='hero-instruments';
  for(const x of [-.48,-.28])box(x,.966,-.729,.012,.032,.006,rubber);
  const wipers:T.Group[]=[];
  for(const x of [-.36,.33]){const pivot=new T.Group();pivot.position.set(x,.954,-.934);pivot.rotation.x=.88;root.add(pivot);const arm=new T.Group();pivot.add(arm);const metalArm=new T.Mesh(new T.CylinderGeometry(.0025,.0035,.31,8),steel);metalArm.position.y=.155;arm.add(metalArm);box(0,.285,.004,.006,.22,.006,rubber,arm);wipers.push(arm);}
  const lights:T.SpotLight[]=[];
  for(const x of [-.588,.588]){const lamp=new T.SpotLight('#e8dfc8',x<0?38:110,42,.54,.7,1.7);lamp.position.set(x,.636,-2.2);lamp.target.position.set(x,.2,-30);root.add(lamp,lamp.target);lights.push(lamp);}
  const cabin=new T.PointLight('#b6c5a7',.6,2,2);cabin.position.set(0,1.34,-.08);root.add(cabin);
  const lampMaterial=shell.children.find(o=>o instanceof T.Mesh&&(o.material as T.Material).name==='sedan-tail-lamps') as T.Mesh|undefined;
  function pose(time:number,open:number,engine:boolean){
    door.rotation.y=-open;
    for(const lamp of lights)lamp.intensity=engine?(lamp.position.x<0?38:110):0;
    cabin.intensity=open>.01?.6:.18;
    instruments.color.set(engine?'#8bb2a0':'#17211c');
    for(const w of wipers)w.rotation.z=engine?.65-(.5-.5*Math.cos(time*3.69599))*1.3:.65;
    if(lampMaterial){const m=lampMaterial.material as T.MeshPhysicalMaterial;m.emissive.set('#751912');m.emissiveIntensity=engine?.7:0;}
  }
  pose(0,0,false);
  return {root,door,pose};
}
