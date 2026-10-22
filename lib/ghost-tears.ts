import * as T from 'three';

type Binding={ids:number[];weights:T.Vector3};
const bindings=new WeakMap<T.Mesh,Binding[]>();
// Blood is a thin film on the existing cheek triangles. Storing barycentric
// attachments keeps it on the same skin when the native mandible opens.
export function createGhostTears(face:T.Mesh){
  // The cabin's green fill otherwise removes almost all red reflectance.
  // A low blood-red shadow floor preserves the stain without a bright halo.
  const geometry=new T.BufferGeometry(),material=new T.MeshPhysicalMaterial({color:'#a5262f',emissive:'#680810',emissiveIntensity:.12,roughness:.22,clearcoat:1,clearcoatRoughness:.12,vertexColors:true,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material);mesh.name='ghost-blood-tears';face.parent!.add(mesh);
  const p=face.geometry.getAttribute('position'),index=face.geometry.index!,samples:Binding[]=[],indices:number[]=[],colors:number[]=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),bary=new T.Vector3();
  for(const side of [-1,1])for(let row=0;row<=20;row++)for(let col=0;col<3;col++){
    const u=row/20,width=.0048*(.25+.75*Math.sin(Math.PI*u)**.45)*(1+Math.sin(u*31+side)*.14),x=side*(.049+u*.019)+Math.sin(u*12+side)*.0015+(col-1)*width,y=.111-u*(side<0?.132:.105),target=new T.Vector3(x,y,0);
    let sample:Binding|undefined,front=-Infinity;
    for(let j=0;j<index.count;j+=3){
      const ia=index.getX(j),ib=index.getX(j+1),ic=index.getX(j+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);
      const az=a.z,bz=b.z,cz=c.z;a.z=b.z=c.z=0;T.Triangle.getBarycoord(target,a,b,c,bary);
      if(bary.x<0||bary.y<0||bary.z<0)continue;
      const z=az*bary.x+bz*bary.y+cz*bary.z;if(z>front){front=z;sample={ids:[ia,ib,ic],weights:bary.clone()};}
    }
    if(!sample)throw new Error('Blood tear lies outside the anatomical cheek');samples.push(sample);
    const wet=col===1?1:.6;colors.push(wet,wet,wet);
    const k=samples.length-1;if(row<20&&col<2)indices.push(k,k+1,k+3,k+1,k+4,k+3);
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(samples.length*3),3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  bindings.set(mesh,samples);poseGhostTears(mesh,face);return mesh;
}
export function poseGhostTears(mesh:T.Mesh,face:T.Mesh){
  const p=face.geometry.getAttribute('position'),n=face.geometry.getAttribute('normal'),out=mesh.geometry.getAttribute('position'),point=new T.Vector3(),normal=new T.Vector3(),v=new T.Vector3();
  bindings.get(mesh)!.forEach(({ids,weights},i)=>{point.set(0,0,0);normal.set(0,0,0);ids.forEach((id,j)=>{point.addScaledVector(v.fromBufferAttribute(p,id),weights.getComponent(j));normal.addScaledVector(v.fromBufferAttribute(n,id),weights.getComponent(j));});point.addScaledVector(normal.normalize(),.0012);out.setXYZ(i,point.x,point.y,point.z);});
  out.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}
