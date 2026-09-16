import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surface,boxUV,softBox,handSkinMaterial,upholstery,cutoutMaterial} from './materials.ts';
import {opening,type Stage} from './story.ts';

// All motion is sampled from simulation time: pause, skip and replay never leave a cutscene running.
export function buildRoad(scene:T.Scene){
  const root=new T.Group();root.name='accident-memory';scene.add(root);
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
  box(0,-.12,18,9,.24,360,asphalt);
  for(const x of [-5.2,5.2]){box(x,.06,18,1.3,.14,360,concrete);box(x<0?-4.57:4.57,.12,18,.14,.24,360,concrete);}
  for(let z=-150;z<190;z+=6)box(0,.008,z,.1,.012,2.8,paint);
  for(const x of [-4.15,4.15])box(x,.008,18,.09,.012,350,paint);
  for(let x=-3.7;x<4;x+=1.03)box(x,.016,-2,.58,.012,3.3,paint);
  box(-2.05,.016,1.5,3.8,.012,.32,paint);
  // Wet patches catch broken pools of streetlight without an expensive second scene render.
  const puddle=new T.MeshPhysicalMaterial({color:'#566570',metalness:.48,roughness:.07,transparent:true,opacity:.3,depthWrite:false});
  for(let i=0;i<38;i++){const p=mesh(new T.CircleGeometry(1,24),puddle,[Math.sin(i*19.3)*3.8,.024,-140+i*8.3]);p.castShadow=false;p.rotation.x=-Math.PI/2;p.scale.set(.22+(i%4)*.18,1.2+(i%5)*.3,1);}
  const glow=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){vec2 p=abs(v*2.-1.);float a=pow(1.-p.x,2.)*(1.-p.y)*(.6+.4*sin(v.y*190.));gl_FragColor=vec4(.51,.61,.66,a*.12);}'});
  for(let z=-135;z<170;z+=18){
    for(const side of [-1,1]){
      const height=5.5+((z+135)%36)*.19,x=side*8.3;
      box(x,height/2,z,5,height,14,wall);box(side*5.8,1.5,z, .09,3,14,concrete);
      for(let level=0;level<3;level++)for(let slot=0;slot<3;slot++){
        const yy=1.5+level*2.45,zz=z-4.5+slot*4;
        box(side*5.76,yy,zz,.06,1.24,1.5,(slot+level+z)%4===0?warm:darkGlass);
        box(side*5.71,yy,zz,.045,1.3,.055,steel);box(side*5.72,yy-.69,zz,.2,.08,1.68,concrete);
        if(level<2){box(side*5.51,yy-.23,zz+1.25,.4,.43,.62,concrete);for(let k=0;k<4;k++)box(side*5.29,yy-.38+k*.09,zz+1.25,.012,.025,.5,rubber);}
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
  const rainPoints=[];for(let i=0;i<600;i++){const x=Math.sin(i*73.1)*8,y=(i*.173)%7,z=-42+(i*7.31)%53;rainPoints.push(x,y,z,x-.025,y-.22,z);}
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
  root.addEventListener('removed',()=>mirrorTarget.dispose());
  function renderMirror(renderer:T.WebGLRenderer){
    const previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate;
    car.visible=false;renderer.shadowMap.autoUpdate=false;
    mirrorCamera.position.set(car.position.x-.35,1.35,car.position.z+.75);mirrorCamera.rotation.y=Math.PI;
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
  const distraction=box(-.64,.75,-.72,.12,.028,.22,rubber,car);distraction.rotation.z=.09;
  const message=label('수신 메시지',.1,.16,[0,.02,0],distraction,'#1d343b','#a8c6c2');message.rotation.x=-Math.PI/2;
  // The victim is still a living person here: natural proportions, a coat, shoes and a shoulder bag.
  const victim=new T.Group();victim.name='memory-pedestrian';root.add(victim);
  const coat=upholstery('#6c7674'),pants=new T.MeshStandardMaterial({color:'#30383d',roughness:.93});
  const torso=new T.Group();torso.position.y=.94;victim.add(torso);
  sphere([0,.24,0],[.195,.29,.115],coat,torso);
  const skirt=mesh(new T.CylinderGeometry(.155,.245,.57,28,6,true),coat,[0,-.02,0],torso);skirt.scale.z=.66;
  for(const x of [-.025,.025])box(x,.21,.119,.022,.36,.01,paint,torso);
  rod([0,.51,0],[0,.58,0],.053,skin,torso);
  const head=new T.Group();head.position.set(0,.66,0);torso.add(head);
  sphere([0,0,0],[.105,.144,.099],skin,head);
  sphere([0,.035,-.039],[.114,.147,.094],rubber,head);sphere([0,-.104,-.072],[.101,.19,.051],rubber,head);
  sphere([0,-.021,.095],[.018,.028,.024],skin,head);
  for(const side of [-1,1]){sphere([side*.038,.018,.087],[.016,.006,.009],rubber,head);sphere([side*.096,-.006,0],[.022,.036,.02],skin,head);}
  for(let i=0;i<18;i++){const a=i*Math.PI*2/18,x=Math.cos(a)*.108,z=Math.sin(a)*.089-.015;if(z>.045)continue;tube([[x*.8,.12,z],[x*1.08,-.03,z-.013],[x*.88,-.24,z-.023],[x*1.06,-.34-(i%3)*.04,z+.017]],.009,rubber,head);}
  for(const side of [-1,1]){const lapel=box(side*.07,.37,.103,.082,.17,.022,coat,torso);lapel.rotation.z=side*.35;}
  for(let i=0;i<4;i++)sphere([0,.28-i*.09,.124],[.009,.009,.004],rubber,torso);
  const limbs:T.Group[]=[];
  for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*.092,.82,0);victim.add(leg);limbs.push(leg);
    rod([0,0,0],[0,-.38,.015],.072,pants,leg,.055);rod([0,-.38,.015],[0,-.73,0],.055,pants,leg,.036);
    const foot=sphere([0,-.754,.048],[.067,.049,.135],rubber,leg);foot.name=side===1?'memory-shoe':'memory-other-shoe';
    const arm=new T.Group();arm.position.set(side*.198,.37,0);torso.add(arm);limbs.push(arm);
    rod([0,0,0],[side*.025,-.3,.015],.07,coat,arm,.048);rod([side*.025,-.3,.015],[side*.012,-.53,.062],.049,coat,arm,.032);
    sphere([side*.014,-.558,.066],[.033,.065,.028],skin,arm);
  }
  const bag=new T.Group();root.add(bag);box(0,0,0,.26,.24,.095,pants,bag);tube([[-.1,.1,0],[-.08,.25,0],[.1,.1,0]],.012,rubber,bag);
  const phone=box(0,.045,0,.068,.012,.138,rubber);const phoneScreen=label('03:17',.06,.1,[0,.052,0],phone);phoneScreen.rotation.x=-Math.PI/2;phoneScreen.position.set(0,.009,0);
  const driveDuration=opening.drive!.duration,impactDuration=opening.impact!.duration;
  const stopZ=-2.76;
  function pose(stage:Stage,time:number,camera:T.PerspectiveCamera,reduced:boolean){
    const driving=stage==='drive',impact=stage==='impact',t=Math.max(0,time),hitTime=impact?t:stage==='flee'?impactDuration:0;
    const clock=driving?t:driveDuration+(impact?t:impactDuration+t);
    const brake=driving?Math.max(0,t-10):0;
    const speed=driving?10-brake*.6:impact?Math.max(0,8.8-t*9.7778):Math.min(10,t*2.1);
    const z=driving?120-t*10+brake*brake*.3:impact?1.2-8.8*Math.min(t,.9)+4.888889*Math.min(t,.9)**2:stopZ-(t<10/2.1?1.05*t*t:10*t-100/4.2);
    const x=driving?1.65+(reduced?0:Math.sin(t*.7)*.045*Math.sin(Math.PI*t/driveDuration)): 1.65;
    car.position.set(x,0,z);
    streetLights.forEach((light,i)=>{const lampZ=-135+(Math.floor((z+135)/18)-2+i)*18;light.position.set(3.8,5.25,lampZ);light.target.position.set(1.7,0,lampZ);});
    const jolt=impact&&!reduced?Math.exp(-t*6)*Math.sin(t*29):0;
    camera.position.set(x-.35,1.23+(reduced?0:Math.sin(clock*15)*.003*speed/10)-jolt*.025,z+.06-jolt*.07);
    const glance=driving?T.MathUtils.smoothstep(t,4.2,5.6)*(1-T.MathUtils.smoothstep(t,9.1,10.8)):0;
    camera.rotation.set(-.055-jolt*.09-glance*.34,driving?-glance*.56:impact?T.MathUtils.smoothstep(t,3,5)*.045:stage==='flee'?.045*(1-T.MathUtils.smoothstep(t,0,1)):0,reduced?0:jolt*.018,'YXZ');
    wheel.rotation.z=driving?Math.sin(t*.7)*.027:impact?-.04*T.MathUtils.smoothstep(t,0,.35):-.04*(1-T.MathUtils.smoothstep(t,0,2));
    needles[0].rotation.z=2.3-speed/14*4.6;needles[1].rotation.z=2.3-(speed>0?.7+speed*.085:.5);
    wipers.forEach(w=>{w.rotation.z=.79-(.5-.5*Math.cos(clock*3.69599))*1.65;});
    windshieldMat.uniforms.time.value=clock;
    hood.rotation.x=-.035+(driving?0:.07*T.MathUtils.smoothstep(hitTime,0,.25));cracks.visible=!driving;
    victim.visible=true;
    if(driving){victim.position.set(-4.7+Math.max(0,t-7)*1.37,0,-1.85);victim.rotation.set(0,Math.PI/2,0);}
    else{const flight=T.MathUtils.smoothstep(hitTime,0,1.1);victim.position.set(2.15+flight*1.18,Math.sin(flight*Math.PI)*.68+flight*.28,-1.85-flight*3.9);victim.rotation.set(-flight*Math.PI/2,Math.PI/2-flight*.8,flight*.015,'YXZ');}
    torso.rotation.z=driving?Math.sin(clock*5)*.016:0;head.rotation.y=driving?T.MathUtils.smoothstep(t,10.7,11.8)*.75:0;
    limbs.forEach((limb,i)=>{limb.rotation.x=driving?Math.sin(clock*5+(i<2?0:Math.PI))*(i%2?.16:.3):Math.sin(Math.min(hitTime,1.2)*3+i)*.15;});
    if(driving){bag.position.set(victim.position.x+.04,.69,-1.59);bag.rotation.set(0,0,0);phone.visible=false;}
    else{const scatter=T.MathUtils.smoothstep(hitTime,.15,1.15);bag.position.set(2.19+scatter*.6,.69*(1-scatter)+scatter*.11,-1.59-scatter*2);bag.rotation.set(scatter*1.3,scatter*.7,scatter*.2);phone.visible=hitTime>.35;phone.position.set(3.1,.041,-3.9);phone.rotation.y=.8;}
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
  return {root,pose,renderMirror};
}
