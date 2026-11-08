import * as T from 'three';
import anatomy from './assets/ghost-anatomy.json' with {type:'json'};

// Authored adult female anatomy derived from MakeHuman's CC0 base/shape assets.
// Only clothed-character hand/foot surfaces are distributed; provenance is in docs/assets.md.
export function extremity(part:'hand'|'foot',side:number,material:T.Material,elongated=true){
  const data=anatomy[`${part}-${side<0?'r':'l'}` as 'hand-l'|'hand-r'|'foot-l'|'foot-r'];
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.position,3));geometry.setIndex(data.index);
  const p=geometry.getAttribute('position'),uv:number[]=[];
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(part==='hand'){
      // Fingers retain knuckles, webbing and nails; a slight curl prevents a rigid fan pose.
      const curl=T.MathUtils.smoothstep(-y,.065,.18);y-=Math.max(0,-y-.065)*(elongated?1.55:0);z+=curl*(elongated?.03:.008);
    }
    p.setXYZ(i,x,y,z);uv.push((x+.12)/.24,(part==='hand'?-y+.015:z+.1)/.3);
  }
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);
  if(part==='hand'&&elongated){
    const nailMaterial=new T.MeshStandardMaterial({color:'#252725',roughness:.32});
    // Nail roots match each anatomical fingertip rather than a separate fan of spikes.
    for(const [x,y,z] of [[-.0435,-.1139,-.0319],[-.0283,-.1438,-.0309],[-.0025,-.1543,-.031],[.0334,-.1449,-.0266],[.064,-.077,-.036]]){
      const curl=T.MathUtils.smoothstep(-y,.065,.18),tipY=y-Math.max(0,-y-.065)*1.55;
      const path=new T.CatmullRomCurve3([new T.Vector3(x*side,tipY+.008,z+curl*.03),new T.Vector3(x*side,tipY-.026,z+curl*.03-.007),new T.Vector3(x*side,tipY-.066,z+curl*.03+.011)]);
      const g=new T.TubeGeometry(path,8,.006,6,false),a=g.getAttribute('position');
      for(let row=0;row<=8;row++){const center=path.getPointAt(row/8),radius=1-row/8*.98;for(let col=0;col<=6;col++){const i=row*7+col;a.setXYZ(i,center.x+(a.getX(i)-center.x)*radius,center.y+(a.getY(i)-center.y)*radius,center.z+(a.getZ(i)-center.z)*radius);}}
      g.computeVertexNormals();const nail=new T.Mesh(g,nailMaterial);nail.name='ghost-long-nail';nail.castShadow=true;mesh.add(nail);
    }
  }
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=part==='hand'?`ghost-hand-${side}`:`ghost-foot-${side}`;return mesh;
}
