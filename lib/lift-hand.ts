import * as T from 'three';

// Fingers hook around the right leaf, towards the passenger side (+Z).
export function createLiftHand(){
  const root=new T.Group();root.name='lift-door-hand';root.visible=false;
  const skin=new T.MeshStandardMaterial({color:'#93988c',roughness:.56}),bruise=new T.MeshStandardMaterial({color:'#4b4446',roughness:.75}),nail=new T.MeshStandardMaterial({color:'#292b25',roughness:.37});
  for(let i=0;i<4;i++){
    const finger=new T.Group();finger.name=`lift-finger-${i}`;finger.position.y=(1.5-i)*.042;root.add(finger);
    const length=[.1,.145,.135,.095][i],points=[new T.Vector3(-.028,0,-.055),new T.Vector3(.014,0,.038),new T.Vector3(.035,-.003,length),new T.Vector3(.078,-.013,length+.008),new T.Vector3(.105,-.023,length-.028)];
    const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),22,.014-i*.0007,9,false),skin);mesh.castShadow=true;finger.add(mesh);
    for(const p of points.slice(1,4)){const knuckle=new T.Mesh(new T.SphereGeometry(.016-i*.0005,12,8),skin);knuckle.position.copy(p);knuckle.scale.set(1,.85,1);finger.add(knuckle);}
    const tip=new T.Mesh(new T.SphereGeometry(.013,12,8),nail);tip.scale.set(.95,.26,1.4);tip.position.copy(points[4]).add(new T.Vector3(0,.012,.006));finger.add(tip);
    for(let j=0;j<2;j++){const crease=new T.Mesh(new T.TorusGeometry(.014,.0012,4,12,Math.PI),bruise);crease.position.set(.036,-.004,length-.014-j*.006);crease.rotation.y=Math.PI/2;finger.add(crease);}
  }
  const light=new T.PointLight('#b1bbb3',.18,.7,2);light.position.set(0,.12,.25);root.add(light);return root;
}
export function animateLiftHand(root:T.Object3D|undefined,seconds:number){
  if(!root)return;
  root.visible=seconds>=10&&seconds<13.8;
  if(!root.visible)return;
  const reach=T.MathUtils.smoothstep(seconds,10,10.7)*(1-T.MathUtils.smoothstep(seconds,13,13.8));
  root.scale.z=Math.max(.01,reach);
  for(let i=0;i<4;i++){const finger=root.children[i];finger.rotation.x=Math.sin(seconds*3+i*.65)*.09*reach;finger.rotation.z=Math.sin(seconds*2.3+i)*.035;}
}
