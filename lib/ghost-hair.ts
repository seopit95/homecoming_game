import * as T from 'three';
import authored from './assets/ghost-strands.json' with {type:'json'};

type HairCache={valid:boolean;time:number;floor:number;length:number;open:number;support?: (x:number,z:number)=>number;cabin:boolean;relative:T.Matrix4;world:T.Matrix4;worldInverse:T.Matrix4;gravity:T.Vector3;bounds:T.Box3};
type StrandState={center:Float32Array;delta:Float32Array;posed:Float32Array;seeds:Float32Array;weights:Float32Array;radius:Float32Array;offsets:Uint32Array;cache:HairCache};
// Settling is synchronous. Reuse one scratch frame across prepared ghosts;
// each ghost owns only its deforming centerline/vertex buffers.
const fit=new T.Matrix4(),inverse=new T.Matrix4(),bodyInverse=new T.Matrix4(),linear=new T.Matrix3(),normalToLocal=new T.Matrix3();
const point=new T.Vector3(),previous=new T.Vector3(),direction=new T.Vector3(),tangent=new T.Vector3(),radial=new T.Vector3(),binormal=new T.Vector3(),vertex=new T.Vector3(),worldUp=new T.Vector3(0,1,0),headUp=new T.Vector3();
const gravity=new T.Quaternion(),bend=new T.Quaternion();
const relative=new T.Matrix4(),cachedToCurrent=new T.Matrix4(),localGravity=new T.Vector3(),probe=new T.Vector3();
const circle=Array.from({length:3},(_,i)=>new T.Vector2(Math.cos(i*Math.PI*2/3),Math.sin(i*Math.PI*2/3)));
let radiusScale=1;
// One CPU-only rest template. Every rig clones writable GPU/pose buffers;
// disposing or animating a room cannot change another room's apparition.
let restTemplate:{geometry:T.BufferGeometry;scalp:T.BufferGeometry;state:Omit<StrandState,'cache'>}|undefined;

function reusablePose(cache:HairCache,tails:T.Group,time:number,floor:number,length:number,open:number,cabin:boolean,heightAt?: (x:number,z:number)=>number){
  if(!cache.valid||time<cache.time||time-cache.time>=.05||floor!==cache.floor||length!==cache.length||open!==cache.open||heightAt!==cache.support||cabin!==cache.cabin)return false;
  const now=relative.elements,old=cache.relative.elements;let difference=0;
  for(let i=0;i<12;i++)difference=Math.max(difference,Math.abs(now[i]-old[i]));
  const movement=Math.hypot(now[12]-old[12],now[13]-old[13],now[14]-old[14]),turn=localGravity.distanceToSquared(cache.gravity);
  const same=difference<1e-9&&movement<1e-9&&turn<1e-18;
  // Moving the parent car/body carries the retained local geometry and its
  // roots with it. A fixed local pose needs only a bounded wind refresh.
  if(same&&(!heightAt||tails.matrixWorld.equals(cache.world)))return true;
  if(cabin||difference>.02||movement>.012||turn>.035**2)return false;
  // Reuse subtle head motion only if a conservative transformed box still
  // clears its support. Contact, rapid turns, morphs and rig changes refresh
  // immediately; the bound can reject reuse but cannot detach a skull root.
  cachedToCurrent.copy(tails.matrixWorld).multiply(cache.worldInverse);
  const {min,max}=cache.bounds;let lowest=Infinity,highestSupport=heightAt?-Infinity:floor;
  for(let corner=0;corner<8;corner++){
    probe.set(corner&1?max.x:min.x,corner&2?max.y:min.y,corner&4?max.z:min.z).applyMatrix4(cachedToCurrent);
    if(heightAt){
      const surface=heightAt(probe.x,probe.z),slope=Math.abs(heightAt(probe.x,probe.z+.06)-heightAt(probe.x,probe.z-.06))/.12;
      highestSupport=Math.max(highestSupport,surface+.09*T.MathUtils.smoothstep(slope,.035,.15));
    }else probe.applyMatrix4(bodyInverse);
    lowest=Math.min(lowest,probe.y);
  }
  return lowest>=highestSupport+.0005;
}

