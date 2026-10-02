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
export function poseDress(gown:T.Mesh,rest:Float32Array,torso:T.Group,time:number,crawl:number,seated=false,tuck=0){
  const p=gown.geometry.getAttribute('position'),q=torso.quaternion,inverse=q.clone().invert(),v=new T.Vector3(),dragging=new T.Vector3(),tangent=new T.Vector3();
  const levels=[.41,.29,.055,-.23,-.68,-1.055];
  const spine=crawl>0?new T.CatmullRomCurve3([
    new T.Vector3(0,.41,0).applyQuaternion(q).add(torso.position),new T.Vector3(0,.29,0).applyQuaternion(q).add(torso.position),
    new T.Vector3(torso.position.x*.7,.50,-.13),new T.Vector3(0,.49+tuck*.13,-.45+tuck*.28),
    new T.Vector3(0,.22+tuck*.05,-.86+tuck*.56),new T.Vector3(0,.055+tuck*.015,-1.2+tuck*.94)
  ]):undefined;
  for(let i=0;i<p.count;i++){
    const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],t=T.MathUtils.smoothstep(-y,.13,1.1);
    v.set(x+Math.sin(y*7+time*1.3)*.009*t,y,z+Math.sin(time*1.6+x*8)*.008*t).applyQuaternion(q).add(torso.position);
    if(spine){
      // The garment wraps one continuous spine/hip guide instead of blending a
      // tilted standing skirt into a separate tent-shaped trailing sheet.
      let row=0;while(row<levels.length-2&&y<levels[row+1])row++;
      const u=T.MathUtils.clamp((levels[row]-y)/(levels[row]-levels[row+1]),0,1),along=(row+u)/(levels.length-1),lower=T.MathUtils.smoothstep(-y,.1,1.055);
      spine.getPoint(along,dragging);spine.getTangent(along,tangent);
      const thickness=1-lower*(.65+tuck*.08),fold=Math.sin(along*Math.PI*3)*Math.sin(along*Math.PI)*tuck;
      dragging.x+=x*(1-lower*(.16+tuck*.24));
      dragging.y+=z*tangent.z*thickness+fold*.045;
      dragging.z-=z*tangent.y*thickness-fold*.035;
      v.lerp(dragging,crawl);
    }
    if(seated&&y<-.1){const s=(-y-.1)/1.01;v.set(x,.67-s*.37+z*.4,.12+s*.53);}
    v.y=Math.max(seated?.25:.022,v.y);v.sub(torso.position).applyQuaternion(inverse);p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;gown.geometry.computeVertexNormals();gown.geometry.boundingSphere??=new T.Sphere(new T.Vector3(0,-.4,0),1.8);
}
