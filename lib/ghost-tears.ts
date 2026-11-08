import * as T from 'three';

type Binding={ids:number[];weights:T.Vector3};
const bindings=new WeakMap<T.Mesh,Binding[]>();
// A bounded CPU-only attachment cache, validated against the complete rest
// mesh so custom anatomy cannot accidentally inherit another face's mapping.
let rest:{positions:number[];triangles:number[];samples:Binding[];indices:number[];colors:number[]}|undefined;
// Blood is a thin film on the existing cheek triangles. Storing barycentric
// attachments keeps it on the same skin when the native mandible opens.
export function createGhostTears(face:T.Mesh){
  // Thin dark blood film; no emissive red stripe in the review model.
  const geometry=new T.BufferGeometry(),material=new T.MeshPhysicalMaterial({color:'#4c1117',roughness:.31,clearcoat:.48,clearcoatRoughness:.24,vertexColors:true,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material);mesh.name='ghost-blood-tears';face.parent!.add(mesh);
  const p=face.geometry.getAttribute('position'),index=face.geometry.index!,samples:Binding[]=[],indices:number[]=[],colors:number[]=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),bary=new T.Vector3();
  const same=rest&&p.count*3===rest.positions.length&&index.count===rest.triangles.length&&rest.positions.every((v,i)=>v===p.array[i])&&rest.triangles.every((v,i)=>v===index.array[i]);
  if(same){samples.push(...rest!.samples);indices.push(...rest!.indices);colors.push(...rest!.colors);}
  else{
  for(const side of [-1,1])for(let row=0;row<=20;row++)for(let col=0;col<3;col++){
    const u=row/20,width=.0031*(.12+.88*Math.sin(Math.PI*u)**.7)*(1+Math.sin(u*37+side)*.24),x=side*(.049+u*.019)+Math.sin(u*12+side)*.0021+Math.sin(u*34)*.0006+(col-1)*width,y=.111-u*(side<0?.132:.105),target=new T.Vector3(x,y,0);
    let sample:Binding|undefined,front=-Infinity;
    for(let j=0;j<index.count;j+=3){
      const ia=index.getX(j),ib=index.getX(j+1),ic=index.getX(j+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);
      const az=a.z,bz=b.z,cz=c.z;a.z=b.z=c.z=0;T.Triangle.getBarycoord(target,a,b,c,bary);
      if(bary.x<0||bary.y<0||bary.z<0)continue;
      const z=az*bary.x+bz*bary.y+cz*bary.z;if(z>front){front=z;sample={ids:[ia,ib,ic],weights:bary.clone()};}
    }
    if(!sample)throw new Error('Blood tear lies outside the anatomical cheek');samples.push(sample);
    const wet=(col===1?.9:.48)*(1-.18*u+.08*Math.sin(u*23+side));colors.push(wet,wet,wet);
    const k=samples.length-1;if(row<20&&col<2)indices.push(k,k+1,k+3,k+1,k+4,k+3);
  }
  rest={positions:Array.from(p.array),triangles:Array.from(index.array),samples,indices,colors};
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(samples.length*3),3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  bindings.set(mesh,samples);poseGhostTears(mesh,face);return mesh;
}
export function poseGhostTears(mesh:T.Mesh,face:T.Mesh){
  const p=face.geometry.getAttribute('position'),n=face.geometry.getAttribute('normal'),out=mesh.geometry.getAttribute('position'),point=new T.Vector3(),normal=new T.Vector3(),v=new T.Vector3();
  bindings.get(mesh)!.forEach(({ids,weights},i)=>{point.set(0,0,0);normal.set(0,0,0);ids.forEach((id,j)=>{point.addScaledVector(v.fromBufferAttribute(p,id),weights.getComponent(j));normal.addScaledVector(v.fromBufferAttribute(n,id),weights.getComponent(j));});point.addScaledVector(normal.normalize(),.0012);out.setXYZ(i,point.x,point.y,point.z);});
  out.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}
