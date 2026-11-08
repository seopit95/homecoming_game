import * as T from 'three';
import {surface} from './materials.ts';
import type {Stage} from './story.ts';
import {createGhost} from './ghost.ts';

// A short remembered drive, played on the same simulation clock as the game.
export function buildRoad(scene:T.Scene,mode:'memory'|'escape'='memory'){
  const root=new T.Group();root.name=mode==='escape'?'storm-escape':'accident-memory';scene.add(root);
  const asphalt=surface('concrete','#262b2b',{roughness:.21}),concrete=surface('concrete','#515655'),black=new T.MeshStandardMaterial({color:'#111518',roughness:.45}),paint=new T.MeshStandardMaterial({color:'#b9b9a5',roughness:.38});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material,parent:T.Object3D=root){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  box(0,-.1,-14,10,.2,120,asphalt);for(const x of [-6,6])box(x,.08,-14,2,.16,120,concrete);
  for(let z=-65;z<40;z+=6)box(0,.005,z,.12,.01,2.5,paint);
  for(let x=-4;x<4;x+=1.1)box(x,.008,-4,.65,.016,2.8,paint);
  for(let z=-62;z<35;z+=10)for(const side of [-1,1]){
    const x=side*8;box(x,2.7,z,3,5.4,7,concrete);box(side*6.05,2,z, .03,1.1,1.7,black);
    box(side*5.4,2.2,z,.07,4.4,.07,black);box(side*4.95,4.34,z,.9,.1,.25,paint);
    if(z%20===-2){const light=new T.PointLight('#a5bbbf',10,12,2);light.position.set(side*4.95,4.15,z);root.add(light);}
  }
  // Rain streaks are geometry, so they follow the paused simulation time too.
  const rainPositions=[];for(let i=0;i<180;i++){const x=Math.sin(i*73.1)*5,y=(i*.173)%5,z=-60+(i*7.31)%100;rainPositions.push(x,y,z,x-.025,y-.18,z);}
  const rain=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rainPositions,3)),new T.LineBasicMaterial({color:'#7d8c95',transparent:true,opacity:.22}));root.add(rain);
  const car=new T.Group();car.name='memory-car';root.add(car);
  box(0,.58,-1.25,1.9,.15,.6,black,car);box(0,.49,-2.2,1.85,.12,1.5,black,car);
  for(const x of [-.92,.92]){const pillar=box(x,1.12,-1.23,.07,1.24,.06,black,car);pillar.rotation.x=.28;}
  box(0,1.64,-1.43,1.9,.12,.12,black,car);
  const wheel=new T.Mesh(new T.TorusGeometry(.24,.029,8,28),black);wheel.position.set(.35,.81,-.66);wheel.rotation.x=-.25;car.add(wheel);
  box(.35,.81,-.66,.44,.035,.035,black,car);box(.35,.79,-.67,.09,.13,.055,black,car);
  const dashboard=new T.Mesh(new T.PlaneGeometry(.4,.12),new T.MeshBasicMaterial({color:'#607568'}));dashboard.position.set(.34,.71,-1.02);car.add(dashboard);
  const wipers:T.Mesh[]=[];for(const x of [-.42,.37]){const w=box(x,.7,-1.05,.018,.71,.018,black,car);w.geometry.translate(0,.355,0);wipers.push(w);}
  for(const x of [-.65,.65]){
    const light=new T.SpotLight('#e6dfbf',65,40,Math.PI/6,.8,1.5);light.position.set(x,.65,-2.9);light.target.position.set(x,.2,-30);car.add(light,light.target);
  }
  // Fractures appear only after impact, without a full-screen flash or gore.
  const cracks:number[]=[];for(let i=0;i<9;i++){const angle=i*2.4;cracks.push(.18,1.08,-1.14,.18+Math.cos(angle)*(.25+i*.055),1.08+Math.sin(angle)*(.18+i*.03),-1.14);}
  const glass=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(cracks,3)),new T.LineBasicMaterial({color:'#c9d1ce',transparent:true,opacity:.68}));glass.name='memory-cracked-glass';car.add(glass);
  const victim=new T.Group();victim.name='memory-pedestrian';root.add(victim);
  const coat=new T.MeshStandardMaterial({color:'#bcbba8',roughness:.94}),skin=new T.MeshStandardMaterial({color:'#ada194',roughness:.9});
  box(0,.98,0,.44,.78,.25,coat,victim);
  const head=new T.Mesh(new T.SphereGeometry(.14,14,10),skin);head.scale.y=1.25;head.position.y=1.57;victim.add(head);box(0,1.6,-.075,.3,.34,.17,black,victim);
  const legs:T.Mesh[]=[];for(const side of [-1,1]){const leg=box(side*.105,.36,0,.12,.67,.14,black,victim);legs.push(leg);const arm=box(side*.27,1,0,.12,.7,.14,coat,victim);arm.rotation.z=side*.08;box(side*.1,.06,.035,.14,.1,.25,black,victim);}
  box(.36,.59,0,.2,.27,.12,black,victim);
  const passenger=mode==='escape'?createGhost(car):null;
  const lightning=new T.PointLight('#dbe8ef',0,28,2);lightning.position.set(0,4,-7);car.add(lightning);
  if(passenger){
    passenger.name='passenger-apparition';passenger.position.set(-.65,-.25,.05);passenger.rotation.y=Math.PI/2;
    for(const side of [-1,1]){passenger.getObjectByName(`ghost-hip-${side}`)!.rotation.x=-1.3;passenger.getObjectByName(`ghost-knee-${side}`)!.rotation.x=1.5;}
    for(const x of [-.55,.42]){box(x,.35,.18,.63,.14,.65,black,car);box(x,.75,.49,.63,.8,.13,black,car);box(x,1.2,.49,.38,.2,.15,black,car);}
    for(const x of [-.94,.94])box(x,.6,.15,.1,.75,1.8,black,car);
    box(0,1.64,.1,1.95,.1,2.4,black,car);
    const mirror=box(0,1.42,-.98,.3,.12,.05,paint,car);mirror.name='rear-view-mirror';
    box(4.1,.6,-46,1.5,1.2,4,concrete).name='crash-barrier';
    const drops=[];for(let i=0;i<260;i++){const x=Math.sin(i*47)*.82,y=.76+(i*.061)%.78;drops.push(x,y,-1.19,x-.018,y-.09,-1.19);}
    const windshield=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(drops,3)),new T.LineBasicMaterial({color:'#bdd0db',transparent:true,opacity:.3}));windshield.name='windshield-rain';car.add(windshield);
    (rain.material as T.LineBasicMaterial).opacity=.5;
  }
  function pose(stage:Stage,time:number,camera:T.PerspectiveCamera,reduced:boolean){
    if(mode==='escape'){
      const reveal=stage==='passenger_reveal',crash=stage==='car_crash',hit=Math.min(time,1.8);
      const z=crash?-35-hit*6:reveal?-22.8-time*3.8:24-time*3.6;
      car.position.set(crash?-1.35+hit*2.6:-1.35,0,z);car.rotation.y=crash?-hit*.35:0;
      car.updateMatrixWorld(true);camera.position.set(.35,1.13,.02).applyMatrix4(car.matrixWorld);
      const turn=reveal?Math.PI/2*T.MathUtils.smoothstep(time,.25,1.1):crash?Math.PI/2*(1-T.MathUtils.smoothstep(time,0,.5)):0;
      camera.rotation.set(crash?-T.MathUtils.smoothstep(time,1.6,3)*.45:-.02,turn+car.rotation.y,crash?(reduced?.06:.4)*T.MathUtils.smoothstep(time,1.5,2.8):0,'YXZ');
      wheel.rotation.z=crash?-hit*1.4:Math.sin(time)*.04;
      wipers.forEach((w,i)=>{w.rotation.z=Math.sin(time*6+i*.2)*.85;});
      victim.visible=false;glass.visible=crash;rain.position.y=-(time*5)%3;
      if(passenger){passenger.visible=reveal||crash;passenger.rotation.y=Math.PI/2;}
      const flash=reveal?Math.exp(-time*2.5):Math.exp(-Math.abs(time-3)*5)+Math.exp(-Math.abs(time-8)*5);
      lightning.intensity=(reduced?12:35)*flash+(reveal?4:0);
      return;
    }
    const drive=stage==='drive',impact=stage==='impact';
    const z=drive?24-time*2.84:impact?1.28-Math.min(time,.4)*2.5:.28-time*4.4;
    car.position.set(-1.35+(reduced?0:Math.sin(time*1.1)*.08),0,z);
    camera.position.set(car.position.x+.35,1.13+(reduced?0:Math.sin(time*14)*.009),z+.02);
    camera.rotation.set(-.02,drive?0:impact?.1:0,reduced?0:impact?Math.sin(time*25)*.055*Math.exp(-time*3):Math.sin(time*.9)*.013,'YXZ');
    wheel.rotation.z=Math.sin(time*1.1)*.075;wipers.forEach((w,i)=>{w.rotation.z=Math.sin(time*3.3+i*.2)*.85;});
    victim.visible=drive||impact&&time<.55;
    victim.position.set(drive?3.1-time*.5:-.9,impact?-.1-time*.5:0,drive?-1.5:-1.5-time*1.8);
    victim.rotation.set(impact?-time*2.6:0,drive?-Math.PI/2:0,impact?time*.8:0);
    for(let i=0;i<2;i++)legs[i].rotation.x=drive?Math.sin(time*5+i*Math.PI)*.16:0;
    glass.visible=!drive;rain.position.y=-(time*2)%3;
  }
  return {root,pose};
}
