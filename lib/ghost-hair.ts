import * as T from 'three';
import {ghostHairMaterials} from './materials.ts';
import authored from './assets/ghost-hair.json' with {type:'json'};

// UV copies share a surface, so they must also share its lighting normal.
const copies=new Map<string,number[]>();
for(let i=0;i<authored.position.length;i+=3){const key=authored.position.slice(i,i+3).join(',');if(!copies.has(key))copies.set(key,[]);copies.get(key)!.push(i/3);}
const seams=[...copies.values()].filter(group=>group.length>1);

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

export function createHair(head:T.Group){
  const hair=new T.Group();hair.name='ghost-scalp-hair';head.add(hair);
  const tails=new T.Group();tails.name='ghost-long-hair';head.add(tails);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(authored.position,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(authored.uv,2));geometry.setIndex(authored.index);
  geometry.setAttribute('uv1',new T.Float32BufferAttribute(authored.position.flatMap((y,i)=>i%3===1?[.5,i/3<authored.metadata.scalpVertices?T.MathUtils.clamp((y-authored.metadata.scalpFadeStart)/authored.metadata.scalpFade,0,1):1]:[]),2));
  for(const group of authored.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
  const material=ghostHairMaterials();
  const mesh=new T.Mesh(geometry,material);mesh.name='ghost-authored-long-hair';
  mesh.userData.rest=new Float32Array(authored.position);mesh.userData.anchors=new Float32Array(authored.anchor);mesh.userData.skinDelta=new Float32Array(authored.skinDelta);
  mesh.userData.face=head.getObjectByName('ghost-continuous-face');
  mesh.castShadow=mesh.receiveShadow=true;tails.add(mesh);return {hair,tails};
}
export function settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number){
  tails.updateWorldMatrix(true,false);
  const world=tails.matrixWorld,inverse=world.clone().invert(),bodyInverse=figure.matrixWorld.clone().invert(),mesh=tails.children[0] as T.Mesh,p=mesh.geometry.getAttribute('position');
  const rest=mesh.userData.rest as Float32Array,anchors=mesh.userData.anchors as Float32Array,delta=mesh.userData.skinDelta as Float32Array,lengthScale=tails.scale.y,open=mesh.userData.face?.userData.openness??0;
  const point=new T.Vector3(),anchor=new T.Vector3(),up=new T.Vector3(0,1,0).transformDirection(world);
  const gravity=new T.Quaternion().setFromUnitVectors(up,new T.Vector3(0,1,0)),bend=new T.Quaternion(),identity=new T.Quaternion();
  for(let i=0;i<p.count;i++){
    const weight=T.MathUtils.smoothstep(-.16-rest[i*3+1],0,.45),phase=rest[i*3]*11+rest[i*3+2]*8;
    point.fromArray(rest,i*3);anchor.fromArray(anchors,i*3);
    point.x+=delta[i*3]*open;point.y+=delta[i*3+1]*open;point.z+=delta[i*3+2]*open;
    // The passenger rig shortens only loose lengths. Compensate its group
    // scale at the roots so the complete authored scalp remains on the skull.
    point.y=(anchor.y+(point.y-anchor.y)*(1-weight*(1-lengthScale)))/lengthScale;anchor.y/=lengthScale;
    point.applyMatrix4(world);anchor.applyMatrix4(world);
    // Keep the complete skull/temple fit rigid; wet lengths bend below the
    // jaw around their own guide, so a tilted head cannot pull hair into itself.
    bend.copy(identity).slerp(gravity,weight);point.sub(anchor).applyQuaternion(bend).add(anchor);
    point.x+=Math.sin(time*.85+phase)*.003*weight;point.z+=Math.sin(time*.7+phase)*.002*weight;
    if(heightAt){
      const support=heightAt(figure.position.x,point.z)+.09;
      if(point.y<support){const drag=support-point.y;point.z-=drag*.25;point.y=Math.max(support,heightAt(figure.position.x,point.z)+.09)+.001;}
    }else{
      point.applyMatrix4(bodyInverse);
      // Seated hair drapes in front of the inclined backrest, then onto the
      // lap. Work in the figure frame so a transformed/rolling car stays valid.
      if(lengthScale<1&&point.y<1.22)point.z=Math.max(point.z,.036-.15*Math.max(.6,point.y));
      if(point.y<floor){point.z-=(floor-point.y)*.25;point.y=floor+.001;}
      point.applyMatrix4(figure.matrixWorld);
    }
    point.applyMatrix4(inverse);p.setXYZ(i,point.x,point.y,point.z);
  }
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();
  const normals=mesh.geometry.getAttribute('normal'),normal=new T.Vector3();
  for(const group of seams){normal.set(0,0,0);for(const i of group)normal.add(point.fromBufferAttribute(normals,i));normal.normalize();for(const i of group)normals.setXYZ(i,normal.x,normal.y,normal.z);}
  normals.needsUpdate=true;
  // Without vertex tangents the anisotropic highlight changes direction at
  // every triangle, making this smooth hair read as reflective metal plates.
  updateHairTangents(mesh.geometry);mesh.geometry.getAttribute('tangent').needsUpdate=true;mesh.geometry.computeBoundingSphere();
}
