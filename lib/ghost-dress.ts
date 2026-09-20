import * as T from 'three';
const rows=64,cols=64;
// One rounded garment from neckline to hem; no detached collar, belt or strips.
export function createDress(torso:T.Group,cloth:T.Material){
  const profile=new T.CatmullRomCurve3([
    new T.Vector3(.062,.445,.052),new T.Vector3(.132,.395,.091),new T.Vector3(.202,.315,.105),new T.Vector3(.189,.22,.127),new T.Vector3(.157,.08,.115),new T.Vector3(.148,-.04,.105),new T.Vector3(.186,-.20,.135),new T.Vector3(.212,-.39,.16),new T.Vector3(.257,-.68,.184),new T.Vector3(.326,-1.105,.228)
  ]);
  const p:number[]=[],uv:number[]=[],ids:number[]=[],colors:number[]=[];
  for(let row=0;row<=rows;row++){
    const t=row/rows,r=profile.getPoint(t);
    for(let col=0;col<=cols;col++){
      const a=col/cols*Math.PI*2,pleat=(.017+T.MathUtils.smoothstep(t,.3,1)*.024)*(Math.sin(a*13+r.y*1.3)+Math.sin(a*21-r.y)*.28),fold=1+pleat;
      const hem=T.MathUtils.smoothstep(t,.92,1)*(.024*Math.sin(a*5)+.014*Math.cos(a*11));
      const dirt=1-T.MathUtils.smoothstep(t,.65,1)*(.28+.1*Math.sin(a*3+t*10));colors.push(dirt*.94,dirt*.96,dirt);
      p.push(Math.cos(a)*r.x*fold,r.y+hem,Math.sin(a)*r.z*fold);uv.push(col/cols,row/rows);
      if(row<rows&&col<cols){const k=row*(cols+1)+col;ids.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ids);g.computeVertexNormals();
  const gown=new T.Mesh(g,cloth);gown.name='ghost-wet-dress';gown.castShadow=true;gown.receiveShadow=true;torso.add(gown);return {gown,hem:new Float32Array(p)};
}
export function poseDress(gown:T.Mesh,rest:Float32Array,torso:T.Group,time:number,crawl:number,seated=false){
  const p=gown.geometry.getAttribute('position'),q=torso.quaternion,inverse=q.clone().invert(),v=new T.Vector3();
  for(let i=0;i<p.count;i++){
    const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],t=T.MathUtils.smoothstep(-y,.13,1.1);
    v.set(x+Math.sin(y*7+time*1.3)*.009*t,y,z+Math.sin(time*1.6+x*8)*.008*t).applyQuaternion(q).add(torso.position);
    if(crawl>0){
      const s=T.MathUtils.clamp((-y-.12)/.985,0,1),blend=crawl*T.MathUtils.smoothstep(s,0,.55);
      const dragging=new T.Vector3(x*(1-.16*s),.43*(1-s)+.045+Math.sin(s*Math.PI)*.19+z*(1-s*.4),-.26-s*1.0);
      v.lerp(dragging,blend);
    }
    if(seated&&y<-.1){const s=(-y-.1)/1.01;v.set(x,.67-s*.37+z*.4,.12+s*.53);}
    v.y=Math.max(seated?.25:.022,v.y);v.sub(torso.position).applyQuaternion(inverse);p.setXYZ(i,v.x,v.y,v.z);
  }
  p.needsUpdate=true;gown.geometry.computeVertexNormals();gown.geometry.computeBoundingSphere();
}