function writeStrands(geometry:T.BufferGeometry,state:StrandState){
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),p=positions.array as Float32Array,n=normals.array as Float32Array,im=inverse.elements,nm=normalToLocal.elements;
  for(const [start,count,release,,sides] of authored.strands)for(let j=0;j<count;j++){
    // A bound terminal ring uses its skull-side tangent. Shortening a loose
    // neighbour must not rotate the circular root cross-section off its fit.
    const k=start+j,lo=Math.max(start,k-1),hi=j===release?k:Math.min(start+count-1,k+1);
    point.fromArray(state.posed,k*3);tangent.fromArray(state.posed,hi*3).sub(previous.fromArray(state.posed,lo*3)).normalize();
    bend.identity().slerp(gravity,state.weights[k]);radial.fromArray(state.seeds,k*3).applyMatrix3(linear).applyQuaternion(bend);
    radial.addScaledVector(tangent,-radial.dot(tangent)).normalize();binormal.crossVectors(tangent,radial).normalize();
    // Object transforms are affine. Transform the two ring axes once, then
    // combine them for its three vertices instead of repeating both matrices.
    const rx=im[0]*radial.x+im[4]*radial.y+im[8]*radial.z,ry=im[1]*radial.x+im[5]*radial.y+im[9]*radial.z,rz=im[2]*radial.x+im[6]*radial.y+im[10]*radial.z;
    const bx=im[0]*binormal.x+im[4]*binormal.y+im[8]*binormal.z,by=im[1]*binormal.x+im[5]*binormal.y+im[9]*binormal.z,bz=im[2]*binormal.x+im[6]*binormal.y+im[10]*binormal.z;
    const nx=nm[0]*radial.x+nm[3]*radial.y+nm[6]*radial.z,ny=nm[1]*radial.x+nm[4]*radial.y+nm[7]*radial.z,nz=nm[2]*radial.x+nm[5]*radial.y+nm[8]*radial.z;
    const tx=nm[0]*binormal.x+nm[3]*binormal.y+nm[6]*binormal.z,ty=nm[1]*binormal.x+nm[4]*binormal.y+nm[7]*binormal.z,tz=nm[2]*binormal.x+nm[5]*binormal.y+nm[8]*binormal.z;
    point.applyMatrix4(inverse);const width=state.radius[k]*radiusScale;
    for(let side=0;side<sides;side++){
      const c=circle[side].x,s=circle[side].y,id=(state.offsets[k]+side)*3;
      p[id]=point.x+width*(rx*c+bx*s);p[id+1]=point.y+width*(ry*c+by*s);p[id+2]=point.z+width*(rz*c+bz*s);
      const x=nx*c+tx*s,y=ny*c+ty*s,z=nz*c+tz*s,inverseLength=1/(Math.sqrt(x*x+y*y+z*z)||1);
      n[id]=x*inverseLength;n[id+1]=y*inverseLength;n[id+2]=z*inverseLength;
    }
  }
  positions.needsUpdate=normals.needsUpdate=true;
}

