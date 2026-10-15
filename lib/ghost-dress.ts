import * as T from 'three';
import asset from './assets/ghost-dress.json' with {type:'json'};
// The neckline, bodice and sleeves are one authored surface. UV seams are
// duplicated only for sampling; their positions and skin weights are identical.
export function createDress(torso:T.Group,cloth:T.Material){
  const g=new T.BufferGeometry(),colors=asset.position.flatMap((_,i)=>i%3?[]:[.94,.96,1]);
  g.setAttribute('position',new T.Float32BufferAttribute(asset.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(asset.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(asset.index);g.computeVertexNormals();
  const gown=new T.Mesh(g,cloth);gown.name='ghost-wet-dress';gown.castShadow=true;gown.receiveShadow=true;torso.add(gown);return {gown,hem:new Float32Array(asset.position)};
}
export function createClavicle(torso:T.Group,skin:T.Material){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(asset.chest.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(asset.chest.uv,2));g.setIndex(asset.chest.index);g.computeVertexNormals();
  const chest=new T.Mesh(g,skin);chest.name='ghost-clavicle-skin';chest.castShadow=true;chest.receiveShadow=true;chest.userData.rest=new Float32Array(asset.chest.position);torso.add(chest);return chest;
}
export function poseClavicle(chest:T.Mesh,neck:T.Mesh){
  const p=chest.geometry.getAttribute('position'),rest=chest.userData.rest as Float32Array,inverse=neck.quaternion.clone().invert(),v=new T.Vector3(),target=new T.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromArray(rest,i*3);const weight=T.MathUtils.smoothstep(v.y,.355,.392);
    if(weight>0){
      target.copy(v).sub(neck.position).applyQuaternion(inverse).divide(neck.scale);
      const y=T.MathUtils.clamp(target.y,-.95,.95),angle=Math.atan2(target.z,target.x),radius=Math.sqrt(1-y*y)*.97;
      target.set(Math.cos(angle)*radius,y*.97,Math.sin(angle)*radius).multiply(neck.scale).applyQuaternion(neck.quaternion).add(neck.position);v.lerp(target,weight);
    }
    p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;chest.geometry.computeVertexNormals();chest.geometry.computeBoundingSphere();
}
export function poseDress(gown:T.Mesh,rest:Float32Array,torso:T.Group,knees:T.Group[],crawl:number,seated=false,tuck=0,sideClearance=0,frontClearance=0){
  gown.userData.seated=seated;
  const p=gown.geometry.getAttribute('position'),q=torso.quaternion,inverse=q.clone().invert(),v=new T.Vector3(),left=new T.Vector3(),right=new T.Vector3(),center=new T.Vector3(),tangent=new T.Vector3(),otherTangent=new T.Vector3();
  const levels=[.41,.29,.055,-.23,-.68,-1.055];
  // The skirt follows the same hips and knees as the skin. Separate side guides
  // let fabric bridge a stride instead of letting a thigh emerge through it.
  const spines=knees.map(knee=>{
    const hip=knee.parent!,joint=knee.position.clone().applyQuaternion(hip.quaternion).add(hip.position),ankle=new T.Vector3(0,-.42,0).applyQuaternion(knee.quaternion).add(knee.position).applyQuaternion(hip.quaternion).add(hip.position);
    const hem=ankle.clone();hem.y=seated?.29:.055;hem.z=seated?Math.max(ankle.z,joint.z+.06):ankle.z-crawl*.13*(1-tuck);
    return new T.CatmullRomCurve3([
      new T.Vector3(0,.41,0).applyQuaternion(q).add(torso.position),new T.Vector3(0,.29,0).applyQuaternion(q).add(torso.position),
      new T.Vector3(0,.055,0).applyQuaternion(q).add(torso.position),hip.position.clone().add(new T.Vector3(0,.025,-crawl*tuck*.06)),joint,hem
    ]);
  });
  for(let i=0;i<p.count;i++){
    const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],lower=T.MathUtils.smoothstep(-y,.1,1.055);
    let row=0;while(row<levels.length-2&&y<levels[row+1])row++;
    const u=T.MathUtils.clamp((levels[row]-y)/(levels[row]-levels[row+1]),0,1),along=(row+u)/(levels.length-1);
    spines[0].getPoint(along,left);spines[1].getPoint(along,right);center.copy(left).lerp(right,.5);
    spines[0].getTangent(along,tangent);tangent.add(spines[1].getTangent(along,otherTangent)).normalize();
    const hipAllowance=Math.exp(-(((y+.23)/.24)**2));
    const side=T.MathUtils.clamp(.5+x/.38,0,1),shift=left.lerp(right,side).sub(center),thickness=1-lower*(crawl*(.25+tuck*.3)+frontClearance*.12)+hipAllowance*.06;
    // Gather loose fabric below the knees; keep the thigh envelope intact.
    const gather=T.MathUtils.smoothstep(-y,.82,1.055)*sideClearance*.45;
    v.copy(center);v.x+=x*(1+lower*(.25-tuck*.6)-gather+.18*hipAllowance);v.y+=shift.y+z*tangent.z*thickness;v.z+=shift.z-z*tangent.y*thickness;
    v.y=Math.max(seated?.25:.022,v.y);v.sub(torso.position).applyQuaternion(inverse);p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;gown.geometry.computeVertexNormals();gown.geometry.boundingSphere??=new T.Sphere(new T.Vector3(0,-.4,0),1.8);
}

export function poseDressArms(gown:T.Mesh,rest:Float32Array,arms:T.Group[]){
  const p=gown.geometry.getAttribute('position'),v=new T.Vector3(),base=new T.Vector3(),point=new T.Vector3(),pivot=new T.Vector3(),q=new T.Quaternion();
  const deltas=arms.map((arm,i)=>{
    const bind=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3((i===0?-1:1)*.68,-.733212,0).normalize());
    return arm.quaternion.clone().multiply(bind.invert());
  });
  const shifts=arms.map((arm,i)=>arm.position.clone().sub(new T.Vector3((i===0?-1:1)*.18,.308,0)));
  for(let i=0;i<p.count;i++){
    const w=asset.armWeight[i];if(w<=0)continue;
    base.fromArray(rest,i*3);const side=base.x<0?0:1;point.fromBufferAttribute(p,i).sub(base);
    pivot.set((side===0?-1:1)*.18,.308,0);q.identity().slerp(deltas[side],w);
    v.copy(base).sub(pivot).applyQuaternion(q).add(pivot).addScaledVector(shifts[side],w).addScaledVector(point,1-w);p.setXYZ(i,v.x,v.y,v.z);
  }
  if(gown.userData.seated){
    const torso=gown.parent!,inverse=torso.quaternion.clone().invert();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyQuaternion(torso.quaternion).add(torso.position);
      // The cushion and inclined side bolsters meet the cloth in the figure
      // frame, including during the car's crash roll. Loose hem hangs forward.
      const side=T.MathUtils.smoothstep(Math.abs(v.x),.12,.18);v.z=Math.max(v.z,.036+side*.059-.15*v.y);
      if(rest[i*3+1]<-.18)v.y=Math.max(v.y,T.MathUtils.lerp(.605,.25,T.MathUtils.smoothstep(v.z,.315,.39)));
      v.sub(torso.position).applyQuaternion(inverse);p.setXYZ(i,v.x,v.y,v.z);
    }
  }
  p.needsUpdate=true;gown.geometry.computeVertexNormals();
}
