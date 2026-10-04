import * as T from 'three';
const rows=40,cols=48;
// One rounded garment from neckline to hem; no detached collar, belt or strips.
export function createDress(torso:T.Group,cloth:T.Material){
  const profile=new T.CatmullRomCurve3([
    new T.Vector3(.065,.41,.056),new T.Vector3(.137,.36,.087),new T.Vector3(.199,.29,.102),new T.Vector3(.183,.19,.129),new T.Vector3(.147,.055,.108),new T.Vector3(.14,-.06,.101),new T.Vector3(.185,-.23,.132),new T.Vector3(.226,-.42,.205),new T.Vector3(.247,-.68,.205),new T.Vector3(.29,-1.055,.21)
  ]);
  const p:number[]=[],uv:number[]=[],ids:number[]=[],colors:number[]=[];
  for(let row=0;row<=rows;row++){
    const t=row/rows,r=profile.getPoint(t);
    for(let col=0;col<=cols;col++){
      const a=col/cols*Math.PI*2,pleat=(.017+T.MathUtils.smoothstep(t,.3,1)*.024)*(Math.sin(a*13+r.y*1.3)+Math.sin(a*21-r.y)*.28),fold=1+pleat;
      const hem=T.MathUtils.smoothstep(t,.92,1)*(.037*Math.sin(a*5)+.027*Math.cos(a*11)+.055*Math.max(0,Math.cos(a*3+.9))**6);
      const dirt=1-T.MathUtils.smoothstep(t,.65,1)*(.28+.1*Math.sin(a*3+t*10));colors.push(dirt*.94,dirt*.96,dirt);
      const crush=T.MathUtils.smoothstep(t,0,.4)*(1-T.MathUtils.smoothstep(t,.4,.75));
      p.push(Math.cos(a)*r.x*fold+crush*.022,r.y+hem-Math.max(0,Math.cos(a))*.055*(1-t),Math.sin(a)*r.z*fold-crush*.02);uv.push(col/cols,1-row/rows);
      if(row<rows&&col<cols&&!(r.y<-.98&&Math.sin(a*7+.9)>.91&&Math.sin(a*11)>.1)){const k=row*(cols+1)+col;ids.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ids);g.computeVertexNormals();
  const gown=new T.Mesh(g,cloth);gown.name='ghost-wet-dress';gown.castShadow=true;gown.receiveShadow=true;torso.add(gown);return {gown,hem:new Float32Array(p)};
}
export function poseDress(gown:T.Mesh,rest:Float32Array,torso:T.Group,knees:T.Group[],crawl:number,seated=false,tuck=0,sideClearance=0,frontClearance=0){
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
