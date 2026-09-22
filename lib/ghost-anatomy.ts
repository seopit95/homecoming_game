import * as T from 'three';
import anatomy from './assets/ghost-anatomy.json' with {type:'json'};

// Authored adult female anatomy derived from MakeHuman's CC0 base/shape assets.
// Only clothed-character hand/foot surfaces are distributed; provenance is in docs/assets.md.
export function extremity(part:'hand'|'foot',side:number,material:T.Material){
  const data=anatomy[`${part}-${side<0?'r':'l'}` as 'hand-l'|'hand-r'|'foot-l'|'foot-r'];
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.position,3));geometry.setIndex(data.index);
  const p=geometry.getAttribute('position'),uv:number[]=[];
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(part==='hand'){
      // Fingers retain knuckles, webbing and nails; a slight curl prevents a rigid fan pose.
      const curl=T.MathUtils.smoothstep(-y,.065,.18);z+=curl*.023;y+=curl*.006;
    }
    p.setXYZ(i,x,y,z);uv.push((x+.12)/.24,(part==='hand'?-y+.015:z+.1)/.3);
  }
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=part==='hand'?`ghost-hand-${side}`:`ghost-foot-${side}`;return mesh;
}