export function createHair(head:T.Group){
  const hair=new T.Group();hair.name='ghost-scalp-hair';head.add(hair);
  const tails=new T.Group();tails.name='ghost-long-hair';head.add(tails);
  const scalpGeometry=restTemplate?.scalp.clone()??new T.BufferGeometry();if(!restTemplate){scalpGeometry.setAttribute('position',new T.Float32BufferAttribute(authored.scalp.position,3));scalpGeometry.setAttribute('normal',new T.Float32BufferAttribute(authored.scalp.normal,3));scalpGeometry.setIndex(authored.scalp.index);}
  const scalpMaterial=new T.MeshStandardMaterial({color:'#10110f',roughness:.9});scalpMaterial.name='surface-dark-scalp-underlay';
  const scalp=new T.Mesh(scalpGeometry,scalpMaterial);scalp.name='ghost-inner-crown';scalp.castShadow=scalp.receiveShadow=true;hair.add(scalp);

  const saved=restTemplate?.state,center=new Float32Array(saved?.center??authored.center),state:StrandState={center,delta:new Float32Array(saved?.delta??authored.skinDelta),posed:center.slice(),seeds:saved?saved.seeds.slice():new Float32Array(center.length),weights:saved?saved.weights.slice():new Float32Array(center.length/3),radius:new Float32Array(saved?.radius??authored.radius),offsets:saved?saved.offsets.slice():new Uint32Array(center.length/3),cache:{valid:false,time:0,floor:0,length:1,open:0,cabin:false,relative:new T.Matrix4(),world:new T.Matrix4(),worldInverse:new T.Matrix4(),gravity:new T.Vector3(),bounds:new T.Box3()}};
  const geometry=restTemplate?.geometry.clone()??new T.BufferGeometry();
  if(!restTemplate){
  const index:number[]=[],color=new Float32Array(authored.metadata.strandVertices*3);let cursor=0;
  for(const [start,count,release,shade,sides] of authored.strands){
    for(let j=0;j<count;j++){
      const k=start+j,lo=Math.max(start,k-1),hi=Math.min(start+count-1,k+1);state.offsets[k]=cursor;
      tangent.fromArray(center,hi*3).sub(previous.fromArray(center,lo*3)).normalize();radial.set(center[k*3],.035,center[k*3+2]-.02).normalize();
      radial.addScaledVector(tangent,-radial.dot(tangent)).normalize();radial.toArray(state.seeds,k*3);
      state.weights[k]=j>release?T.MathUtils.smoothstep((j-release)/(count-1-release),0,.24):0;
      for(let side=0;side<sides;side++){const offset=(cursor+side)*3,light=shade*(.91+.09*Math.sin(j*.8+start));color[offset]=light;color[offset+1]=light*.98;color[offset+2]=light*.94;}
      if(j<count-1)for(let side=0;side<sides;side++){const a=cursor+side,b=cursor+(side+1)%sides,c=a+sides,d=b+sides;index.push(a,b,c,b,d,c);}cursor+=sides;
    }
    const root=state.offsets[start],tip=state.offsets[start+count-1];for(let side=1;side<sides-1;side++)index.push(root,root+side+1,root+side,tip,tip+side,tip+side+1);
  }
  geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(authored.metadata.strandVertices*3),3));geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(authored.metadata.strandVertices*3),3));geometry.setAttribute('color',new T.BufferAttribute(color,3));geometry.setIndex(index);
  fit.identity();inverse.identity();linear.identity();normalToLocal.identity();gravity.identity();radiusScale=1;writeStrands(geometry,state);
  restTemplate={geometry:geometry.clone(),scalp:scalpGeometry.clone(),state:{center:state.center.slice(),delta:state.delta.slice(),posed:state.posed.slice(),seeds:state.seeds.slice(),weights:state.weights.slice(),radius:state.radius.slice(),offsets:state.offsets.slice()}};
  }
  // A conservative bound covers the rotating/gravity-settled lengths without
  // scanning the strand vertices or allocating a new sphere on every pose.
  geometry.boundingSphere=new T.Sphere(new T.Vector3(0,-.45,0),1.95);
  const material=new T.MeshPhysicalMaterial({color:'#1b1b19',vertexColors:true,roughness:.66,metalness:0,clearcoat:.025,clearcoatRoughness:.6});material.specularIntensity=.26;material.name='surface-fine-wet-hair-strands';
  const mesh=new T.Mesh(geometry,material);mesh.name='ghost-authored-long-hair';mesh.userData.strands=state;mesh.userData.rest=(geometry.getAttribute('position').array as Float32Array).slice();mesh.userData.face=head.getObjectByName('ghost-continuous-face');
  mesh.castShadow=mesh.receiveShadow=true;tails.add(mesh);return {hair,tails};
}

