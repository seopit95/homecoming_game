import * as T from 'three';
import authored from './assets/ghost-strands.json' with {type:'json'};

// Match Three.js per-vertex tangent accumulation (MIT; docs/third-party-tangent-work.md) without allocating two
// Vector3 objects per vertex on every animation frame. Float64 keeps its math.
// Calls are synchronous, so prepared models share one largest-mesh workspace.
let tangentWork={a:new Float64Array(0),b:new Float64Array(0),seen:new Uint8Array(0)};
const v0=new T.Vector3(),e1=new T.Vector3(),e2=new T.Vector3(),uv0=new T.Vector2(),uv1=new T.Vector2(),uv2=new T.Vector2(),sdir=new T.Vector3(),tdir=new T.Vector3(),n=new T.Vector3(),n2=new T.Vector3(),t=new T.Vector3(),orthogonal=new T.Vector3(),cross=new T.Vector3();
export function updateHairTangents(geometry:T.BufferGeometry){
  const index=geometry.index!,p=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv') as T.BufferAttribute;
  if(tangentWork.seen.length<p.count)tangentWork={a:new Float64Array(p.count*3),b:new Float64Array(p.count*3),seen:new Uint8Array(p.count)};
  const {a,b,seen}=tangentWork;a.fill(0);b.fill(0);seen.fill(0);
  if(!geometry.hasAttribute('tangent'))geometry.setAttribute('tangent',new T.BufferAttribute(new Float32Array(p.count*4),4));
  const tangent=geometry.getAttribute('tangent'),groups=geometry.groups.length?geometry.groups:[{start:0,count:index.count}];
  function add(i:number){const o=i*3;a[o]+=sdir.x;a[o+1]+=sdir.y;a[o+2]+=sdir.z;b[o]+=tdir.x;b[o+1]+=tdir.y;b[o+2]+=tdir.z;}
  for(const group of groups)for(let j=group.start;j<group.start+group.count;j+=3){
    const i0=index.getX(j),i1=index.getX(j+1),i2=index.getX(j+2);
    v0.fromBufferAttribute(p,i0);e1.fromBufferAttribute(p,i1).sub(v0);e2.fromBufferAttribute(p,i2).sub(v0);
    uv0.fromBufferAttribute(uv,i0);uv1.fromBufferAttribute(uv,i1).sub(uv0);uv2.fromBufferAttribute(uv,i2).sub(uv0);
    const r=1/(uv1.x*uv2.y-uv2.x*uv1.y);if(!Number.isFinite(r))continue;
    sdir.copy(e1).multiplyScalar(uv2.y).addScaledVector(e2,-uv1.y).multiplyScalar(r);tdir.copy(e2).multiplyScalar(uv1.x).addScaledVector(e1,-uv2.x).multiplyScalar(r);
    add(i0);add(i1);add(i2);
  }
  for(const group of groups)for(let j=group.start;j<group.start+group.count;j++){
    const i=index.getX(j);if(seen[i])continue;seen[i]=1;n.fromBufferAttribute(normal,i);n2.copy(n);t.fromArray(a,i*3);
    orthogonal.copy(t).sub(n.multiplyScalar(n.dot(t))).normalize();cross.crossVectors(n2,t);tdir.fromArray(b,i*3);
    tangent.setXYZW(i,orthogonal.x,orthogonal.y,orthogonal.z,cross.dot(tdir)<0?-1:1);
  }
}

type StrandState={center:Float32Array;delta:Float32Array;posed:Float32Array;seeds:Float32Array;weights:Float32Array;radius:Float32Array;offsets:Uint32Array};
// Settling is synchronous. Reuse one scratch frame across prepared ghosts;
// each ghost owns only its deforming centerline/vertex buffers.
const fit=new T.Matrix4(),inverse=new T.Matrix4(),bodyInverse=new T.Matrix4(),linear=new T.Matrix3(),normalToLocal=new T.Matrix3();
const point=new T.Vector3(),previous=new T.Vector3(),direction=new T.Vector3(),tangent=new T.Vector3(),radial=new T.Vector3(),binormal=new T.Vector3(),vertex=new T.Vector3(),surfaceNormal=new T.Vector3(),worldUp=new T.Vector3(0,1,0),headUp=new T.Vector3();
const gravity=new T.Quaternion(),bend=new T.Quaternion();
const circles={3:Array.from({length:3},(_,i)=>new T.Vector2(Math.cos(i*Math.PI*2/3),Math.sin(i*Math.PI*2/3))),7:Array.from({length:7},(_,i)=>new T.Vector2(Math.cos(i*Math.PI*2/7),Math.sin(i*Math.PI*2/7)))};
let radiusScale=1;

