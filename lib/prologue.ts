import * as T from 'three';
import {createDrivingCar} from './driving-car.ts';
import {createPedestrian} from './pedestrian.ts';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surface,boxUV,softBox,handSkinMaterial,upholstery,cutoutMaterial} from './materials.ts';
import {createLeatherShoe} from './entry-props.ts';
import {createGhost,animateGhostPassenger} from './ghost.ts';
import {opening,openingTiming as beats,finale,finaleTiming as endingBeats,type Stage} from './story.ts';

// All motion is sampled from simulation time: pause, skip and replay never leave a cutscene running.
export function buildRoad(scene:T.Scene,escapeDrive=false){
  const root=new T.Group();root.name=escapeDrive?'escape-drive':'accident-memory';scene.add(root);
  const asphalt=surface('concrete','#454b50',{roughness:.28,bumpScale:.009});
  const concrete=surface('concrete','#747b7c'),wall=surface('wall','#95988d');
  const rubber=new T.MeshStandardMaterial({color:'#14191d',roughness:.86});
  const body=new T.MeshPhysicalMaterial({color:'#1b252c',roughness:.25,metalness:.7,clearcoat:.7});
  const steel=new T.MeshStandardMaterial({color:'#626f75',roughness:.3,metalness:.8});
  const paint=new T.MeshStandardMaterial({color:'#9faba5',roughness:.43});
  const warm=new T.MeshStandardMaterial({color:'#a29372',emissive:'#c7ad80',emissiveIntensity:.55,roughness:.6});
  const red=new T.MeshBasicMaterial({color:'#c44424'}),darkGlass=new T.MeshPhysicalMaterial({color:'#13232e',metalness:.4,roughness:.12});
  function mesh(g:T.BufferGeometry,m:T.Material,p:number[],parent:T.Object3D=root){const o=new T.Mesh(g,m);o.position.set(...p as [number,number,number]);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root){return mesh(boxUV(softBox(w,h,d),x,y,z),m,[x,y,z],parent);}
  function sphere(p:number[],scale:number[],m:T.Material,parent:T.Object3D=root){const o=mesh(new T.SphereGeometry(1,20,16),m,p,parent);o.scale.set(...scale as [number,number,number]);return o;}
  function rod(a:number[],b:number[],r:number,m:T.Material,parent:T.Object3D=root,r2=r){const av=new T.Vector3(...a as [number,number,number]),bv=new T.Vector3(...b as [number,number,number]);const o=mesh(new T.CylinderGeometry(r2,r,av.distanceTo(bv),12),m,av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;}
  function tube(points:number[][],r:number,m:T.Material,parent:T.Object3D=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),20,r,6,false),m,[0,0,0],parent);}
  function label(text:string,w:number,h:number,p:number[],parent:T.Object3D=root,background='#111c22',ink='#c6d0c4'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.fillStyle=ink;ctx.font='42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,69);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}),p,parent);
  }
  const roadCenter=escapeDrive?-6.5:18,roadLength=escapeDrive?311:360;
  box(0,-.12,roadCenter,9,.24,roadLength,asphalt);
  for(const x of [-5.2,5.2]){box(x,.06,roadCenter,1.3,.14,roadLength,concrete);box(x<0?-4.57:4.57,.12,roadCenter,.14,.24,roadLength,concrete);}
  for(let z=-150;z<(escapeDrive?148:190);z+=6)box(0,.008,z,.1,.012,2.8,paint);
  for(const x of [-4.15,4.15])box(x,.008,escapeDrive?-6.5:18,.09,.012,escapeDrive?311:350,paint);
  for(let x=-3.7;x<4;x+=1.03)box(x,.016,-2,.58,.012,3.3,paint);
  box(-2.05,.016,1.5,3.8,.012,.32,paint);
  // Wet patches catch broken pools of streetlight without an expensive second scene render.
  const puddle=new T.MeshPhysicalMaterial({color:'#566570',metalness:.48,roughness:.07,transparent:true,opacity:.3,depthWrite:false});
  for(let i=0;i<(escapeDrive?35:38);i++){const p=mesh(new T.CircleGeometry(1,24),puddle,[Math.sin(i*19.3)*3.8,.024,-140+i*8.3]);p.castShadow=false;p.rotation.x=-Math.PI/2;p.scale.set(.22+(i%4)*.18,1.2+(i%5)*.3,1);}
  const glow=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){vec2 p=abs(v*2.-1.);float a=pow(1.-p.x,2.)*(1.-p.y)*(.6+.4*sin(v.y*190.));gl_FragColor=vec4(.51,.61,.66,a*.12);}'});
  for(let z=-135;z<(escapeDrive?149:170);z+=18){
    for(const side of [-1,1]){
      const height=5.5+((z+135)%36)*.19,x=side*8.3;
      box(x,height/2,z,5,height,14,wall);box(side*5.8,1.5,z, .09,3,14,concrete);
      for(let level=0;1.5+level*2.45+.7<height;level++)for(let slot=0;slot<3;slot++){
        const yy=1.5+level*2.45,zz=z-4.5+slot*4;
        box(side*5.76,yy,zz,.06,1.24,1.5,(slot+level+z)%4===0?warm:darkGlass);
        box(side*5.71,yy,zz,.045,1.3,.055,steel);for(const edge of [-.77,.77])box(side*5.73,yy,zz+edge,.06,1.33,.045,steel);box(side*5.72,yy-.69,zz,.2,.08,1.68,concrete);
        if(level<2){for(const offset of [-.19,.19]){rod([side*5.76,yy-.46,zz+1.25+offset],[side*5.31,yy-.46,zz+1.25+offset],.016,steel);rod([side*5.76,yy-.64,zz+1.25+offset],[side*5.37,yy-.46,zz+1.25+offset],.012,steel);}box(side*5.51,yy-.23,zz+1.25,.4,.43,.62,concrete);for(let k=0;k<4;k++)box(side*5.29,yy-.38+k*.09,zz+1.25,.012,.025,.5,rubber);}
      }
      rod([side*5.52,.15,z+6.8],[side*5.52,height,z+6.8],.045,steel);
    }
    rod([4.95,.1,z],[4.95,5.5,z],.065,steel);rod([4.95,5.5,z],[3.8,5.5,z],.035,steel);box(3.8,5.42,z,.55,.1,.3,warm);

    const shine=mesh(new T.PlaneGeometry(1.3,8),glow,[2.6,.027,z+2]);shine.rotation.x=-Math.PI/2;shine.castShadow=false;
    for(let i=0;i<4;i++)box(4.32,.025,z+i*.13,.4,.025,.045,rubber);
  }
  const streetLights=Array.from({length:4},()=>{const light=new T.SpotLight('#b8c9d2',65,22,.9,.9,2);root.add(light,light.target);return light;});
  // The red traffic light and lit crossing establish what the driver failed to notice.
  rod([4.9,.1,-6],[4.9,5.9,-6],.095,steel);rod([4.9,5.7,-6],[-.1,5.7,-6],.065,steel);
  box(-.4,5.45,-6,1.18,.4,.28,rubber);
  for(let i=0;i<3;i++){const lens=mesh(new T.CircleGeometry(.12,24),i===2?red:darkGlass,[-.79+i*.38,5.45,-5.849]);box(-.79+i*.38,5.6,-5.79,.28,.075,.26,rubber);lens.castShadow=false;}
  const crossingLight=new T.SpotLight('#c4d1d6',70,22,.85,.85,2);crossingLight.position.set(3.5,6,-2);crossingLight.target.position.set(-1,0,-2);crossingLight.castShadow=true;crossingLight.shadow.mapSize.set(1024,1024);crossingLight.shadow.bias=-.0005;root.add(crossingLight,crossingLight.target);
  label('백로아파트  ｜  서행',2.4,.42,[3.4,3.6,-5.8]);
  box(4.92,1.18,7.4,.25,2.35,.25,concrete);box(5.35,.45,7.4,.8,.9,1.9,concrete);
  // A parked delivery van partially screens the pedestrian on the near pavement.
  box(3.38,.58,7.8,1.45,.9,3.5,body);box(3.38,1.4,8.1,1.4,1.08,2.3,concrete);box(3.38,1.57,9.27,1.23,.62,.035,darkGlass);
  for(const x of [2.67,4.09])for(const z of [6.8,8.8]){const tyre=mesh(new T.CylinderGeometry(.28,.28,.16,20),rubber,[x,.31,z]);tyre.rotation.z=Math.PI/2;}
  // Volumetric rain wraps around the camera; individual drops on the glass are a separate layer.
  const rainPoints=[];for(let i=0;i<600;i++){const x=Math.sin(i*73.1)*8,y=(i*.173)%7,z=escapeDrive?-150+(i*7.31)%267:-42+(i*7.31)%53;rainPoints.push(x,y,z,x-.025,y-.22,z);}
  const rain=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rainPoints,3)),new T.LineBasicMaterial({color:'#a4bcc9',transparent:true,opacity:.2,depthWrite:false}));root.add(rain);
  const car=new T.Group();car.name='memory-car';car.scale.x=-1;root.add(car);
  const dash=upholstery('#22292d');dash.bumpScale=.0006;
  box(0,.65,-1.1,1.91,.25,.71,dash,car);box(0,.51,-.78,1.89,.3,.34,rubber,car);
  const hood=box(0,.58,-2.16,1.83,.12,1.49,body,car);hood.name='memory-hood';hood.rotation.x=-.035;
  for(const x of [-.68,.68])box(x,.631,-2.18,.025,.018,1.25,steel,car);
  for(const side of [-1,1]){
    rod([side*.98,.63,-1.12],[side*.79,1.8,-1.83],.043,dash,car);
    box(side*.99,.49,-.02,.075,.77,2.4,dash,car);box(side*.92,.73,-.05,.12,.065,1.35,rubber,car);
    box(side*.918,.6,-.27,.018,.04,.21,steel,car);
    sphere([side*1.06,.87,-1.26],[.19,.1,.12],body,car);
    box(side*1.06,.88,-1.13,.29,.14,.018,darkGlass,car);
  }
  box(0,1.79,-1.74,1.65,.13,.28,dash,car);
  box(0,1.84,.04,2.06,.12,3.64,dash,car);
  // Analogue instrument faces, lit needles and centre clock are geometry / readable dashboard text.
  const steering=new T.Group();steering.position.set(.35,.86,-.59);steering.rotation.x=-.23;car.add(steering);
  const wheel=new T.Group();steering.add(wheel);
  mesh(new T.TorusGeometry(.222,.023,12,56),rubber,[0,0,0],wheel);
  mesh(new T.TorusGeometry(.206,.004,6,56),steel,[0,0,-.007],wheel);
  box(0,-.025,0,.145,.108,.068,dash,wheel);
  for(const x of [-.1,.1])rod([x*.5,-.01,0],[x*2.02,.02,0],.015,steel,wheel);
  rod([0,-.07,0],[0,-.21,0],.021,rubber,wheel);
  const needles:T.Group[]=[];
  box(.35,.74,-.998,.59,.24,.11,rubber,car);
  for(const x of [.2,.49]){
    const gauge=new T.Group();gauge.position.set(x,.782,-.927);car.add(gauge);
    mesh(new T.CircleGeometry(.114,36),new T.MeshBasicMaterial({color:'#0a1013'}),[0,0,0],gauge);
    mesh(new T.TorusGeometry(.117,.006,6,36),steel,[0,0,.003],gauge);
    for(let i=0;i<19;i++){const a=-2.3+i*4.6/18;rod([Math.sin(a)*.086,Math.cos(a)*.086,.005],[Math.sin(a)*.103,Math.cos(a)*.103,.005],i%3===0?.002:.001,new T.MeshBasicMaterial({color:'#95b4ad'}),gauge);}
    const needle=new T.Group();gauge.add(needle);rod([0,0,.01],[0,.085,.01],.002,red,needle);needles.push(needle);
  }
  label('03:17',.24,.063,[-.15,.696,-.875],car,'#101b20','#7fa9a4');
  for(const x of [-.71,-.38,.78]){box(x,.718,-.872,.24,.083,.026,rubber,car);for(let i=0;i<4;i++)box(x,.687+i*.017,-.855,.22,.005,.008,steel,car);}
  for(const x of [-.29,-.06]){const dial=mesh(new T.CylinderGeometry(.028,.028,.022,20),rubber,[x,.52,-.59],car);dial.rotation.x=Math.PI/2;}
  box(-.17,.53,-.6,.4,.12,.025,dash,car);
  // Both sleeves and articulated fingers share the in-game player's skin material.
  const skin=handSkinMaterial(),sleeve=upholstery('#292f32');
  for(const side of [-1,1]){
    const grip=new T.Group();grip.position.set(side*.205,.055,.009);wheel.add(grip);
    sphere([0,0,.026],[.039,.062,.027],skin,grip);
    rod([side*.005,-.027,.027],[side*.02,-.18,.23],.035,skin,grip,.053);
    rod([side*.02,-.17,.22],[side*.13,-.43,.55],.057,sleeve,grip,.086);
    for(let finger=0;finger<4;finger++){const y=.033-finger*.021;tube([[side*.025,y,.035],[side*.033,y,.001],[side*.007,y,-.029],[-side*.018,y,-.012]],.011-finger*.0005,skin,grip);}
    tube([[-side*.014,-.04,.03],[-side*.041,-.01,.045],[-side*.028,.018,.026]],.014,skin,grip);
  }
  // A small render target shows the actual road behind the car, including the crossing during departure.
  rod([-.24,1.7,-1.56],[-.24,1.52,-1.43],.014,rubber,car);
  box(-.24,1.51,-1.425,.42,.145,.035,rubber,car);
  const mirrorTarget=new T.WebGLRenderTarget(384,112);
  const mirrorCamera=new T.PerspectiveCamera(32,384/112,.1,75);
  const mirrorFace=mesh(new T.PlaneGeometry(.387,.115),new T.MeshBasicMaterial({map:mirrorTarget.texture,color:'#a5b4c1'}),[-.24,1.51,-1.403],car);
  const mirrorUv=mirrorFace.geometry.getAttribute('uv');for(let i=0;i<mirrorUv.count;i++)mirrorUv.setX(i,1-mirrorUv.getX(i));

  function renderMirror(renderer:T.WebGLRenderer){
    const previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate;
    car.visible=false;renderer.shadowMap.autoUpdate=false;
    mirrorCamera.position.set(car.position.x-.35,1.35,car.position.z+.75);mirrorCamera.rotation.y=Math.PI;mirrorCamera.position.applyMatrix4(root.matrix);mirrorCamera.quaternion.premultiply(root.quaternion);
    try{renderer.setRenderTarget(mirrorTarget);renderer.render(scene,mirrorCamera);}
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
  const windshield=mesh(new T.PlaneGeometry(1.94,1.16),windshieldMat,[0,1.215,-1.5],car);windshield.rotation.x=-.49;windshield.castShadow=false;windshield.name='memory-rain-glass';
  const wipers:T.Group[]=[];
  for(const x of [-.38,.38]){const pivot=new T.Group();pivot.position.set(x,.712,-1.222);pivot.rotation.x=-.49;car.add(pivot);const arm=new T.Group();pivot.add(arm);rod([0,0,0],[0,.45,0],.007,steel,arm);rod([0,.25,.005],[0,.86,.005],.012,rubber,arm);wipers.push(arm);}
  for(const x of [-.65,.65]){const lamp=new T.SpotLight('#e8dfc8',145,58,.47,.65,1.6);lamp.position.set(x,.61,-2.92);lamp.target.position.set(x,.15,-34);car.add(lamp,lamp.target);}
  const cabinLight=new T.PointLight('#9abbbb',.42,1.8,2);cabinLight.position.set(.35,.9,-.92);car.add(cabinLight);
  const fractures:number[]=[];
  for(let i=0;i<13;i++){const a=i*2.399,r=.15+(i%5)*.055;let px=-.05,py=.86;for(let j=1;j<5;j++){const nx=-.05+Math.cos(a+j*.06)*r*j/4,ny=.86+Math.sin(a)*r*j/4;fractures.push(px,py,-1.25-(py-.7)*.53,nx,ny,-1.25-(ny-.7)*.53);px=nx;py=ny;}}
  const cracks=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(fractures,3)),new T.LineBasicMaterial({color:'#b4c8cf',transparent:true,opacity:.66}));cracks.name='memory-cracked-glass';car.add(cracks);
  const cockpitMaterial=cutoutMaterial('cockpit');
  if(cockpitMaterial){
    for(const child of car.children)if(!(child instanceof T.Light)&&child.position.y<1.15&&child.position.z> -1.15)child.visible=false;
    cockpitMaterial.color.setScalar(.55);cockpitMaterial.depthWrite=true;
    const photo=mesh(new T.PlaneGeometry(3.2,2.1333),cockpitMaterial,[.35,1.13,-1.03],car);photo.name='photographic-cockpit';photo.scale.x=-1;photo.castShadow=false;photo.receiveShadow=false;steering.visible=false;
  }
  // Complete the passenger-side cabin behind the photographic dashboard cutout.
  // The glance must never reveal road markings through a missing floor or door.
  box(0,.18,.05,1.94,.1,2.65,dash,car);
  for(const side of [-1,1]){
    box(side*.96,.32,-.04,.12,.3,2.3,dash,car);
    box(side*.895,.44,-.1,.05,.07,.75,rubber,car);
    box(side*.886,.39,-.25,.022,.045,.18,steel,car);
  }
  box(-.54,.4,.32,.7,.19,.83,surface('leather','#9caaa9'),car);
  const seatBack=box(-.54,.89,.76,.7,.83,.19,surface('leather','#9caaa9'),car);seatBack.rotation.x=.13;
  // A short dashboard mount supports the phone in the driver's brief glance.
  mesh(new T.CylinderGeometry(.042,.048,.018,20),rubber,[-.26,.784,-1.08],car);
  rod([-.26,.793,-1.08],[-.26,.89,-1.015],.014,rubber,car);
  const distraction=box(-.26,.92,-1,.09,.016,.18,rubber,car);distraction.rotation.x=.85;
  const message=label('새 메시지',.078,.15,[0,.02,0],distraction,'#1d343b','#a8c6c2');message.rotation.x=-Math.PI/2;
  const pedestrian=createPedestrian(root),victim=pedestrian.root;
  const pants=new T.MeshStandardMaterial({color:'#30383d',roughness:.93});
  const bag=new T.Group();root.add(bag);const bagLeather=surface('leather','#342d29',{roughness:.68});
  mesh(softBox(.26,.24,.095,.025),bagLeather,[0,0,0],bag);mesh(softBox(.235,.13,.012,.014),bagLeather,[0,.046,.049],bag);box(0,.005,.06,.034,.018,.008,steel,bag);
  for(const z of [-.035,.035])tube([[-.09,.1,z],[-.07,.22,z],[.07,.22,z],[.09,.1,z]],.008,bagLeather,bag);
  const phone=box(0,.045,0,.068,.012,.138,rubber);const phoneScreen=label('',.06,.1,[0,.052,0],phone);phoneScreen.rotation.x=-Math.PI/2;phoneScreen.position.set(0,.009,0);
  const driveDuration=opening.drive!.duration,impactDuration=opening.impact!.duration;
  const cruiseSpeed=8,braking=driveDuration-beats.brake,deceleration=1.8,impactSpeed=cruiseSpeed-braking*deceleration,stopZ=1.2-impactSpeed*.45;
  const looseShoe=createLeatherShoe();looseShoe.name='memory-lost-shoe';root.add(looseShoe);
  const drivingCar=escapeDrive?createDrivingCar():null;
  if(drivingCar){for(const child of car.children)child.visible=false;car.scale.x=1;car.add(drivingCar.root);}
  const passenger=escapeDrive?createGhost(car):null;
  const barrier=escapeDrive?new T.Group():null;
  let shattered:T.LineSegments|undefined,revealLight:T.PointLight|undefined;
  if(passenger){
    passenger.name='finale-passenger';passenger.position.set(.38,.055,-.14);passenger.scale.setScalar(.9);passenger.rotation.y=Math.PI;
    revealLight=new T.PointLight('#a9bcc4',1.35,2.3,2);revealLight.position.set(.1,1.25,-.5);car.add(revealLight);
    const fracture:number[]=[];
    for(let i=0;i<17;i++){const angle=i*2.399;let u=.51,v=.43;for(let j=1;j<=5;j++){const n=j/5,nu=.51+Math.cos(angle+Math.sin(i*13+j)*.07)*(.16+(i%4)*.05)*n,nv=.43+Math.sin(angle)*(.17+(i%3)*.08)*n;const point=(a:number,b:number)=>[(a*2-1)*T.MathUtils.lerp(.815,.658,b),.923+b*.48+.047*(1-(a*2-1)**2)*b,-.971+b*.592-.033*(1-(a*2-1)**2)*Math.sin(b*Math.PI)];fracture.push(...point(u,v),...point(nu,nv));u=nu;v=nv;}}
    shattered=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(fracture,3)),new T.LineBasicMaterial({color:'#d7e5e7',transparent:true,opacity:.88}));shattered.name='finale-shattered-windshield';car.add(shattered);shattered.visible=false;
    // The short covered driveway gives the departure a physical exit from the garage.
    for(const x of [-1.1,4.4])box(x,1.35,133.5,.22,2.7,31,concrete);
    box(1.65,2.77,133.5,5.72,.18,31,concrete);
    label('백로아파트  출구',2.7,.35,[1.65,2.48,118.1]);
    for(const z of [122,128,134,140,146]){box(1.65,2.65,z,1,.05,.18,warm);const light=new T.PointLight('#8fada8',4,7);light.position.set(1.65,2.5,z);root.add(light);}
    barrier!.name='finale-barrier';barrier!.position.set(1.65,0,-50.45);root.add(barrier!);
    box(0,.65,0,4.4,1.3,.55,concrete,barrier!);
    for(let i=0;i<11;i++)box(-2+i*.4,.82,.287,.2,.32,.02,i%2?rubber:warm,barrier!);
    label('도로 통제',1.8,.26,[0,1.55,.1],barrier!);for(const x of [-.8,.8])rod([x,.5,0],[x,1.7,0],.025,steel,barrier!);
  }
  const facePosition=new T.Vector3();
  function finalPose(stage:Stage,t:number,camera:T.PerspectiveCamera,reduced:boolean){
    const driving=stage==='car_escape',speaking=stage==='car_voice',crashing=stage==='car_crash';
    const beforeCrash=finale.car_escape!.duration+finale.car_voice!.duration;
    const clock=driving?t:speaking?finale.car_escape!.duration+t:beforeCrash+Math.min(t,endingBeats.impact);
    const distance=clock<3.5?2*clock*clock:14*clock-24.5,z=145-distance;
    const hit=crashing?Math.max(0,t-endingBeats.impact):0,crush=T.MathUtils.smoothstep(hit,0,.18);
    car.position.set(1.65,0,z);car.rotation.set(0,0,0);
    const speed=crashing&&t>=endingBeats.impact?0:Math.min(14,clock*4);
    const jolt=!reduced&&hit>0?Math.exp(-hit*2.8)*Math.sin(hit*35):0;
    car.rotation.z=jolt*.035;
    passenger!.visible=!driving&&hit<.8;
    animateGhostPassenger(passenger!,clock,crashing?T.MathUtils.smoothstep(t,0,.25):0,reduced,true);
    const passengerHead=passenger!.getObjectByName('ghost-head')!;
    passengerHead.rotation.y*=-1; // The shared sedan has an unmirrored passenger side.
    camera.position.set(1.27,1.22-T.MathUtils.smoothstep(hit,.22,2.9)*.42,z-.24-T.MathUtils.smoothstep(hit,0,.15)*.14+jolt*.035);
    car.updateMatrixWorld(true);
    const face=passengerHead.localToWorld(facePosition.set(0,.13,.16));root.worldToLocal(face);face.sub(camera.position);
    const turn=driving?0:speaking?T.MathUtils.smoothstep(t,endingBeats.turn,endingBeats.reveal):1;
    const collapse=T.MathUtils.smoothstep(hit,.04,.45);
    camera.rotation.set(T.MathUtils.lerp(T.MathUtils.lerp(-.055,Math.atan2(face.y,Math.hypot(face.x,face.z)),turn),-.7,collapse)+jolt*.08,T.MathUtils.lerp(Math.atan2(-face.x,-face.z)*turn,-.12,collapse),reduced?0:T.MathUtils.smoothstep(hit,.3,2.7)*.42+jolt*.09,'YXZ');
    const steer=crashing?-.9*T.MathUtils.smoothstep(t,.15,.55):Math.sin(clock*.6)*.025;
    needles[0].rotation.z=2.3-speed/14*4.6;needles[1].rotation.z=2.3-(speed>0?.7+speed*.085:.1);
    wipers.forEach(w=>{w.rotation.z=.79-(.5-.5*Math.cos(clock*3.69599))*1.65;});windshieldMat.uniforms.time.value=clock;
    shattered!.visible=crush>0;cracks.visible=false;revealLight!.intensity=driving?0:1.35;(cracks.material as T.LineBasicMaterial).opacity=.2+crush*.7;
    victim.visible=false;bag.visible=false;phone.visible=false;looseShoe.visible=false;message.visible=false;
    drivingCar!.pose(clock+18,0,true,steer,crush);
    rain.position.set(0,-(clock*4.6)%6,0);
    streetLights.forEach((light,i)=>{const lampZ=-135+(Math.floor((z+135)/18)-2+i)*18;light.position.set(3.8,5.25,lampZ);light.target.position.set(1.7,0,lampZ);});
    return speed;
  }
  function pose(stage:Stage,time:number,camera:T.PerspectiveCamera,reduced:boolean){
    if(escapeDrive){const speed=finalPose(stage,Math.max(0,time),camera,reduced);camera.position.applyMatrix4(root.matrix);camera.quaternion.premultiply(root.quaternion);camera.updateMatrixWorld();return speed;}
    const driving=stage==='drive',impact=stage==='impact',t=Math.max(0,time),hitTime=impact?t:stage==='flee'?impactDuration:0;
    const clock=driving?t:driveDuration+(impact?t:impactDuration+t);
    const brake=driving?Math.max(0,t-beats.brake):0;
    const speed=driving?cruiseSpeed-brake*deceleration:impact?Math.max(0,impactSpeed*(1-t/.9)):Math.min(10,t*2.1);
    const z=driving?1.2+cruiseSpeed*(driveDuration-t)-.5*deceleration*braking**2+.5*deceleration*brake**2:impact?1.2-impactSpeed*Math.min(t,.9)+impactSpeed/(2*.9)*Math.min(t,.9)**2:stopZ-(t<10/2.1?1.05*t*t:10*t-100/4.2);
    const x=driving?1.65+(reduced?0:Math.sin(t*.7)*.045*Math.sin(Math.PI*t/driveDuration)): 1.65;
    car.position.set(x,0,z);
    streetLights.forEach((light,i)=>{const lampZ=-135+(Math.floor((z+135)/18)-2+i)*18;light.position.set(3.8,5.25,lampZ);light.target.position.set(1.7,0,lampZ);});
    const jolt=impact&&!reduced?Math.exp(-t*6)*Math.sin(t*29):0;
    camera.position.set(x-.35,1.23+(reduced?0:Math.sin(clock*15)*.003*speed/10)-jolt*.025,z+.06-jolt*.07);
    const glance=driving?T.MathUtils.smoothstep(t,beats.phoneBuzz,beats.phoneBuzz+.55)*(1-T.MathUtils.smoothstep(t,beats.lookUp,beats.lookUp+.65)):0;
    const lookAtVictim=impact?T.MathUtils.smoothstep(t,2.4,4.2)*(1-T.MathUtils.smoothstep(t,10.3,12.4)):0;
    const lookAtMirror=stage==='flee'?T.MathUtils.smoothstep(t,.7,1.7)*(1-T.MathUtils.smoothstep(t,3,4.3)):0;
    camera.rotation.set(-.055-jolt*.09-glance*.22-lookAtVictim*.12+lookAtMirror*.17,driving?-glance*.42:impact?-lookAtVictim*.43:lookAtMirror*-.25,reduced?0:jolt*.018,'YXZ');
    message.visible=driving&&t>=beats.phoneBuzz;
    distraction.position.x=-.26+(driving&&t>=beats.phoneBuzz&&t<beats.phoneBuzz+.6?Math.sin(t*90)*.003:0);

    wheel.rotation.z=driving?Math.sin(t*.7)*.027:impact?-.04*T.MathUtils.smoothstep(t,0,.35):-.04*(1-T.MathUtils.smoothstep(t,0,2));
    needles[0].rotation.z=2.3-speed/14*4.6;needles[1].rotation.z=2.3-(speed>0?.7+speed*.085:.5);
    wipers.forEach(w=>{w.rotation.z=.79-(.5-.5*Math.cos(clock*3.69599))*1.65;});
    windshieldMat.uniforms.time.value=clock;
    hood.rotation.x=-.035+(driving?0:.07*T.MathUtils.smoothstep(hitTime,0,.25));cracks.visible=!driving;
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
    if(!driving&&hitTime>.9){const contact=new T.Box3().setFromObject(victim,true);victim.position.y+=Math.max(0,.012-contact.min.y);}
    if(driving){bag.position.set(victim.position.x+.04,.69,-1.59);bag.rotation.set(0,0,0);phone.visible=false;}
    else{const scatter=T.MathUtils.smoothstep(hitTime,.15,1.15);bag.position.set(2.19+scatter*.6,.69*(1-scatter)+scatter*.11,-1.59-scatter*2);bag.rotation.set(scatter*1.3,scatter*.7,scatter*.2);phone.visible=hitTime>.35;phone.position.set(3.1,.009,-3.9);phone.rotation.y=.8;}
    const detached=!driving&&hitTime>.25;victim.getObjectByName('memory-shoe')!.visible=!detached;looseShoe.visible=detached;
    const shoeFall=T.MathUtils.smoothstep(hitTime,.25,1.1);looseShoe.position.set(2.08+shoeFall*.55,Math.sin(shoeFall*Math.PI)*.28+.026,-2.25-shoeFall*1.65);looseShoe.rotation.set(0,shoeFall*1.6,0);
    (phoneScreen.material as T.MeshBasicMaterial).color.setScalar(.025);
    rain.position.set(x,-(clock*4.6)%6,z);
    return speed;
  }
  // Batch stationary building details by material; moving props retain their own transforms.
  const batches=new Map<string,T.Mesh[]>();
  for(const child of [...root.children])if(child instanceof T.Mesh&&child!==phone&&!Array.isArray(child.material)){
    const key=child.material.uuid+child.castShadow+child.receiveShadow+Boolean(child.geometry.index);
    const batch=batches.get(key)??[];batch.push(child);batches.set(key,batch);
  }
  for(const batch of batches.values())if(batch.length>1){
    const geometries=batch.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)continue;
    const merged=new T.Mesh(geometry,batch[0].material);merged.castShadow=batch[0].castShadow;merged.receiveShadow=batch[0].receiveShadow;root.add(merged);
    batch.forEach(m=>{m.geometry.dispose();root.remove(m);});
  }
  return {root,pose,renderMirror,setDepartureFrame(frame:T.Matrix4){frame.decompose(root.position,root.quaternion,root.scale);root.updateMatrixWorld(true);},dispose(){mirrorTarget.dispose();}};
}