export function settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number){
  tails.updateWorldMatrix(true,false);
  const mesh=tails.children[0] as T.Mesh,state=mesh.userData.strands as StrandState,lengthScale=tails.scale.y,open=mesh.userData.face?.userData.openness??0,cabin=lengthScale<1&&figure.parent?.name==='memory-car';
  inverse.copy(tails.matrixWorld).invert();bodyInverse.copy(figure.matrixWorld).invert();
  relative.multiplyMatrices(bodyInverse,tails.matrixWorld);localGravity.copy(worldUp).transformDirection(inverse);localGravity.y*=lengthScale;localGravity.normalize();
  const cache=state.cache;if(reusablePose(cache,tails,time,floor,lengthScale,open,cabin,heightAt))return;
  // Passenger scale affects the free lengths. Cancel it at every bound root,
  // including the circular cross-section, to keep the true skull fit intact.
  fit.copy(tails.matrixWorld).scale(vertex.set(1,1/lengthScale,1));linear.setFromMatrix4(fit);normalToLocal.setFromMatrix4(tails.matrixWorld).transpose();
  headUp.set(0,1,0).transformDirection(fit);gravity.setFromUnitVectors(headUp,worldUp);
  const m=linear.elements;radiusScale=Math.sqrt((m[0]**2+m[1]**2+m[2]**2+m[3]**2+m[4]**2+m[5]**2+m[6]**2+m[7]**2+m[8]**2)/3);
  const f=figure.matrixWorld.elements,figureRadiusScale=radiusScale/Math.min(Math.hypot(f[0],f[1],f[2]),Math.hypot(f[4],f[5],f[6]),Math.hypot(f[8],f[9],f[10]));
  cache.bounds.makeEmpty();const low=cache.bounds.min,high=cache.bounds.max;
  for(const [start,count,release] of authored.strands)for(let j=0;j<count;j++){
    const k=start+j,offset=k*3;point.fromArray(state.center,offset);direction.fromArray(state.delta,offset);point.addScaledVector(direction,open);
    if(j<=release)point.applyMatrix4(fit);
    else{
      previous.fromArray(state.center,offset-3);direction.fromArray(state.delta,offset-3);previous.addScaledVector(direction,open);
      direction.copy(point).sub(previous).applyMatrix3(linear).multiplyScalar(lengthScale);bend.identity().slerp(gravity,state.weights[k]);direction.applyQuaternion(bend);
      point.fromArray(state.posed,offset-3).add(direction);
      const phase=start*.17;point.x+=Math.sin(time*.85+phase)*.00012*state.weights[k];point.z+=Math.sin(time*.7+phase)*.00009*state.weights[k];
    }
    if(heightAt){
      const padding=.002+state.radius[k]*radiusScale,surface=heightAt(point.x,point.z);let tread=0;
      // Navigation interpolates each flight. Its rendered tread can stand
      // 8.3cm above that slope; flat floors retain only true tube clearance.
      if(point.y<surface+padding+.09){const slope=Math.abs(heightAt(point.x,point.z+.06)-heightAt(point.x,point.z-.06))/.12;tread=.09*T.MathUtils.smoothstep(slope,.035,.15);}
      const support=surface+padding+tread;
      if(point.y<support){point.z-=(support-point.y)*.25;point.y=Math.max(support,heightAt(point.x,point.z)+padding+tread);}
    }else{
      point.applyMatrix4(bodyInverse);
      const padding=.002+state.radius[k]*figureRadiusScale;
      // A few lifted crown wisps bend under the actual closed car roof.
      // Standalone seated rigs have no ceiling; their skull roots stay fixed.
      if(cabin)point.y=Math.min(point.y,1.535-padding);
      // Actual closed-cabin fabric plane is z=.05196-.15114*y in this
      // figure frame. Keep the entire round bundle in front of it.
      if(lengthScale<1&&point.y<1.22){const side=T.MathUtils.smoothstep(Math.abs(point.x),.12,.18);point.z=Math.max(point.z,.057+side*.059-.15*Math.max(.6,point.y)+padding);}
      if(point.y<floor+padding){point.z-=(floor+padding-point.y)*.25;point.y=floor+padding;}
      point.applyMatrix4(figure.matrixWorld);
    }
    const r=state.radius[k]*radiusScale;low.x=Math.min(low.x,point.x-r);low.y=Math.min(low.y,point.y-r);low.z=Math.min(low.z,point.z-r);high.x=Math.max(high.x,point.x+r);high.y=Math.max(high.y,point.y+r);high.z=Math.max(high.z,point.z+r);
    point.toArray(state.posed,offset);
  }
  writeStrands(mesh.geometry,state);
  cache.valid=true;cache.time=time;cache.floor=floor;cache.length=lengthScale;cache.open=open;cache.support=heightAt;cache.cabin=cabin;cache.relative.copy(relative);cache.world.copy(tails.matrixWorld);cache.worldInverse.copy(inverse);cache.gravity.copy(localGravity);
}
