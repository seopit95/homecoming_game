import * as T from 'three';
import sourceAsset from './assets/ghost-dress.json' with {type:'json'};
// Cut the sleeve through its weighted surface instead of discarding whole
// triangles, which left staircase-shaped paper teeth along the shoulder.
const asset=(()=>{
 const out={...sourceAsset,position:[...sourceAsset.position],uv:[...sourceAsset.uv],armWeight:[...sourceAsset.armWeight],neckWeight:[...sourceAsset.neckWeight],index:[] as number[]},cuts=new Map<string,number>(),limit=.38;
 function cut(a:number,b:number){
  const key=Math.min(a,b)+'/'+Math.max(a,b);if(cuts.has(key))return cuts.get(key)!;
  const t=(limit-out.armWeight[a])/(out.armWeight[b]-out.armWeight[a]),id=out.armWeight.length;
  for(const [array,n] of [[out.position,3],[out.uv,2],[out.neckWeight,1]] as const)for(let axis=0;axis<n;axis++)array.push(T.MathUtils.lerp(array[a*n+axis],array[b*n+axis],t));
  out.armWeight.push(limit);cuts.set(key,id);return id;
 }
 for(let k=0;k<sourceAsset.index.length;k+=3){
  const polygon=sourceAsset.index.slice(k,k+3),clipped:number[]=[];
  for(let j=0;j<3;j++){const a=polygon[j],b=polygon[(j+1)%3],inside=out.armWeight[a]<=limit,next=out.armWeight[b]<=limit;if(inside)clipped.push(a);if(inside!==next)clipped.push(cut(a,b));}
  for(let j=1;j<clipped.length-1;j++)out.index.push(clipped[0],clipped[j],clipped[j+1]);
 }
 return out;
})();
// UV copies remain one physical cloth surface. Accumulate triangle areas on
// their original vertex owner, then copy the result back to the texture seams.
const owners:number[]=[],copies=new Map<string,number[]>();
for(let i=0;i<asset.position.length/3;i++){
  const key=asset.position.slice(i*3,i*3+3).join('/')+'/'+asset.armWeight[i];
  let group=copies.get(key);if(!group){group=[];copies.set(key,group);}owners.push(group[0]??i);group.push(i);
}
const normalIndex=new T.Uint16BufferAttribute(asset.index.map(i=>owners[i]),1);
const normalSeams=[...copies.values()].filter(g=>g.length>1);
type SurfaceField=(x:number,y:number,z:number,out:T.Vector3)=>T.Vector3;
const surfaceFields=new WeakMap<T.Mesh,SurfaceField>();
const armFields=new WeakMap<T.Mesh,(base:T.Vector3,weight:number,out:T.Vector3)=>void>();
// The body beneath the neckline uses the identical thorax field as the bodice.
// Sampling garment triangle offsets would let independently moving sleeves
// distort the skin; the shared field has one anatomical torso frame instead.
export function poseDressSkin(gown:T.Mesh,rest:T.Vector3,out:T.Vector3,armWeight=0){
  const field=surfaceFields.get(gown);if(field)field(rest.x,rest.y,rest.z,out);else out.copy(rest);
  armFields.get(gown)?.(rest,armWeight,out);return out;
}
function updateDressNormals(g:T.BufferGeometry){
  const rendered=g.index;g.setIndex(normalIndex);
  try{g.computeVertexNormals();}finally{g.setIndex(rendered);}
  const n=g.getAttribute('normal');for(const group of normalSeams)for(let j=1;j<group.length;j++){const owner=group[0],i=group[j];n.setXYZ(i,n.getX(owner),n.getY(owner),n.getZ(owner));}
}
// The neckline, bodice and sleeves are one authored surface. UV seams are
// duplicated only for sampling; their positions and skin weights are identical.
export function createDress(torso:T.Group,cloth:T.Material){
  const g=new T.BufferGeometry(),colors=asset.position.flatMap((_,i)=>i%3?[]:[.94,.96,1]);
  g.setAttribute('position',new T.Float32BufferAttribute(asset.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(asset.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(asset.index);updateDressNormals(g);
  const gown=new T.Mesh(g,cloth);gown.name='ghost-wet-dress';gown.castShadow=true;gown.receiveShadow=true;torso.add(gown);return {gown,hem:new Float32Array(asset.position)};
}
export function poseDress(gown:T.Mesh,rest:Float32Array,torso:T.Group,knees:T.Group[],crawl:number,seated=false,tuck=0,sideClearance=0,frontClearance=0){
  gown.userData.seated=seated;
  const p=gown.geometry.getAttribute('position'),q=torso.quaternion,inverse=q.clone().invert(),v=new T.Vector3(),left=new T.Vector3(),right=new T.Vector3(),center=new T.Vector3(),tangent=new T.Vector3(),otherTangent=new T.Vector3();
  const levels=[.41,.29,.055,-.23,-.68,-1.055];
  // The skirt follows the same hips and knees as the skin. Separate side guides
  // let fabric bridge a stride instead of letting a thigh emerge through it.
  const seatedKnees:T.Vector3[]=[];
  const spines=knees.map(knee=>{
    const hip=knee.parent!,joint=knee.position.clone().applyQuaternion(hip.quaternion).add(hip.position),ankle=new T.Vector3(0,-.42,0).applyQuaternion(knee.quaternion).add(knee.position).applyQuaternion(hip.quaternion).add(hip.position);
    seatedKnees.push(joint);
    const hem=ankle.clone();hem.y=seated?.29:.055;hem.z=seated?Math.max(ankle.z,joint.z+.06):ankle.z-crawl*.13*(1-tuck);
    return new T.CatmullRomCurve3([
      new T.Vector3(0,.41,0).applyQuaternion(q).add(torso.position),new T.Vector3(0,.29,0).applyQuaternion(q).add(torso.position),
      new T.Vector3(0,.055,0).applyQuaternion(q).add(torso.position),hip.position.clone().add(new T.Vector3(0,.025,-crawl*tuck*.06)),joint,hem
    ]);
  });
  if(seated){gown.userData.kneeFront=Math.max(...seatedKnees.map(p=>p.z));gown.userData.kneeTop=Math.max(...seatedKnees.map(p=>p.y));}
  const up=new T.Vector3(0,1,0).applyQuaternion(q);
  const field:SurfaceField=(x,y,z,out)=>{
    // The thorax already inherits the torso transform. Rebuilding its lateral
    // offset in world X twists the collar away from its body when it rolls.
    if(y>=.29)return out.set(x,y,z);
    const lower=T.MathUtils.smoothstep(-y,.1,1.055);
    let row=0;while(row<levels.length-2&&y<levels[row+1])row++;
    const u=T.MathUtils.clamp((levels[row]-y)/(levels[row]-levels[row+1]),0,1),along=(row+u)/(levels.length-1);
    spines[0].getPoint(along,left);spines[1].getPoint(along,right);center.copy(left).lerp(right,.5);
    spines[0].getTangent(along,tangent);tangent.add(spines[1].getTangent(along,otherTangent)).normalize();
    const hipAllowance=Math.exp(-(((y+.23)/.24)**2));
    const side=T.MathUtils.clamp(.5+x/.38,0,1),shift=left.lerp(right,side).sub(center),thickness=1-lower*(crawl*(.25+tuck*.3)+frontClearance*.12)+hipAllowance*.06;
    // Gather loose fabric below the knees; keep the thigh envelope intact.
    const gather=T.MathUtils.smoothstep(-y,.60,1.055)*sideClearance*.45;
    v.copy(center);v.x+=x*(1+lower*(.25-tuck*.6)-gather+.18*hipAllowance);v.y+=shift.y+z*tangent.z*thickness;v.z+=shift.z-z*tangent.y*thickness;
    v.addScaledVector(up,Math.max(0,y-levels[0]));
    v.y=Math.max(seated?.25:.022,v.y);v.sub(torso.position).applyQuaternion(inverse);
    const thorax=T.MathUtils.smoothstep(y,.055,.29);v.set(T.MathUtils.lerp(v.x,x,thorax),T.MathUtils.lerp(v.y,y,thorax),T.MathUtils.lerp(v.z,z,thorax));return out.copy(v);
  };
  surfaceFields.set(gown,field);
  for(let i=0;i<p.count;i++){
    field(rest[i*3],rest[i*3+1],rest[i*3+2],v);p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;updateDressNormals(gown.geometry);gown.geometry.boundingSphere??=new T.Sphere(new T.Vector3(0,-.4,0),1.8);
}

export function poseDressArms(gown:T.Mesh,rest:Float32Array,arms:T.Group[]){
  const p=gown.geometry.getAttribute('position'),v=new T.Vector3(),base=new T.Vector3(),point=new T.Vector3(),pivot=new T.Vector3(),q=new T.Quaternion();
  const deltas=arms.map((arm,i)=>{
    const bind=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3((i===0?-1:1)*.68,-.733212,0).normalize());
    return arm.quaternion.clone().multiply(bind.invert());
  });
  const shifts=arms.map((arm,i)=>arm.position.clone().sub(new T.Vector3((i===0?-1:1)*.18,.308,0)));
  const field=(base:T.Vector3,w:number,out:T.Vector3)=>{
    if(w<=0)return;const side=base.x<0?0:1;point.copy(out).sub(base);
    pivot.set((side===0?-1:1)*.18,.308,0);q.identity().slerp(deltas[side],w);
    v.copy(base).sub(pivot).applyQuaternion(q).add(pivot).addScaledVector(shifts[side],w).addScaledVector(point,1-w);out.copy(v);
  };
  armFields.set(gown,field);
  for(let i=0;i<p.count;i++){
    const w=asset.armWeight[i];if(w<=0)continue;
    base.fromArray(rest,i*3);v.fromBufferAttribute(p,i);field(base,w,v);p.setXYZ(i,v.x,v.y,v.z);
  }
  if(gown.userData.seated){
    const torso=gown.parent!,inverse=torso.quaternion.clone().invert();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyQuaternion(torso.quaternion).add(torso.position);
      // The cushion and inclined side bolsters meet the cloth in the figure
      // frame, including during the car's crash roll. Loose hem hangs forward.
      const side=T.MathUtils.smoothstep(Math.abs(v.x),.12,.18);v.z=Math.max(v.z,.036+side*.059-.15*v.y);
      if(rest[i*3+1]<-.18)v.y=Math.max(v.y,T.MathUtils.lerp(.605,.25,T.MathUtils.smoothstep(v.z,.315,.39)));
      // Gather loose knee fabric into the footwell instead of letting its
      // inflated standing silhouette enter the dashboard/glove compartment.
      if(rest[i*3+1]<-.18&&asset.armWeight[i]<.1){
        v.z=Math.min(v.z,gown.userData.kneeFront+.05+Math.max(0,gown.userData.kneeTop-v.y)*.8);
        const width=Math.abs(v.x);if(width>.21)v.x=Math.sign(v.x)*(.21+.03*Math.tanh((width-.21)/.03));
      }
      v.sub(torso.position).applyQuaternion(inverse);p.setXYZ(i,v.x,v.y,v.z);
    }
  }
  p.needsUpdate=true;updateDressNormals(gown.geometry);
}

// The collar inherits the same authored cervical family as its source body.
export function poseDressNeck(gown:T.Mesh,rotation:T.Quaternion,pivot:T.Vector3,translation:T.Vector3){
  const p=gown.geometry.getAttribute('position'),v=new T.Vector3(),q=new T.Quaternion();
  for(let i=0;i<p.count;i++){
    const w=asset.neckWeight[i];if(w<=0)continue;q.identity().slerp(rotation,w);
    v.fromBufferAttribute(p,i).sub(pivot).applyQuaternion(q).add(pivot).addScaledVector(translation,w);p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;updateDressNormals(gown.geometry);
}
