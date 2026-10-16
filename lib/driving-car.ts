import * as T from 'three';
import {createSedan} from './sedan.ts';
import {softBox,upholstery,sharePrintedTexture} from './materials.ts';
import {carSeatBag} from './facility-props.ts';

// One complete sedan for memory, garage and escape. Canonical forward is -Z,
// driver on -X; the accident begins with an intact body and lights.
export function createDrivingCar(damaged=true,passengerAccess=false){
  const root=new T.Group();root.name='hero-sedan';
  const shell=createSedan('#222c31',damaged,true,passengerAccess);shell.rotation.y=Math.PI;root.add(shell);
  const belongings=damaged?carSeatBag():undefined;if(belongings){belongings.bag.position.set(.38,.2735,.17);belongings.bag.scale.z=.8;belongings.key.visible=passengerAccess;root.add(belongings.bag);}
  const door=shell.getObjectByName('hero-driver-door')!,hood=shell.getObjectByName('hero-hood')!,wheel=shell.getObjectByName('hero-steering-wheel')!;
  const rubber=new T.MeshStandardMaterial({color:'#202623',roughness:.8});
  const steel=new T.MeshStandardMaterial({color:'#a2a8a7',metalness:.8,roughness:.35});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#a6ad9a';ctx.fillRect(0,0,512,128);ctx.fillStyle='#2b3027';ctx.font='64px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('28 가 0317',256,64);const plateMap=sharePrintedTexture(new T.CanvasTexture(canvas),['hero-car-plate-v1']);plateMap.colorSpace=T.SRGBColorSpace;
  const plateMaterial=new T.MeshStandardMaterial({map:plateMap,roughness:.9});for(const end of [-1,1]){const plate=new T.Mesh(new T.PlaneGeometry(.47,.11),plateMaterial);plate.position.set(0,.548,end*2.263);plate.rotation.y=end>0?0:Math.PI;root.add(plate);}
  const dashboard=upholstery('#252a29');dashboard.bumpScale=.00035;
  const cluster=new T.Group();cluster.position.set(-.38,1.005,-.73);root.add(cluster);
  const c=document.createElement('canvas');c.width=1024;c.height=384;const paint=c.getContext('2d')!;
  paint.fillStyle='#080c0c';paint.fillRect(0,0,1024,384);paint.textAlign='center';paint.textBaseline='middle';paint.font='28px sans-serif';paint.fillStyle='#c3c9b8';
  for(let gauge=0;gauge<2;gauge++)for(let i=0;i<=(gauge?9:8);i++){const angle=-2.3+i*4.6/(gauge?9:8);paint.fillText(String(gauge?i*20:i),256+gauge*512+Math.sin(angle)*127,192-Math.cos(angle)*127);}
  paint.font='24px sans-serif';paint.fillText('×1000',256,240);paint.fillText('km/h',768,240);paint.fillStyle='#8ca78f';paint.font='34px monospace';paint.fillText('03:17',512,240);
  const atlas=sharePrintedTexture(new T.CanvasTexture(c),['hero-car-instruments-v1']);atlas.colorSpace=T.SRGBColorSpace;
  const instruments=new T.MeshStandardMaterial({map:atlas,roughness:.6,emissiveMap:atlas,emissive:'#a0b49b',emissiveIntensity:.18});
  const housing=new T.Mesh(softBox(.414,.166,.042,.024),dashboard);cluster.add(housing);
  const face=new T.Mesh(new T.PlaneGeometry(.37,.135),instruments);face.position.z=.022;cluster.add(face);
  const ticks=new T.InstancedMesh(new T.BoxGeometry(.0013,.006,.001),new T.MeshStandardMaterial({color:'#bac3b0',emissive:'#728774',emissiveIntensity:.12}),82),stamp=new T.Object3D();cluster.add(ticks);
  const needles:T.Group[]=[];
  for(let gauge=0;gauge<2;gauge++){
    const x=(gauge?1:-1)*.0925;
    for(let i=0;i<=40;i++){const a=-2.3+i*4.6/40;stamp.position.set(x+Math.sin(a)*.06,Math.cos(a)*.06,.0235);stamp.rotation.set(0,0,-a);stamp.scale.set(1,i%5===0?1:.55,1);stamp.updateMatrix();ticks.setMatrixAt(gauge*41+i,stamp.matrix);}
    const ring=new T.Mesh(new T.TorusGeometry(.064,.0015,5,48),steel);ring.position.set(x,0,.023);cluster.add(ring);
    const needle=new T.Group();needle.name=gauge?'hero-speed-needle':'hero-rpm-needle';needle.position.set(x,0,.026);cluster.add(needle);needles.push(needle);
    box(0,.019,0,.0018,.049,.001,new T.MeshStandardMaterial({color:'#ae4937',emissive:'#622019',emissiveIntensity:.2}),needle);
    const cap=new T.Mesh(new T.CircleGeometry(.0045,12),rubber);cap.position.z=.001;needle.add(cap);
  }
  // Older suspended radio stack mounts to the dash; the footwell stays open below it.
  box(0,.8,-.66,.28,.16,.15,dashboard).name='hero-center-stack';
  box(.4,.8,-.71,.52,.2,.18,dashboard).name='hero-glovebox';
  box(.4,.798,-.616,.07,.017,.008,rubber);
  const lcdGeometry=new T.PlaneGeometry(.115,.035),lcdUv=lcdGeometry.attributes.uv;for(let i=0;i<lcdUv.count;i++)lcdUv.setXY(i,.4+lcdUv.getX(i)*.2,.27+lcdUv.getY(i)*.21);
  const lcd=new T.Mesh(lcdGeometry,instruments);lcd.position.set(0,.79,-.583);root.add(lcd);
  for(const x of [-.09,.09]){const dial=new T.Mesh(new T.CylinderGeometry(.014,.015,.014,16),rubber);dial.position.set(x,.735,-.578);dial.rotation.x=Math.PI/2;root.add(dial);}
  const slats=new T.InstancedMesh(new T.BoxGeometry(1,.002,.004),new T.MeshStandardMaterial({color:'#555e58',roughness:.7,metalness:.15}),20);root.add(slats);
  for(let i=0;i<4;i++){const x=[-.63,.08,.31,.62][i],width=i===1||i===2?.18:.115;box(x,.925,-.621,width+.016,.053,.012,rubber);for(let row=0;row<5;row++){stamp.position.set(x,.908+row*.0085,-.612);stamp.rotation.set(0,0,0);stamp.scale.set(width,1,1);stamp.updateMatrix();slats.setMatrixAt(i*5+row,stamp.matrix);}}
  const wipers:T.Group[]=[];
  for(const x of [-.36,.33]){const pivot=new T.Group();pivot.position.set(x,.954,-.934);pivot.rotation.x=.88;root.add(pivot);const arm=new T.Group();pivot.add(arm);const metalArm=new T.Mesh(new T.CylinderGeometry(.0025,.0035,.31,8),steel);metalArm.position.y=.155;arm.add(metalArm);box(0,.285,.004,.006,.22,.006,rubber,arm);wipers.push(arm);}
  const lights:T.SpotLight[]=[];
  for(const x of [-.588,.588]){const lamp=new T.SpotLight('#e8dfc8',x<0?38:110,42,.54,.7,1.7);lamp.position.set(x,.636,-2.2);lamp.target.position.set(x,.2,-30);root.add(lamp,lamp.target);lights.push(lamp);}
  const cabin=new T.PointLight('#b6c5a7',.6,2,2);cabin.position.set(0,1.34,-.08);root.add(cabin);
  const lampMaterial=shell.children.find(o=>o instanceof T.Mesh&&(o.material as T.Material).name==='sedan-tail-lamps') as T.Mesh|undefined;
  function pose(time:number,open:number,engine:boolean,steer=0,crush=0,speed=0){
    wheel.rotation.z=steer;hood.rotation.x=-crush*.43;
    door.rotation.y=-open;
    for(const lamp of lights)lamp.intensity=engine?(lamp.position.x<0?38:110):0;
    cabin.intensity=open>.01?.6:.18;
    instruments.emissiveIntensity=engine?.18:0;
    needles[0].rotation.z=2.3-(engine?.8+Math.min(4,Math.max(0,speed)*.14):0)/8*4.6;
    needles[1].rotation.z=2.3-T.MathUtils.clamp(speed*3.6/180,0,1)*4.6;
    for(const w of wipers)w.rotation.z=engine?.65-(.5-.5*Math.cos(time*3.69599))*1.3:.65;
    if(lampMaterial){const m=lampMaterial.material as T.MeshPhysicalMaterial;m.emissive.set('#751912');m.emissiveIntensity=engine?.7:0;}
  }
  pose(0,0,false);
  return {root,door,pose,key:belongings?.key};
}