function writeStrands(geometry:T.BufferGeometry,state:StrandState){
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
  for(const [start,count,,,sides] of authored.strands)for(let j=0;j<count;j++){
    const k=start+j,lo=Math.max(start,k-1),hi=Math.min(start+count-1,k+1);
    point.fromArray(state.posed,k*3);tangent.fromArray(state.posed,hi*3).sub(previous.fromArray(state.posed,lo*3)).normalize();
    bend.identity().slerp(gravity,state.weights[k]);radial.fromArray(state.seeds,k*3).applyMatrix3(linear).applyQuaternion(bend);
    radial.addScaledVector(tangent,-radial.dot(tangent)).normalize();binormal.crossVectors(tangent,radial).normalize();
    const circle=circles[sides as 3|7];
    for(let side=0;side<sides;side++){
      surfaceNormal.copy(radial).multiplyScalar(circle[side].x).addScaledVector(binormal,circle[side].y);
      vertex.copy(point).addScaledVector(surfaceNormal,state.radius[k]*radiusScale).applyMatrix4(inverse);
      const id=state.offsets[k]+side;positions.setXYZ(id,vertex.x,vertex.y,vertex.z);
      surfaceNormal.applyMatrix3(normalToLocal).normalize();normals.setXYZ(id,surfaceNormal.x,surfaceNormal.y,surfaceNormal.z);
    }
  }
  positions.needsUpdate=normals.needsUpdate=true;
}

export function createHair(head:T.Group){
  const hair=new T.Group();hair.name='ghost-scalp-hair';head.add(hair);
  const tails=new T.Group();tails.name='ghost-long-hair';head.add(tails);
  const scalpGeometry=new T.BufferGeometry();scalpGeometry.setAttribute('position',new T.Float32BufferAttribute(authored.scalp.position,3));scalpGeometry.setAttribute('normal',new T.Float32BufferAttribute(authored.scalp.normal,3));scalpGeometry.setIndex(authored.scalp.index);
  const scalpMaterial=new T.MeshStandardMaterial({color:'#0e1010',roughness:.76});scalpMaterial.name='surface-dark-scalp-underlay';
  const scalp=new T.Mesh(scalpGeometry,scalpMaterial);scalp.name='ghost-inner-crown';scalp.castShadow=scalp.receiveShadow=true;hair.add(scalp);

  const center=new Float32Array(authored.center),state:StrandState={center,delta:new Float32Array(authored.skinDelta),posed:center.slice(),seeds:new Float32Array(center.length),weights:new Float32Array(center.length/3),radius:new Float32Array(authored.radius),offsets:new Uint32Array(center.length/3)};
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
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(authored.metadata.strandVertices*3),3));geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(authored.metadata.strandVertices*3),3));geometry.setAttribute('color',new T.BufferAttribute(color,3));geometry.setIndex(index);
  fit.identity();inverse.identity();linear.identity();normalToLocal.identity();gravity.identity();radiusScale=1;writeStrands(geometry,state);
  // A conservative bound covers the rotating/gravity-settled lengths without
  // scanning the strand vertices or allocating a new sphere on every pose.
  geometry.boundingSphere=new T.Sphere(new T.Vector3(0,-.45,0),1.95);
  const material=new T.MeshPhysicalMaterial({color:'#202221',vertexColors:true,roughness:.76,metalness:0,clearcoat:.02,clearcoatRoughness:.7});material.specularIntensity=.22;material.name='surface-fine-wet-hair-strands';
  const mesh=new T.Mesh(geometry,material);mesh.name='ghost-authored-long-hair';mesh.userData.strands=state;mesh.userData.rest=(geometry.getAttribute('position').array as Float32Array).slice();mesh.userData.face=head.getObjectByName('ghost-continuous-face');
  mesh.castShadow=mesh.receiveShadow=true;tails.add(mesh);return {hair,tails};
}

export function settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number){
  tails.updateWorldMatrix(true,false);
  const mesh=tails.children[0] as T.Mesh,state=mesh.userData.strands as StrandState,lengthScale=tails.scale.y,open=mesh.userData.face?.userData.openness??0,cabin=lengthScale<1&&figure.parent?.name==='memory-car';
  inverse.copy(tails.matrixWorld).invert();bodyInverse.copy(figure.matrixWorld).invert();
  // Passenger scale affects the free lengths. Cancel it at every bound root,
  // including the circular cross-section, to keep the true skull fit intact.
  fit.copy(tails.matrixWorld).scale(vertex.set(1,1/lengthScale,1));linear.setFromMatrix4(fit);normalToLocal.setFromMatrix4(tails.matrixWorld).transpose();
  headUp.set(0,1,0).transformDirection(fit);gravity.setFromUnitVectors(headUp,worldUp);
  const m=linear.elements;radiusScale=Math.sqrt((m[0]**2+m[1]**2+m[2]**2+m[3]**2+m[4]**2+m[5]**2+m[6]**2+m[7]**2+m[8]**2)/3);
  const f=figure.matrixWorld.elements,figureRadiusScale=radiusScale/Math.min(Math.hypot(f[0],f[1],f[2]),Math.hypot(f[4],f[5],f[6]),Math.hypot(f[8],f[9],f[10]));
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
    point.toArray(state.posed,offset);
  }
  writeStrands(mesh.geometry,state);
}
