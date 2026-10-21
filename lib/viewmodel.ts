import * as T from 'three';
import {handSkinMaterial,cutoutMaterial} from './materials.ts';
import {createSmartphone} from './smartphone.ts';

// A separate depth pass keeps the forearm out of walls without drawing through its own fingers.
export function createViewmodel(){
  const scene=new T.Scene();scene.name='first-person-hands';
  const camera=new T.PerspectiveCamera(72,16/9,.015,3);
  const root=new T.Group();scene.add(root);
  const ambient=new T.HemisphereLight('#c4d0db','#33251d',1);scene.add(ambient);
  const key=new T.DirectionalLight('#c9d8e3',2.1);key.position.set(-1,2,1);scene.add(key);
  const skin=handSkinMaterial();
  const crease=new T.MeshStandardMaterial({color:'#6d4a37',roughness:.9,transparent:true,opacity:.28});
  const nail=new T.MeshPhysicalMaterial({color:'#947d69',roughness:.55});
  const sleeve=new T.MeshStandardMaterial({color:'#272e30',roughness:.96});
  const rubber=new T.MeshStandardMaterial({color:'#11191b',roughness:.7});
  function ellipsoid(parent:T.Object3D,p:number[],scale:number[],material:T.Material){const m=new T.Mesh(new T.SphereGeometry(1,20,14),material);m.position.set(...p as [number,number,number]);m.scale.set(...scale as [number,number,number]);parent.add(m);return m;}
  function curve(parent:T.Object3D,points:number[][],radius:number,material:T.Material){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));const m=new T.Mesh(new T.TubeGeometry(path,20,radius,8,false),material);parent.add(m);return m;}
  function section(parent:T.Object3D,a:number[],b:number[],r1:number,r2:number,material:T.Material){
    const start=new T.Vector3(...a as [number,number,number]),end=new T.Vector3(...b as [number,number,number]);
    const m=new T.Mesh(new T.CylinderGeometry(r2,r1,start.distanceTo(end),24,4),material);
    m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());parent.add(m);return m;
  }
  const arm=new T.Group();arm.name='right-forearm';root.add(arm);
  section(arm,[.044,-.065,.07],[.085,-.18,.235],.029,.047,skin);
  ellipsoid(arm,[.049,-.075,.095],[.034,.04,.045],skin);
  section(arm,[.081,-.157,.202],[.21,-.44,.53],.052,.081,sleeve);
  const cuff=section(arm,[.076,-.145,.188],[.092,-.175,.225],.052,.054,sleeve);cuff.name='sleeve-cuff';
  for(let i=0;i<5;i++)curve(arm,[[.056+i*.009,-.145,.187],[.07+i*.009,-.162,.211],[.074+i*.009,-.172,.226]],.0007,rubber);
  curve(arm,[[.06,-.074,.117],[.075,-.09,.152],[.083,-.129,.19]],.0008,new T.MeshStandardMaterial({color:'#76735c',transparent:true,opacity:.2}));
  const hand=new T.Group();hand.name='right-hand';root.add(hand);
  ellipsoid(hand,[.035,-.033,.025],[.04,.035,.067],skin);
  ellipsoid(hand,[.045,-.019,.073],[.027,.034,.034],skin);
  for(let i=0;i<4;i++){
    const y=-.023+i*.020,r=.008-i*.0003;
    curve(hand,[[.052,y,.015],[.056,y,-.024],[.037,y,-.038],[-.014,y,-.039],[-.03,y,-.029]],r,skin);
    ellipsoid(hand,[-.03,y,-.026],[r,r,.009],skin);
    ellipsoid(hand,[-.03,y,-.017],[.006,.007,.0015],nail);
    curve(hand,[[.047,y-.004,-.017],[.049,y,-.019],[.047,y+.004,-.017]],.0005,crease);
  }
  curve(hand,[[.058,-.008,.076],[.057,.025,.058],[.032,.051,.027],[.008,.037,.004]],.015,skin);
  ellipsoid(hand,[.008,.037,.004],[.014,.014,.017],skin);
  const thumbNail=ellipsoid(hand,[.005,.047,.003],[.009,.0025,.011],nail);thumbNail.rotation.z=.2;
  const phone=createSmartphone(),torch=phone.root,lens=phone.led;torch.name='held-smartphone';torch.position.set(.012,.018,-.025);root.add(torch);
  const photographic=cutoutMaterial('hand-view');
  let handPlate:T.Mesh|undefined;
  if(photographic){arm.visible=false;hand.visible=false;torch.visible=false;torch.position.set(.045,-.047,.0485);torch.scale.setScalar(1.25);handPlate=new T.Mesh(new T.PlaneGeometry(.5,.5),photographic);handPlate.name='natural-hand-cutout';handPlate.position.set(.035,-.14,.04);root.add(handPlate);}
  const beamOrigin=new T.Vector3();
  function update(p:{time:number;stepPhase?:number;stepAmount?:number;strain?:number;calling?:boolean;moving:boolean;running:boolean;crouched:boolean;torch:boolean;visible:boolean;reducedMotion:boolean;aspect:number;fov:number;obstructed?:boolean}){
    root.visible=p.visible;
    const phase=p.stepPhase??p.time*(p.running?12:8),motion=p.reducedMotion?0:p.stepAmount!==undefined?p.stepAmount*.006:p.moving?(p.running?.012:.004):.0015;
    root.position.set(.285*Math.min(1,p.aspect/(16/9))+Math.sin(phase)*motion,-.105+(p.torch?0:-.085)+(p.crouched?-.025:0)+(p.obstructed?-.13:0)+Math.cos(phase*2)*motion*.55,p.obstructed?-.34:-.56);
    root.rotation.set(p.torch?(p.obstructed?.32:-.065):.28,.065,Math.sin(phase)*motion*1.2);
    const tremor=p.reducedMotion?0:T.MathUtils.smoothstep(p.strain??0,.6,1);
    const pulse=Math.sin(p.time*54.7)*.7+Math.sin(p.time*82.3)*.3;
    root.position.x+=pulse*tremor*.0018;root.position.y+=Math.sin(p.time*67.1)*tremor*.0012;
    root.rotation.x+=Math.sin(p.time*61.3)*tremor*.003;root.rotation.z+=pulse*tremor*.006;
    phone.setState(p.calling?'ringing':p.torch?'torch':'idle');
    lens.material.emissiveIntensity=p.torch?.7:0;
    if(photographic)photographic.color.setScalar(p.torch?.62:.22);
    key.intensity=p.torch?1.7:.35;ambient.intensity=p.torch?1:.45;
    camera.aspect=p.aspect;camera.fov=p.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);lens.getWorldPosition(beamOrigin);
  }
  return {scene,camera,root,lens,beamOrigin,update};
}
