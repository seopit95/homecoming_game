import * as T from 'three';
import {extremity} from './ghost-anatomy.ts';
import {handSkinMaterial,upholstery} from './materials.ts';

export function createDrivingHands(wheel:T.Object3D){
  const hands=new T.Group();hands.name='memory-driver-hands';hands.rotation.y=Math.PI;wheel.add(hands);
  const skin=handSkinMaterial(),sleeve=upholstery('#292f32');
  function segment(parent:T.Group,a:number[],b:number[],r0:number,r1:number,material:T.Material){
    const from=new T.Vector3(...a as [number,number,number]),to=new T.Vector3(...b as [number,number,number]);
    const mesh=new T.Mesh(new T.CylinderGeometry(r1,r0,from.distanceTo(to),20),material);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  }
  for(const side of [-1,1]){
    const grip=new T.Group();grip.position.set(side*.155,-.025,.078);grip.rotation.z=Math.PI+side*.18;hands.add(grip);
    const hand=extremity('hand',side,skin,false);hand.name=side<0?'memory-driver-hand-left':'memory-driver-hand-right';
    const p=hand.geometry.attributes.position;
    // Preserve the wrist/palm. Curl finger length around the rim rather than
    // turning the whole hand across an independently directed forearm.
    for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<-.055){const angle=Math.min(3,(-y-.055)/.032);p.setXYZ(i,p.getX(i),-.055-.032*Math.sin(angle),p.getZ(i)-.032*(1-Math.cos(angle)));}}
    hand.geometry.computeVertexNormals();hand.geometry.computeBoundingSphere();grip.add(hand);
    segment(grip,[0,.002,.004],[side*.009,.13,.045],.025,.037,skin);
    segment(grip,[side*.008,.113,.038],[side*.075,.34,.17],.042,.065,sleeve);
  }
  return hands;
}
