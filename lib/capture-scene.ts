import * as T from 'three';
export const captureDuration=1.25;

// Shared meshes retain the actual apparition's skin, jaw, teeth and hair.
// A separate close-up prevents level geometry from covering the capture.
export function createCaptureScene(source:T.Object3D){
 const scene=new T.Scene();scene.name='capture-face';scene.background=new T.Color('#000001');
 const head=source.clone(true);scene.add(head);
 const camera=new T.PerspectiveCamera(55,1,.004,3);
 const ambient=new T.HemisphereLight('#93a49c','#190305',.025);scene.add(ambient);
 const key=new T.DirectionalLight('#c8c5b6',.85);key.position.set(-.4,.5,1);scene.add(key);
 const rim=new T.DirectionalLight('#78413b',.2);rim.position.set(.5,.15,-.4);scene.add(rim);
 let bound:T.Object3D|undefined,pairs:[T.Object3D,T.Object3D][]=[];
 function bind(next:T.Object3D){
  if(bound===next)return;bound=next;const a:T.Object3D[]=[],b:T.Object3D[]=[];next.traverse(o=>a.push(o));head.traverse(o=>b.push(o));pairs=a.map((o,i)=>[o,b[i]]);
  for(const [from,to] of pairs)if(from instanceof T.Mesh&&to instanceof T.Mesh){to.geometry=from.geometry;to.material=from.material;}
 }
 function pose(next:T.Object3D,time:number,reduced:boolean,aspect:number){
  bind(next);for(const [from,to] of pairs){to.position.copy(from.position);to.quaternion.copy(from.quaternion);to.scale.copy(from.scale);to.visible=from.visible;}
  head.visible=true;head.position.set(0,0,0);
  const grab=T.MathUtils.smoothstep(time,.025,.24),bite=T.MathUtils.smoothstep(time,.24,.68),shake=reduced?0:Math.sin(time*39)*.0015*(1-bite);
  const light=1-T.MathUtils.smoothstep(time,.6,.9);key.intensity=.85*light;rim.intensity=.2*light;ambient.intensity=.025*light;
  camera.aspect=aspect;camera.position.set(shake,T.MathUtils.lerp(.04,-.054,bite),T.MathUtils.lerp(.38,.235,grab)-.09*bite);
  camera.lookAt(0,T.MathUtils.lerp(.03,-.054,bite),.055);camera.updateProjectionMatrix();camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 }
 pose(source,0,true,1);
 return {scene,camera,pose,prepare(renderer:T.WebGLRenderer){head.traverse(o=>o.visible=true);return renderer.compileAsync(scene,camera);}};
}
