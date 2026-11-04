import * as T from 'three';
import {configureShadow} from './lighting.ts';
import {buildRoadStreet} from './road-street.ts';
import {createDrivingCar} from './driving-car.ts';
import {createVehicleWreck} from './vehicle-wreck.ts';
import {createDumpTruck} from './dump-truck.ts';
import {createSedan,sedanWindshieldPoint} from './sedan.ts';
import {createDrivingHands} from './driving-hands.ts';
import {createDrivingBottles} from './driving-bottles.ts';
import {createPedestrian} from './pedestrian.ts';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {sharePrintedTexture,surface,boxUV,softBox} from './materials.ts';
import {createLeatherShoe} from './entry-props.ts';
import {createGhost,animateGhostPassenger} from './ghost.ts';
import {carExitSpeed,opening,openingTiming as beats,finale,finaleTiming as endingBeats,type Stage} from './story.ts';

// All motion is sampled from simulation time: pause, skip and replay never leave a cutscene running.
export function buildRoad(scene:T.Scene,escapeDrive=false){
  const root=new T.Group();root.name=escapeDrive?'escape-drive':'accident-memory';scene.add(root);
  const asphalt=surface('asphalt','#a7aeb1',{roughness:.48,normalScale:new T.Vector2(.16,.16)});
  const concrete=surface('wornConcrete','#a5aba5');
  const rubber=new T.MeshStandardMaterial({color:'#14191d',roughness:.86});
  const steel=new T.MeshStandardMaterial({color:'#626f75',roughness:.3,metalness:.8});
  const paint=surface('concrete','#d0cbb7',{roughness:.86,normalScale:new T.Vector2(.2,.2)});
  const warm=new T.MeshStandardMaterial({color:'#a29372',emissive:'#c7ad80',emissiveIntensity:.55,roughness:.6});
  const red=new T.MeshBasicMaterial({color:'#c44424'}),darkGlass=new T.MeshPhysicalMaterial({color:'#13232e',metalness:.4,roughness:.12});
  function mesh(g:T.BufferGeometry,m:T.Material,p:number[],parent:T.Object3D=root){const o=new T.Mesh(g,m);o.position.set(...p as [number,number,number]);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root){return mesh(boxUV(softBox(w,h,d),x,y,z),m,[x,y,z],parent);}
  function rod(a:number[],b:number[],r:number,m:T.Material,parent:T.Object3D=root,r2=r){const av=new T.Vector3(...a as [number,number,number]),bv=new T.Vector3(...b as [number,number,number]);const o=mesh(new T.CylinderGeometry(r2,r,av.distanceTo(bv),12),m,av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;}
  function tube(points:number[][],r:number,m:T.Material,parent:T.Object3D=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),20,r,6,false),m,[0,0,0],parent);}
  function label(text:string,w:number,h:number,p:number[],parent:T.Object3D=root,background='#111c22',ink='#c6d0c4'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.fillStyle=ink;ctx.font='42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,69);
    const map=sharePrintedTexture(new T.CanvasTexture(c),['road-label-v1',text,background,ink]);map.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}),p,parent);
  }
  const roadCenter=escapeDrive?-6.5:18,roadLength=escapeDrive?311:360;
  box(0,-.12,roadCenter,9,.24,roadLength,asphalt);
  for(const x of [-5.2,5.2]){box(x,.06,roadCenter,1.3,.14,roadLength,concrete);box(x<0?-4.57:4.57,.12,roadCenter,.14,.24,roadLength,concrete);}
  function marking(x:number,z:number,w:number,d:number){const m=box(x,.00075,z,w,.0015,d,paint);m.castShadow=false;}
  for(let z=-150;z<(escapeDrive?148:190);z+=6)marking(0,z,.1,2.8);
  for(const x of [-4.15,4.15])marking(x,escapeDrive?-6.5:18,.09,escapeDrive?311:350);
  for(let x=-3.7;x<4;x+=1.03)marking(x,-2,.58,3.3);
  marking(-2.05,1.5,3.8,.32);
  // Wet patches catch broken pools of streetlight without an expensive second scene render.
  const puddle=new T.MeshPhysicalMaterial({color:'#566570',metalness:.48,roughness:.07,transparent:true,opacity:.3,depthWrite:false});
  for(let i=0;i<(escapeDrive?35:38);i++){const outline=new T.Shape();for(let j=0;j<36;j++){const a=j/36*Math.PI*2,r=1+.14*Math.sin(a*3+i)+.08*Math.sin(a*7+i*2);if(j===0)outline.moveTo(Math.cos(a)*r,Math.sin(a)*r);else outline.lineTo(Math.cos(a)*r,Math.sin(a)*r);}outline.closePath();const p=mesh(new T.ShapeGeometry(outline),puddle,[Math.sin(i*19.3)*3.8,.0018,-140+i*8.3]);p.castShadow=false;p.rotation.x=-Math.PI/2;p.scale.set(.22+(i%4)*.18,1.2+(i%5)*.3,1);}
  const glow=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){vec2 p=abs(v*2.-1.);float a=pow(1.-p.x,2.)*(1.-p.y)*(.6+.4*sin(v.y*190.));gl_FragColor=vec4(.51,.61,.66,a*.12);}'});
  for(let z=-135;z<(escapeDrive?149:170);z+=18){
    rod([4.95,.1,z],[4.95,5.5,z],.065,steel);rod([4.95,5.5,z],[3.8,5.5,z],.035,steel);box(3.8,5.42,z,.55,.1,.3,warm);

    const shine=mesh(new T.PlaneGeometry(1.3,8),glow,[2.6,.002,z+2]);shine.rotation.x=-Math.PI/2;shine.castShadow=false;
    for(let i=0;i<4;i++)box(4.32,.025,z+i*.13,.4,.025,.045,rubber);
  }
  buildRoadStreet(root,escapeDrive);
  const streetLights=Array.from({length:4},()=>{const light=new T.SpotLight('#b8c9d2',65,22,.9,.9,2);root.add(light,light.target);return light;});
  // The red traffic light and lit crossing establish what the driver failed to notice.
  rod([4.9,.1,-6],[4.9,5.9,-6],.095,steel);rod([4.9,5.7,-6],[-.1,5.7,-6],.065,steel);
  box(-.4,5.45,-6,1.18,.4,.28,rubber);
  for(let i=0;i<3;i++){const lens=mesh(new T.CircleGeometry(.12,24),i===0?red:darkGlass,[-.79+i*.38,5.45,-5.849]);box(-.79+i*.38,5.6,-5.79,.28,.075,.26,rubber);lens.castShadow=false;}
  const crossingLight=new T.SpotLight('#c4d1d6',70,22,.85,.85,2);crossingLight.position.set(3.5,6,-2);crossingLight.target.position.set(-1,0,-2);configureShadow(crossingLight);crossingLight.shadow.mapSize.set(1024,1024);root.add(crossingLight,crossingLight.target);
  label('백로아파트  ｜  서행',2.4,.42,[3.4,3.6,-5.8]);
  box(4.92,1.18,7.4,.25,2.35,.25,concrete);box(5.35,.45,7.4,.8,.9,1.9,concrete);
  const parked=createSedan('#66716c');parked.position.set(-3.38,0,7.8);root.add(parked);
  // Volumetric rain wraps around the camera; individual drops on the glass are a separate layer.
  const rainPoints=[];for(let i=0;i<600;i++){const x=Math.sin(i*73.1)*8,y=(i*.173)%7,z=escapeDrive?-150+(i*7.31)%267:-42+(i*7.31)%53;rainPoints.push(x,y,z,x-.025,y-.22,z);}
  const rain=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rainPoints,3)),new T.LineBasicMaterial({color:'#a4bcc9',transparent:true,opacity:.2,depthWrite:false}));root.add(rain);
  const car=new T.Group();car.name='memory-car';root.add(car);
  const drivingCar=createDrivingCar(escapeDrive);car.add(drivingCar.root);const vehicleWreck=escapeDrive?createVehicleWreck(drivingCar.root):undefined;
  const wheel=drivingCar.root.getObjectByName('hero-steering-wheel')!;
  let memoryHands:T.Group|undefined;
  if(!escapeDrive)memoryHands=createDrivingHands(wheel);
  const bottles=memoryHands?createDrivingBottles(car,memoryHands):undefined;
  const mirrorTarget=new T.WebGLRenderTarget(384,112),mirrorCamera=new T.PerspectiveCamera(32,384/112,.1,75);
  let mirrorFace:T.Mesh|undefined;
  if(!escapeDrive){
    rod([0,1.425,-.41],[0,1.315,-.45],.009,rubber,car);
    box(0,1.315,-.445,.32,.105,.025,rubber,car);
    mirrorFace=mesh(new T.PlaneGeometry(.298,.085),new T.MeshBasicMaterial({map:mirrorTarget.texture,color:'#a5b4c1'}),[0,1.315,-.429],car);
    const uv=mirrorFace.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
  }
  function renderMirror(renderer:T.WebGLRenderer){
    if(!mirrorFace)return;
    const previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate;
    car.visible=false;renderer.shadowMap.autoUpdate=false;
    mirrorCamera.position.set(car.position.x-.35,1.29,car.position.z+.75);mirrorCamera.rotation.y=Math.PI;mirrorCamera.position.applyMatrix4(root.matrix);mirrorCamera.quaternion.premultiply(root.quaternion);
    try{renderer.setRenderTarget(mirrorTarget);renderer.render(root.parent instanceof T.Scene?root.parent:scene,mirrorCamera);}
    finally{renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadows;car.visible=true;}
  }
  const windshieldMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
    varying vec2 v;uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){vec2 grid=vec2(64.,31.);vec2 q=v*grid;vec2 id=floor(q);float h=hash(id);vec2 f=fract(q+vec2(h*.75,hash(id.yx)*.7+time*(.12+h*.32)))-.5;
      float drop=1.-smoothstep(.05,.16,length(f*vec2(1.4,.42)));float rim=(1.-smoothstep(.012,.047,abs(length(f*vec2(1.4,.42))-.135)));
      float sweep=.5-.5*cos(time*3.69599);vec2 p=vec2((v.x-.31)*1.98,v.y+.08);float angle=atan(p.x,p.y);float cleared=step(length(p),1.16)*step(abs(angle-(sweep*1.65-.79)),.16);
      vec2 p2=vec2((v.x-.7)*1.98,v.y+.08);cleared=max(cleared,step(length(p2),1.12)*step(abs(atan(p2.x,p2.y)-(sweep*1.65-.79)),.16));
      float a=(drop*.055+rim*.12)*step(.65,h)*(1.-cleared*.95);float edge=smoothstep(.28,.5,abs(v.x-.5));gl_FragColor=vec4(.38,.48,.55,a+edge*.055);
    }`});

  const glassPosition:number[]=[],glassUv:number[]=[],glassIndex:number[]=[];
  const pane=(u:number,v:number)=>{const [x,y,z]=sedanWindshieldPoint(u,v);return [-x,y+.001,-z-.002];};
  for(let j=0;j<=9;j++)for(let i=0;i<=18;i++){glassPosition.push(...pane(i/18,j/9));glassUv.push(i/18,j/9);}
  for(let j=0;j<9;j++)for(let i=0;i<18;i++){const a=j*19+i;glassIndex.push(a,a+20,a+1,a,a+19,a+20);}
  const glassGeometry=new T.BufferGeometry();glassGeometry.setAttribute('position',new T.Float32BufferAttribute(glassPosition,3));glassGeometry.setAttribute('uv',new T.Float32BufferAttribute(glassUv,2));glassGeometry.setIndex(glassIndex);windshieldMat.side=T.DoubleSide;
  const windshield=mesh(glassGeometry,windshieldMat,[0,0,0],car);windshield.castShadow=windshield.receiveShadow=false;windshield.name='memory-rain-glass';
  const fractures:number[]=[];
  for(let i=0;i<11;i++){const angle=i*2.399;let u=.34,v=.34;for(let j=1;j<=5;j++){const n=j/5,nu=.34+Math.cos(angle)*(.09+(i%3)*.025)*n,nv=.34+Math.sin(angle)*(.13+(i%4)*.018)*n;fractures.push(...pane(u,v),...pane(nu,nv));u=nu;v=nv;}}
  const cracks=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(fractures,3)),new T.LineBasicMaterial({color:'#b4c8cf',transparent:true,opacity:.55}));cracks.name='memory-cracked-glass';car.add(cracks);
  // Suction mount contacts the actual dashboard; a small cradle supports the phone.
  const phoneMount=new T.Group();phoneMount.visible=!escapeDrive;car.add(phoneMount);
  mesh(new T.CylinderGeometry(.034,.038,.008,20),rubber,[.12,.966,-.785],phoneMount);
  rod([.12,.969,-.785],[.12,1.025,-.75],.009,rubber,phoneMount);
  const distraction=box(.12,1.04,-.735,.075,.012,.145,rubber,phoneMount);distraction.rotation.x=.8;distraction.name='memory-distraction-phone';
  box(0,-.002,.058,.09,.022,.014,rubber,distraction);
  const message=label('새 메시지',.065,.119,[0,.007,0],distraction,'#1d343b','#a8c6c2');message.rotation.x=-Math.PI/2;
  const pedestrian=createPedestrian(root),victim=pedestrian.root,carryHand=victim.getObjectByName('pedestrian-carry-hand')!;
  const pants=new T.MeshStandardMaterial({color:'#30383d',roughness:.93});
  const bag=new T.Group();bag.name='memory-bag';root.add(bag);const bagLeather=surface('leather','#342d29',{roughness:.68});
  mesh(softBox(.26,.24,.095,.025),bagLeather,[0,0,0],bag);mesh(softBox(.235,.13,.012,.014),bagLeather,[0,.046,.049],bag);box(0,.005,.06,.034,.018,.008,steel,bag);
  for(const z of [-.035,.035])tube([[-.09,.1,z],[-.07,.22,z],[.07,.22,z],[.09,.1,z]],.008,bagLeather,bag);
  const phone=box(0,.045,0,.068,.012,.138,rubber);const phoneScreen=label('',.06,.1,[0,.052,0],phone);phoneScreen.rotation.x=-Math.PI/2;phoneScreen.position.set(0,.009,0);
  const driveDuration=opening.drive!.duration,impactDuration=opening.impact!.duration;
  const cruiseSpeed=8,braking=driveDuration-beats.brake,deceleration=1.8,impactSpeed=cruiseSpeed-braking*deceleration,stopZ=1.2-impactSpeed*.45;
  const looseShoe=createLeatherShoe();looseShoe.name='memory-lost-shoe';root.add(looseShoe);
  const passenger=escapeDrive?createGhost(car):null;
  const truck=escapeDrive?createDumpTruck():null;if(truck)root.add(truck.root);
  let shattered:T.LineSegments|undefined,revealLight:T.PointLight|undefined;
  if(passenger){
    passenger.name='finale-passenger';passenger.position.set(.42,.055,-.11);passenger.scale.setScalar(.9);passenger.rotation.y=Math.PI;
    // Use the exact shared character surfaces; cabin lights provide the scene contrast.
    revealLight=new T.PointLight('#c4cbb9',.92,2.1,2);revealLight.position.set(.69,1.39,-.57);car.add(revealLight);
    const fracture:number[]=[];
    for(let i=0;i<17;i++){const angle=i*2.399;let u=.51,v=.43;for(let j=1;j<=5;j++){const n=j/5,nu=.51+Math.cos(angle+Math.sin(i*13+j)*.07)*(.16+(i%4)*.05)*n,nv=.43+Math.sin(angle)*(.17+(i%3)*.08)*n;const point=(a:number,b:number)=>[(a*2-1)*T.MathUtils.lerp(.815,.658,b),.923+b*.48+.047*(1-(a*2-1)**2)*b,-.971+b*.592-.033*(1-(a*2-1)**2)*Math.sin(b*Math.PI)];fracture.push(...point(u,v),...point(nu,nv));u=nu;v=nv;}}
    shattered=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(fracture,3)),new T.LineBasicMaterial({color:'#d7e5e7',transparent:true,opacity:.88}));shattered.name='finale-shattered-windshield';car.add(shattered);shattered.visible=false;
    // The short covered driveway gives the departure a physical exit from the garage.
    for(const x of [-1.1,4.4])box(x,1.35,133.5,.22,2.7,31,concrete);
    box(1.65,2.77,133.5,5.72,.18,31,concrete);
    label('백로아파트  출구',2.7,.35,[1.65,2.48,118.1]);
    for(const z of [122,128,134,140,146]){box(1.65,2.65,z,1,.05,.18,warm);const light=new T.PointLight('#8fada8',4,7);light.position.set(1.65,2.5,z);root.add(light);}
  }
  const facePosition=new T.Vector3(),carriedBag=new T.Vector3(),contactBounds=new T.Box3(),driverGaze=new T.Vector3(.88889,1.29444,.14444);
  const exitPath=new T.CatmullRomCurve3([[-.38,1.22,-.24],[-.72,1.28,-.12],[-1.25,1.34,-.06],[-1.3,1.65,.43]].map(p=>new T.Vector3(...p as [number,number,number])));
  const inspectPath=new T.CatmullRomCurve3([[-1.3,1.65,.43],[-1.36,1.65,-.6],[-1.36,1.65,-2.15],[-1.23,1.65,-2.6],[-.55,1.65,-2.7],[.65,1.65,-2.7],[1.3,1.65,-2.6]].map(p=>new T.Vector3(...p as [number,number,number])));
  function aftermathView(t:number,camera:T.PerspectiveCamera,reduced:boolean){
    if(t<beats.doorOpen)return;
    const forward=camera.quaternion.clone(),leaving=T.MathUtils.smoothstep(t,beats.exit,beats.outside),walking=T.MathUtils.smoothstep(t,beats.walk,beats.inspect),returning=T.MathUtils.smoothstep(t,beats.return,beats.atDoor),boarding=T.MathUtils.smoothstep(t,beats.board,beats.seated);
    const eye=t<beats.outside?exitPath.getPointAt(leaving):t<beats.walk?exitPath.getPointAt(1):t<beats.return?inspectPath.getPointAt(walking):t<beats.atDoor?inspectPath.getPointAt(1-returning):t<beats.board?exitPath.getPointAt(1):exitPath.getPointAt(1-boarding);
    camera.position.copy(eye).add(car.position);
    if(!reduced&&((t>beats.walk&&t<beats.inspect)||(t>beats.return&&t<beats.atDoor))){const phase=t<beats.return?t-beats.walk:t-beats.return;camera.position.y+=Math.sin(phase*Math.PI*4)*.009*Math.sin(Math.PI*(t<beats.return?walking:returning));}
    const aim=(target:T.Vector3)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(camera.position,target.add(car.position),camera.up));
    const door=aim(new T.Vector3(-.86,1.05,-.05)),face=victim.getObjectByName('pedestrian-anatomical-head')!.localToWorld(new T.Vector3(0,.09,.11)).sub(car.position),look=aim(face);
    let rotation:T.Quaternion;
    if(t<beats.exit)rotation=forward.slerp(door,T.MathUtils.smoothstep(t,beats.doorOpen,beats.exit));
    else if(t<beats.walk)rotation=door;
    else if(t<beats.inspect){const next=inspectPath.getPointAt(Math.min(1,walking+.08));next.y=1.5;rotation=door.slerp(aim(next),T.MathUtils.smoothstep(t,beats.walk,beats.walk+.5)).slerp(look,T.MathUtils.smoothstep(t,beats.inspect-.8,beats.inspect));}
    else if(t<beats.return)rotation=look;
    else if(t<beats.atDoor){const next=inspectPath.getPointAt(Math.max(0,1-returning-.08));next.y=1.5;rotation=look.slerp(aim(next),T.MathUtils.smoothstep(t,beats.return,beats.return+.5)).slerp(door,T.MathUtils.smoothstep(t,beats.atDoor-.7,beats.atDoor));}
    else rotation=door.slerp(forward,T.MathUtils.smoothstep(t,beats.lock-.2,beats.lock+.5));
    camera.quaternion.copy(rotation);
  }
  function finalPose(stage:Stage,t:number,camera:T.PerspectiveCamera,reduced:boolean){
    const driving=stage==='car_escape',speaking=stage==='car_voice',crashing=stage==='car_crash';
    const beforeCrash=finale.car_escape!.duration+finale.car_voice!.duration,impactClock=beforeCrash+endingBeats.impact;
    const clock=driving?t:speaking?finale.car_escape!.duration+t:beforeCrash+Math.min(t,endingBeats.impact);
    const travel=(s:number)=>{const a=Math.min(s,(14-carExitSpeed)/4);return carExitSpeed*a+2*a*a+14*(s-a);};
    const distance=travel(clock),z=145-distance;
    const hit=crashing?Math.max(0,t-endingBeats.impact):0,crush=T.MathUtils.smoothstep(hit,0,.22),push=.44*T.MathUtils.smoothstep(hit,0,.38);
    car.position.set(1.65,0,z+push);car.rotation.set(.035*Math.sin(Math.min(1,hit/.32)*Math.PI)*Math.exp(-hit*2),0,0);
    const speed=crashing&&t>=endingBeats.impact?0:Math.min(14,carExitSpeed+clock*4);
    const jolt=!reduced&&hit>0?Math.exp(-hit*4.5)*Math.sin(hit*31):0;
    car.rotation.z=jolt*.018;
    const truckZ=145-travel(impactClock)-2.27-3.02-endingBeats.truckSpeed*(impactClock-clock)+push+crush*.7;
    truck!.root.position.set(T.MathUtils.lerp(-1.65,1.65,T.MathUtils.smoothstep(clock,beforeCrash-2.4,impactClock-.08)),0,truckZ);
    truck!.root.rotation.y=crashing&&t>=endingBeats.forwardEnd?0:.055*Math.sin(Math.PI*T.MathUtils.smoothstep(clock,beforeCrash-2.4,impactClock-.08));
    truck!.root.visible=clock>=finale.car_escape!.duration-1;truck!.pose(clock*endingBeats.truckSpeed+push);
    passenger!.visible=!driving&&hit<.8;
    const lean=driving?0:T.MathUtils.smoothstep(speaking?t:finale.car_voice!.duration,.55,1.75)*(1-T.MathUtils.smoothstep(hit,.03,.35));
    animateGhostPassenger(passenger!,clock,0,reduced,true,lean,driverGaze);
    passenger!.getObjectByName('ghost-blood-drips')!.visible=false;
    const passengerHead=passenger!.getObjectByName('ghost-head')!;
    camera.position.set(1.27,1.22-T.MathUtils.smoothstep(hit,.18,1.45)*.39,z+push-.24-T.MathUtils.smoothstep(hit,0,.16)*.14+jolt*.024);
    car.updateMatrixWorld(true);
    const face=passengerHead.localToWorld(facePosition.set(0,.13,.16));root.worldToLocal(face);face.sub(camera.position);
    const turn=driving?0:speaking?T.MathUtils.smoothstep(t,endingBeats.turn,endingBeats.reveal):1-T.MathUtils.smoothstep(t,endingBeats.forwardStart,endingBeats.forwardEnd);
    const collapse=T.MathUtils.smoothstep(hit,.12,1.25);
    camera.rotation.set(T.MathUtils.lerp(T.MathUtils.lerp(-.055,Math.atan2(face.y,Math.hypot(face.x,face.z)),turn),-.67,collapse)+jolt*.06,T.MathUtils.lerp(Math.atan2(-face.x,-face.z)*turn,-.08,collapse),reduced?0:T.MathUtils.smoothstep(hit,.25,1.45)*.27+jolt*.045,'YXZ');
    const steer=crashing?-.32*T.MathUtils.smoothstep(hit,0,.25):Math.sin(clock*.6)*.025;
    shattered!.visible=crush>0&&crush<.8;cracks.visible=false;revealLight!.intensity=driving?0:.92*(1-T.MathUtils.smoothstep(hit,.1,.8));(cracks.material as T.LineBasicMaterial).opacity=.2+crush*.7;
    victim.visible=false;bag.visible=false;phone.visible=false;looseShoe.visible=false;message.visible=false;
    drivingCar.pose(clock+18,0,true,steer,crush,speed);vehicleWreck!.pose(crush);
    windshieldMat.uniforms.time.value=clock;
    rain.position.set(0,-(clock*4.6)%6,0);
    streetLights.forEach((light,i)=>{const lampZ=-135+(Math.floor((z+135)/18)-2+i)*18;light.position.set(3.8,5.25,lampZ);light.target.position.set(1.7,0,lampZ);});
    return speed;
  }
  // The aftermath uses exactly the crashed car/street/truck rendered during play.
  // Freeze the impact state and observe it from outside, with room for the epilogue.
  function aftermathPose(camera:T.PerspectiveCamera,reduced:boolean){
    finalPose('car_crash',finale.car_crash!.duration,camera,reduced);
    const z=car.position.z;
    camera.position.set(car.position.x-3.8,2.1,z-2.2);
    camera.lookAt(car.position.x,.72,z-.7);
  }
  function pose(stage:Stage,time:number,camera:T.PerspectiveCamera,reduced:boolean){
    if(escapeDrive){const speed=stage==='ended'?(aftermathPose(camera,reduced),0):finalPose(stage,Math.max(0,time),camera,reduced);camera.position.applyMatrix4(root.matrix);camera.quaternion.premultiply(root.quaternion);camera.updateMatrixWorld();return speed;}
    const driving=stage==='drive',impact=stage==='impact',t=Math.max(0,time),hitTime=impact?t:stage==='flee'?impactDuration:0;
    const clock=driving?t:driveDuration+(impact?t:impactDuration+t);
    const brake=driving?Math.max(0,t-beats.brake):0;
    const speed=driving?cruiseSpeed-brake*deceleration:impact?Math.max(0,impactSpeed*(1-t/.9)):Math.min(10,t*2.1);
    const z=driving?1.2+cruiseSpeed*(driveDuration-t)-.5*deceleration*braking**2+.5*deceleration*brake**2:impact?1.2-impactSpeed*Math.min(t,.9)+impactSpeed/(2*.9)*Math.min(t,.9)**2:stopZ-(t<10/2.1?1.05*t*t:10*t-100/4.2);
    const x=driving?1.65+(reduced?0:Math.sin(t*.7)*.045*Math.sin(Math.PI*t/driveDuration)): 1.65;
    car.position.set(x,0,z-.68);
    streetLights.forEach((light,i)=>{const lampZ=-135+(Math.floor((z+135)/18)-2+i)*18;light.position.set(3.8,5.25,lampZ);light.target.position.set(1.7,0,lampZ);});
    const jolt=impact&&!reduced?Math.exp(-t*6)*Math.sin(t*29):0;
    camera.position.set(x-.38,1.22+(reduced?0:Math.sin(clock*15)*.003*speed/10)-jolt*.025,car.position.z-.24-jolt*.07);
    const glance=driving?T.MathUtils.smoothstep(t,beats.phoneBuzz,beats.phoneBuzz+.55)*(1-T.MathUtils.smoothstep(t,beats.lookUp,beats.lookUp+.65)):0;
    const lookAtMirror=stage==='flee'?T.MathUtils.smoothstep(t,.7,1.7)*(1-T.MathUtils.smoothstep(t,3,4.3)):0;
    camera.rotation.set(-.055-jolt*.09-glance*.54,driving?-glance*(camera.aspect<1?.95:.87):0,reduced?0:jolt*.018,'YXZ');
    message.visible=driving&&t>=beats.phoneBuzz;
    distraction.position.x=.12+(driving&&t>=beats.phoneBuzz&&t<beats.phoneBuzz+.6?Math.sin(t*90)*.003:0);

    const steer=driving?Math.sin(t*.7)*.027:impact?-.04*T.MathUtils.smoothstep(t,0,.35):-.04*(1-T.MathUtils.smoothstep(t,0,2));
    const door=impact?1.08*(T.MathUtils.smoothstep(t,beats.doorOpen,beats.exit)*(1-T.MathUtils.smoothstep(t,beats.outside+.1,beats.doorShut))+T.MathUtils.smoothstep(t,beats.reopen,beats.board-.1)*(1-T.MathUtils.smoothstep(t,beats.close,beats.lock-.2))):0;
    drivingCar.pose(clock,door,true,steer,driving?0:.12*T.MathUtils.smoothstep(hitTime,0,.25),speed);
    bottles?.pose(t,driving,reduced);
    if(memoryHands)memoryHands.visible=!impact||t<beats.exit-.15||t>beats.lock-.2;
    windshieldMat.uniforms.time.value=clock;cracks.visible=!driving;
    victim.visible=true;
    if(driving){victim.position.set(-4.7+T.MathUtils.clamp(t-(driveDuration-5),0,5)*1.37,0,-1.85);victim.rotation.set(0,Math.PI/2,0);}
    else{
      const wrap=T.MathUtils.smoothstep(hitTime,0,.44),slide=T.MathUtils.smoothstep(hitTime,.45,1.55);
      // The bumper folds the knees; the torso rolls across the bonnet edge and
      // slides down beside the stopped car. There is no airborne rigid-body arc.
      victim.position.set(2.15+.14*wrap+1.05*slide,-.12*wrap-.6*slide,-1.85-1.4*wrap-.55*slide);
      victim.rotation.set(0,Math.PI/2-.18*slide,0);
    }
    pedestrian.pose(driving?clock:driveDuration,driving?null:hitTime);
    if(!driving){contactBounds.setFromObject(victim,true);victim.position.y+=Math.max(0,.002-contactBounds.min.y);}
    victim.updateWorldMatrix(true,true);
    if(impact)aftermathView(t,camera,reduced);
    if(lookAtMirror>0&&mirrorFace){const forward=camera.quaternion.clone();car.updateMatrixWorld(true);camera.lookAt(mirrorFace.getWorldPosition(new T.Vector3()));const target=camera.quaternion.clone();camera.quaternion.copy(forward).slerp(target,lookAtMirror);}
    root.worldToLocal(carryHand.getWorldPosition(carriedBag));carriedBag.y-=.29;
    const bagSway=Math.sin((driving?clock:driveDuration)/.92*Math.PI*2)*.035;
    if(driving){bag.position.copy(carriedBag);bag.rotation.set(0,0,bagSway);phone.visible=false;}
    else{const scatter=T.MathUtils.smoothstep(hitTime,.15,1.15);bag.position.copy(carriedBag).lerp(new T.Vector3(2.79,.11,-3.59),scatter);bag.rotation.set(scatter*Math.PI/2,0,T.MathUtils.lerp(bagSway,.7,scatter));phone.visible=hitTime>.35;phone.position.set(3.1,.009,-3.9);phone.rotation.y=.8;}
    if(!driving){contactBounds.setFromObject(bag,true);const offset=.002-contactBounds.min.y;bag.position.y+=offset<0?offset*T.MathUtils.smoothstep(hitTime,.15,1.15):offset;}
    const detached=!driving&&hitTime>.25;victim.getObjectByName('memory-shoe')!.visible=!detached;looseShoe.visible=detached;
    const shoeFall=T.MathUtils.smoothstep(hitTime,.25,1.1);looseShoe.position.set(2.08+shoeFall*.55,Math.sin(shoeFall*Math.PI)*.28+.026-.024*shoeFall,-2.25-shoeFall*1.65);looseShoe.rotation.set(0,shoeFall*1.6,0);
    (phoneScreen.material as T.MeshBasicMaterial).color.setScalar(.025);
    rain.position.set(x,-(clock*4.6)%6,z);
    return speed;
  }
  // Batch stationary building details by material; moving props retain their own transforms.
  for(const owner of [root,root.getObjectByName('road-neighbourhood') as T.Group]){
  const batches=new Map<string,T.Mesh[]>();
  for(const child of [...owner.children])if(child instanceof T.Mesh&&child!==phone&&!Array.isArray(child.material)){
    const key=child.material.uuid+child.castShadow+child.receiveShadow+Boolean(child.geometry.index);
    const batch=batches.get(key)??[];batch.push(child);batches.set(key,batch);
  }
  for(const batch of batches.values())if(batch.length>1){
    const geometries=batch.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)continue;
    const merged=new T.Mesh(geometry,batch[0].material);merged.castShadow=batch[0].castShadow;merged.receiveShadow=batch[0].receiveShadow;owner.add(merged);
    batch.forEach(m=>{m.geometry.dispose();owner.remove(m);});
  }
  }
  return {root,pose,renderMirror,setDepartureFrame(frame:T.Matrix4){frame.decompose(root.position,root.quaternion,root.scale);root.updateMatrixWorld(true);},dispose(){vehicleWreck?.dispose();mirrorTarget.dispose();}};
}
