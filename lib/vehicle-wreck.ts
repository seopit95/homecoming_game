import * as T from 'three';

// Hero coordinates: forward is -Z. Keep the rear and the tire contact patches
// intact; buckle the sheet metal rather than scaling the whole sedan.
export function createVehicleWreck(hero:T.Group){
 const root=new T.Group();root.name='hero-vehicle-wreck';root.visible=false;
 const point=new T.Vector3(),inverseHero=new T.Matrix4();hero.updateMatrixWorld(true);inverseHero.copy(hero.matrixWorld).invert();
 function crush(p:T.Vector3){
  const {x,y,z}=p;if(z>=.7)return p;
  const nose=T.MathUtils.smoothstep(-z,.86,2.22),upper=T.MathUtils.smoothstep(y,.91,1.4)*(1-T.MathUtils.smoothstep(z,-.4,.7));
  // The two front tires still support the car beneath the folded fenders.
  const wheel=Math.abs(x)>.65&&y<.69&&Math.abs(z+1.35)<.37;
  if(!wheel){
   p.z+=.94*nose+.27*upper;
   p.x=x*(1-.12*nose-.16*upper)+.045*nose*Math.sin(y*9-z*7);
   const bonnet=T.MathUtils.smoothstep(y,.67,.85),ridge=Math.exp(-(((z+1.5)/.24)**2));
   p.y+=nose*(-.115*(1-bonnet)+bonnet*(.14+.25*ridge))-.36*upper;
   p.y+=.045*nose*bonnet*Math.sin(x*13-z*11);
  }
  return p;
 }
 const parts:{mesh:T.Mesh,original:T.BufferGeometry,geometry:T.BufferGeometry,from:Float32Array,to:Float32Array,normalFrom:Float32Array,normalTo:Float32Array,visible:boolean}[]=[];
 hero.traverse(object=>{
  const mesh=object as T.Mesh;if(!mesh.isMesh||(mesh as T.InstancedMesh).isInstancedMesh)return;
  const original=mesh.geometry,positions=original.getAttribute('position');if(!positions)return;
  const toHero=new T.Matrix4().multiplyMatrices(inverseHero,mesh.matrixWorld),fromHero=toHero.clone().invert(),from=new Float32Array(positions.array),to=from.slice();let changed=false;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(toHero);const x=point.x,y=point.y,z=point.z;crush(point);
   if(Math.abs(point.x-x)+Math.abs(point.y-y)+Math.abs(point.z-z)<1e-8)continue;
   point.applyMatrix4(fromHero);to[i*3]=point.x;to[i*3+1]=point.y;to[i*3+2]=point.z;changed=true;
  }
  if(!changed)return;
  const geometry=original.clone(),attribute=geometry.getAttribute('position') as T.BufferAttribute;attribute.array.set(to);geometry.computeVertexNormals();
  const normalFrom=new Float32Array(original.getAttribute('normal').array),normalTo=new Float32Array(geometry.getAttribute('normal').array);
  geometry.computeBoundingBox();const bounds=geometry.boundingBox!.clone();attribute.array.set(from);geometry.computeBoundingBox();geometry.boundingBox!.union(bounds);geometry.boundingSphere=new T.Sphere();geometry.boundingBox!.getBoundingSphere(geometry.boundingSphere);
  parts.push({mesh,original,geometry,from,to,normalFrom,normalTo,visible:mesh.visible});
 });
 const dark=new T.MeshStandardMaterial({color:'#101613',roughness:.95}),metal=new T.MeshStandardMaterial({color:'#71807a',roughness:.72,metalness:.65}),glass=new T.MeshPhysicalMaterial({color:'#7b8c84',roughness:.32,metalness:.2,clearcoat:.5,side:T.DoubleSide});
 const fragments=new T.Group();fragments.name='wreck-ground-fragments';root.add(fragments);
 for(let i=0;i<7;i++){
  const shape=new T.Shape();shape.moveTo(-.05,-.026);shape.lineTo(.056,-.018);shape.lineTo(.031,.036);shape.lineTo(-.034,.021);shape.closePath();
  const shard=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:false}),i<4?glass:metal);shard.name=`wreck-fragment-${i}`;shard.rotation.set(-Math.PI/2,0,i*1.74);shard.scale.setScalar(.6+(i%3)*.22);shard.position.set((i%2?-1:1)*(.36+(i%4)*.17),0,-1.57-(i%3)*.29);shard.updateMatrixWorld(true);shard.position.y=.006-new T.Box3().setFromObject(shard).min.y;shard.castShadow=shard.receiveShadow=true;fragments.add(shard);
 }
 const lamp=new T.Group();lamp.name='wreck-broken-lamp';root.add(lamp);
 const socket=new T.Mesh(new T.BoxGeometry(.38,.112,.04),dark);lamp.add(socket);
 for(const [x,y,angle] of[[-.18,.045,.14],[.18,-.035,-.23],[.04,.044,-.16]]){const edge=new T.Mesh(new T.BoxGeometry(.13,.014,.018),metal);edge.position.set(x,y,-.025);edge.rotation.z=angle;lamp.add(edge);}
 const brokenLens=new T.Shape();brokenLens.moveTo(-.17,-.039);brokenLens.lineTo(-.17,.036);brokenLens.lineTo(-.045,.038);brokenLens.lineTo(-.073,.014);brokenLens.lineTo(-.025,-.008);brokenLens.lineTo(-.091,-.012);brokenLens.lineTo(-.066,-.04);brokenLens.closePath();const lens=new T.Mesh(new T.ShapeGeometry(brokenLens),glass);lens.position.z=-.027;lamp.add(lens);
 const lampFrom=new T.Vector3(-.588,.636,-2.187),lampTo=crush(lampFrom.clone());lampTo.z-=.037;
 hero.add(root);let previous=-1,disposed=false;
 function pose(progress:number){
  if(disposed)return;
  const amount=Number.isFinite(progress)?T.MathUtils.clamp(progress,0,1):0;
  if(amount===previous)return;previous=amount;root.visible=amount>0;
  for(const part of parts){
   if(!amount){part.mesh.geometry=part.original;part.mesh.visible=part.visible;continue;}
   part.mesh.geometry=part.geometry;const positions=part.geometry.getAttribute('position') as T.BufferAttribute,normals=part.geometry.getAttribute('normal') as T.BufferAttribute;
   for(let i=0;i<part.from.length;i++)positions.array[i]=part.from[i]+(part.to[i]-part.from[i])*amount;
   for(let i=0;i<part.normalFrom.length;i+=3){point.set(part.normalFrom[i]+(part.normalTo[i]-part.normalFrom[i])*amount,part.normalFrom[i+1]+(part.normalTo[i+1]-part.normalFrom[i+1])*amount,part.normalFrom[i+2]+(part.normalTo[i+2]-part.normalFrom[i+2])*amount).normalize();normals.setXYZ(i/3,point.x,point.y,point.z);}
   positions.needsUpdate=normals.needsUpdate=true;
  }
  lamp.position.lerpVectors(lampFrom,lampTo,amount);lamp.rotation.set(0,amount*.19,amount*-.15);
 }
 function dispose(){if(disposed)return;pose(0);for(const part of parts)part.geometry.dispose();disposed=true;}
 pose(0);return {root,pose,reset:()=>pose(0),dispose};
}
