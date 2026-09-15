import * as T from 'three';
import {handSkinMaterial} from './materials.ts';

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
  const metal=new T.MeshStandardMaterial({color:'#242b2c',metalness:.72,roughness:.34});
  const rubber=new T.MeshStandardMaterial({color:'#11191b',roughness:.7});
  const silver=new T.MeshStandardMaterial({color:'#979e9a',metalness:.9,roughness:.24});
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
    const z=-.048+i*.028,r=.0125-i*.0008;
    curve(hand,[[.053,-.028,z],[.05,.006,z],[.026,.029,z],[-.006,.028,z],[-.03,.007,z],[-.026,-.015,z]],r,skin);
    ellipsoid(hand,[-.026,-.015,z],[r*.97,r,r],skin);
    const n=ellipsoid(hand,[-.035,-.011,z],[.0025,.007,.0085],nail);n.rotation.z=-.5;
    curve(hand,[[.027,.04,z-.006],[.025,.041,z],[.026,.04,z+.006]],.0006,crease);
  }
  curve(hand,[[.058,-.008,.076],[.057,.025,.058],[.032,.051,.027],[.008,.037,.004]],.015,skin);
  ellipsoid(hand,[.008,.037,.004],[.014,.014,.017],skin);
  const thumbNail=ellipsoid(hand,[.005,.047,.003],[.009,.0025,.011],nail);thumbNail.rotation.z=.2;
  const torch=new T.Group();torch.name='held-flashlight';root.add(torch);
  section(torch,[0,0,.105],[0,0,-.13],.029,.029,metal);
  for(let i=0;i<12;i++)section(torch,[0,0,.089-i*.012],[0,0,.086-i*.012],.0305,.0305,rubber);
  section(torch,[0,0,-.10],[0,0,-.17],.03,.045,metal);
  section(torch,[0,0,-.168],[0,0,-.184],.045,.045,rubber);
  section(torch,[0,0,-.184],[0,0,-.188],.037,.037,silver);
  const lens=new T.Mesh(new T.CircleGeometry(.032,32),new T.MeshStandardMaterial({color:'#a8b9b5',metalness:.2,roughness:.12,emissive:'#e5e5ce',emissiveIntensity:1,side:T.DoubleSide}));lens.position.z=-.19;torch.add(lens);
  ellipsoid(torch,[0,.031,.078],[.009,.0025,.015],rubber);
  curve(torch,[[.016,-.012,.103],[.06,-.095,.17],[.055,-.13,.145],[-.004,-.025,.1]],.0025,rubber);
  const beamOrigin=new T.Vector3();
  function update(p:{time:number;moving:boolean;running:boolean;crouched:boolean;torch:boolean;visible:boolean;reducedMotion:boolean;aspect:number;fov:number;obstructed?:boolean}){
    root.visible=p.visible;
    const phase=p.time*(p.running?12:8),motion=p.reducedMotion?0:p.moving?(p.running?.012:.004):.0015;
    root.position.set(.285*Math.min(1,p.aspect/(16/9))+Math.sin(phase)*motion,-.105+(p.torch?0:-.085)+(p.crouched?-.025:0)+(p.obstructed?-.13:0)+Math.cos(phase*2)*motion*.55,p.obstructed?-.34:-.56);
    root.rotation.set(p.torch?(p.obstructed?.32:-.065):.28,.065,Math.sin(phase)*motion*1.2);
    lens.material.emissiveIntensity=p.torch?.7:0;
    key.intensity=p.torch?1.7:.35;ambient.intensity=p.torch?1:.45;
    camera.aspect=p.aspect;camera.fov=p.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);lens.getWorldPosition(beamOrigin);
  }
  return {scene,camera,root,lens,beamOrigin,update};
}
