import * as T from 'three';
import {softBox,surface} from './materials.ts';

// A loaded three-axle tipper, in metres; the cab faces +Z toward the sedan.
export function createDumpTruck(){
  const root=new T.Group();root.name='finale-dump-truck';
  const paint=new T.MeshPhysicalMaterial({color:'#8b9b91',metalness:.46,roughness:.43,clearcoat:.22});
  const bedPaint=surface('paintedMetal','#5a6864',{metalness:.6,roughness:.58,bumpScale:.0006});
  const steel=new T.MeshStandardMaterial({color:'#303938',metalness:.75,roughness:.45});
  const rubber=new T.MeshStandardMaterial({color:'#151a19',roughness:.93});
  const glass=new T.MeshPhysicalMaterial({color:'#12201e',metalness:.25,roughness:.16,clearcoat:.8});
  const lamp=new T.MeshPhysicalMaterial({color:'#e4e5ce',emissive:'#e7f2df',emissiveIntensity:3,roughness:.18});
  const amber=new T.MeshStandardMaterial({color:'#ba7139',emissive:'#9a4b15',emissiveIntensity:.6});
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root,r=.025){const mesh=new T.Mesh(softBox(w,h,d,r),m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function rod(name:string,a:number[],b:number[],r:number,m:T.Material,parent:T.Object3D=root){const from=new T.Vector3(...a as [number,number,number]),to=new T.Vector3(...b as [number,number,number]),mesh=new T.Mesh(new T.CylinderGeometry(r,r,from.distanceTo(to),10),m);mesh.name=name;mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const chassis=new T.Group();chassis.name='dump-chassis';root.add(chassis);
  for(const x of [-.73,.73])box('dump-frame-rail',x,.83,-.55,.19,.28,6.8,steel,chassis);
  for(const z of [-3.45,-2.4,-1.2,0,1.2,2.35])box('dump-frame-crossmember',0,.83,z,1.65,.17,.16,steel,chassis);
  box('dump-fuel-tank',-.91,.98,.13,.49,.55,.93,steel,chassis,.09);
  box('dump-battery-box',.93,1.01,-.05,.46,.46,.67,steel,chassis);
  const wheels:T.Group[]=[];
  for(const z of [1.83,-1.8,-2.96]){
    rod('dump-axle',[-1.08,.53,z],[1.08,.53,z],.095,steel,chassis);
    for(const side of [-1,1]){
      const wheel=new T.Group();wheel.name='dump-road-wheel';wheel.position.set(side*1.08,.53,z);root.add(wheel);wheels.push(wheel);
      const tyre=new T.Mesh(new T.CylinderGeometry(.53,.53,.33,24),rubber);tyre.rotation.z=Math.PI/2;wheel.add(tyre);
      const rim=new T.Mesh(new T.CylinderGeometry(.296,.296,.343,20),steel);rim.rotation.z=Math.PI/2;wheel.add(rim);
      const hub=new T.Mesh(new T.CylinderGeometry(.128,.128,.36,16),paint);hub.rotation.z=Math.PI/2;wheel.add(hub);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;box('dump-wheel-bolt',side*.184,Math.cos(a)*.19,Math.sin(a)*.19,.016,.026,.026,steel,wheel,.003);}
      if(z<0)box('dump-rear-mudguard',side*1.06,1.14,z,.45,.13,1.11,bedPaint);
    }
  }
  const cab=new T.Group();cab.name='dump-cab';root.add(cab);
  box('dump-cab-lower',0,1.24,1.91,2.39,.72,1.83,paint,cab,.1);
  box('dump-cab-back',0,2.05,1.05,2.39,1.59,.15,paint,cab,.07);
  box('dump-cab-roof',0,2.93,1.86,2.44,.19,1.95,paint,cab,.08);
  box('dump-windshield',0,2.31,2.752,2.12,.91,.035,glass,cab,.025);
  for(const x of [-1.135,0,1.135])box('dump-windshield-pillar',x,2.31,2.772,x===0?.054:.106,1.06,.08,paint,cab);
  for(const side of [-1,1]){
    box('dump-cab-door',side*1.17,1.96,1.83,.075,1.68,1.58,paint,cab,.045);
    box('dump-side-window',side*1.215,2.37,1.87,.018,.73,1.33,glass,cab,.025);
    box('dump-door-handle',side*1.222,1.88,1.29,.035,.045,.2,steel,cab,.008);
    box('dump-entry-step',side*1.14,.7,1.32,.39,.09,.73,steel,cab);
    rod('dump-mirror-arm',[side*1.13,2.63,2.51],[side*1.44,2.6,2.57],.025,steel,cab);
    box('dump-mirror',side*1.45,2.42,2.57,.15,.39,.15,rubber,cab,.035);
    box('dump-headlight',side*.91,1.03,2.854,.41,.22,.055,lamp,cab,.026);
    box('dump-turn-signal',side*1.17,1.05,2.84,.08,.18,.06,amber,cab,.014);
    const light=new T.SpotLight('#dce7dd',22,85,.38,.66,1.6);light.position.set(side*.91,1.04,2.91);light.target.position.set(side*1.1,.22,35);cab.add(light,light.target);
    box('dump-roof-marker',side*.91,3.039,2.55,.18,.055,.12,amber,cab,.016);
    rod('dump-wiper',[side*.59,1.9,2.79],[side*.47,2.38,2.79],.012,rubber,cab);
  }
  box('dump-grille-surround',0,1.27,2.85,1.23,.5,.055,steel,cab);
  for(let i=0;i<6;i++)box('dump-grille-slot',0,1.08+i*.073,2.887,1.12,.031,.015,rubber,cab,.006);
  box('dump-front-bumper',0,.66,2.91,2.44,.27,.22,steel,cab,.045);
  box('dump-front-plate',0,.655,3.024,.47,.12,.012,paint,cab,.006);
  const bed=new T.Group();bed.name='dump-tipper-bed';root.add(bed);
  box('dump-bed-floor',0,1.46,-1.45,2.38,.18,4.53,steel,bed);
  box('dump-bed-front',0,2.14,.74,2.49,1.36,.14,bedPaint,bed);
  box('dump-tailgate',0,2.1,-3.69,2.47,1.28,.13,bedPaint,bed);
  for(const side of [-1,1]){
    box('dump-bed-side',side*1.17,2.1,-1.45,.14,1.28,4.46,bedPaint,bed);
    box('dump-bed-top-rail',side*1.2,2.77,-1.45,.16,.13,4.55,steel,bed);
    for(const z of [.47,-.5,-1.48,-2.47,-3.47])box('dump-bed-rib',side*1.255,2.11,z,.075,1.24,.115,steel,bed);
  }
  box('dump-headboard',0,2.98,.78,2.5,.13,.74,bedPaint,bed);
  rod('dump-hydraulic-ram',[0,.99,-1.5],[0,1.45,-.7],.105,steel,chassis);
  for(const x of [-.85,.85])rod('dump-bed-hinge',[x,1.29,-3.62],[x,1.49,-3.62],.08,steel,chassis);
  return {root,pose(distance:number){for(const wheel of wheels)wheel.rotation.x=distance/.53;}};
}
