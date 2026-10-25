import * as T from 'three';
import {extremity} from './ghost-anatomy.ts';
import {handSkinMaterial} from './materials.ts';
import {residentialRoute as R} from './residential-route.ts';

// Real world-space palms brace on the raised sill, then withdraw after the body
// clears it. The existing phone viewmodel is hidden only during this movement.
export function createLiftClimb(parent:T.Group){
 const root=new T.Group();root.name='lift-climb-arms';root.visible=false;parent.add(root);
 const skin=handSkinMaterial(),cloth=new T.MeshStandardMaterial({color:'#252a2d',roughness:.94});
 const limbs=[-1,1].map(side=>{
  const hand=extremity('hand',side,skin,false);hand.name=side<0?'climb-hand-left':'climb-hand-right';root.add(hand);
  hand.rotation.set(Math.PI/2,0,side*.08);
  const forearm=new T.Mesh(new T.CylinderGeometry(.027,.046,1,20),skin),sleeve=new T.Mesh(new T.CylinderGeometry(.048,.069,1,20),cloth);root.add(forearm,sleeve);return{side,hand,forearm,sleeve};
 });
 const origin=new T.Vector3(),elbow=new T.Vector3(),shoulder=new T.Vector3(),end=new T.Vector3(),axis=new T.Vector3(0,1,0);let captured=false,startYaw=0,startPitch=0;
 function bone(mesh:T.Mesh,a:T.Vector3,b:T.Vector3){end.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=end.length();mesh.quaternion.setFromUnitVectors(axis,end.normalize());}
 function reset(){captured=false;root.visible=false;}
 function pose(t:number,camera:T.PerspectiveCamera,_reduced:boolean){
  if(!captured){origin.copy(camera.position);startYaw=camera.rotation.y;startPitch=camera.rotation.x;captured=true;}
  const pull=T.MathUtils.smoothstep(t,.45,1.65),stand=T.MathUtils.smoothstep(t,1.6,R.climbSeconds),withdraw=T.MathUtils.smoothstep(t,1.5,2.25);
  camera.position.set(T.MathUtils.lerp(origin.x,0,pull),T.MathUtils.lerp(origin.y,2,T.MathUtils.smoothstep(t,.4,1.45))+.6*stand,T.MathUtils.lerp(origin.z,-2.4,pull));
  camera.rotation.set(T.MathUtils.lerp(startPitch,-.45,T.MathUtils.smoothstep(t,0,.45))*(1-stand),T.MathUtils.lerp(startYaw,0,T.MathUtils.smoothstep(t,0,.5)),0,'YXZ');
  root.visible=t>.08&&t<R.climbSeconds;
  for(const limb of limbs){
   limb.hand.position.set(limb.side*.29,T.MathUtils.lerp(1.02,camera.position.y-.58,withdraw),T.MathUtils.lerp(-1.54,camera.position.z-.26,withdraw));
   elbow.set(limb.side*.32,camera.position.y-.5,camera.position.z+.06);shoulder.set(limb.side*.2,camera.position.y-.3,camera.position.z+.3);
   bone(limb.forearm,limb.hand.position,elbow);bone(limb.sleeve,elbow,shoulder);
  }
  camera.updateMatrixWorld();return t>=R.climbSeconds;
 }
 return{root,pose,reset};
}
