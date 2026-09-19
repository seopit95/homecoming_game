import * as T from 'three';

// A hollow leather upper built around a foot-shaped last, in metres.
export function createLeatherShoe(color='#242829',wet=true){
  const root=new T.Group();root.name='wet-leather-shoe';
  const leather=new T.MeshPhysicalMaterial({color,roughness:wet?.38:.88,clearcoat:wet?.65:.05,clearcoatRoughness:.2,side:T.DoubleSide});
  const rubber=new T.MeshStandardMaterial({color:'#111516',roughness:.7}),lining=new T.MeshStandardMaterial({color:'#514c43',roughness:.94});
  const outline=(a:number)=>{const z=Math.cos(a)*.135,w=z<-.02?.049:z>.06?.033:.041;return new T.Vector2(Math.sin(a)*w,z);};
  const perimeter=Array.from({length:64},(_,i)=>outline(i/64*Math.PI*2));
  const soleShape=new T.Shape(perimeter);
  const sole=new T.Mesh(new T.ExtrudeGeometry(soleShape,{depth:.014,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:2,steps:1}),rubber);
  sole.rotation.x=Math.PI/2;sole.position.y=.016;root.add(sole);
  const heel=new T.Mesh(new T.CylinderGeometry(.028,.026,.011,20),rubber);heel.scale.z=1.2;heel.position.set(0,.0055,.091);root.add(heel);
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],rim:T.Vector3[]=[];
  for(let j=0;j<=10;j++)for(let i=0;i<=64;i++){
    const a=i/64*Math.PI*2,p=outline(a),t=j/10;
    const x=T.MathUtils.lerp(p.x,Math.sin(a)*.029,t),z=T.MathUtils.lerp(p.y,.05+Math.cos(a)*.064,t);
    const height=.045+Math.cos(a)*.012,y=.018+Math.sin(t*Math.PI/2)*height;
    positions.push(x,y,z);uv.push(i/64,t);if(j===10)rim.push(new T.Vector3(x,y,z));
    if(j<10&&i<64){const k=j*65+i;indices.push(k,k+65,k+1,k+1,k+65,k+66);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  root.add(new T.Mesh(geometry,leather));
  const bed=new T.Mesh(new T.SphereGeometry(1,24,12),lining);bed.scale.set(.027,.003,.08);bed.position.set(0,.024,.035);root.add(bed);
  const seamMat=new T.MeshStandardMaterial({color:'#414641',roughness:.7});
  root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rim.slice(0,-1),true),64,.0018,5,true),seamMat));
  // Toe stitching and small leather creases catch the flashlight without a painted texture.
  for(const t of [.4,.47]){const points=Array.from({length:22},(_,i)=>{const a=Math.PI+(i/21-.5)*1.65,p=outline(a);return new T.Vector3(T.MathUtils.lerp(p.x,Math.sin(a)*.029,t),.018+Math.sin(t*Math.PI/2)*(.045+Math.cos(a)*.012)+.0005,T.MathUtils.lerp(p.y,.05+Math.cos(a)*.064,t));});root.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.00055,4,false),seamMat));}
  root.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});return root;
}

// Alpha is a wet film, with broken capillary edges; the underlying floor remains visible.
export function wetTexture(footprint:boolean,seed:number){
  const n=128,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=(x/(n-1)-.5)*2,v=(y/(n-1)-.5)*2;
    const noise=Math.sin(x*.31+seed)*Math.sin(y*.27-seed)+.45*Math.sin(x*.91+y*.37);
    let field:number;
    if(footprint){
      const toe=1-Math.hypot((u+.09)/.65,(v+.35)/.52),heel=1-Math.hypot((u-.04)/.42,(v-.6)/.25),arch=1-Math.hypot((u-.17)/.34,(v-.12)/.38);
      field=Math.max(toe,heel,arch)-.085*noise;
      // Sparse tread breaks, rather than a solid icon stamped on the floor.
      if(v<.07&&Math.sin(v*48+u*4)>.8)field-=.12;
    }else{const a=Math.atan2(v,u),edge=.66+.10*Math.sin(a*3+seed)+.06*Math.cos(a*7-seed)+.035*Math.sin(a*13);field=edge-Math.hypot(u,v)+noise*.024;}
    const alpha=T.MathUtils.smoothstep(field,0,.12)*(.52+.06*noise),k=(y*n+x)*4;
    data[k]=data[k+1]=data[k+2]=255;data[k+3]=Math.max(0,Math.min(255,alpha*255));
  }
  const texture=new T.DataTexture(data,n,n);texture.needsUpdate=true;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;return texture;
}
export function createEntryEvidence(){
  const root=new T.Group();root.name='entry-evidence';root.position.z=-4.65;
  for(const [x,z,angle] of [[-.13,-.02,-.23],[.15,.075,.38]]){const shoe=createLeatherShoe();shoe.position.set(x,.014,z);shoe.rotation.y=angle;root.add(shoe);}
  function wet(x:number,z:number,w:number,d:number,foot:boolean,seed:number,rotation=0){
    const mesh=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshPhysicalMaterial({map:wetTexture(foot,seed),color:'#17211f',transparent:true,opacity:.36,roughness:.055,metalness:0,clearcoat:1,clearcoatRoughness:.025,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    mesh.name=foot?'wet-footprint':'water-film';mesh.rotation.set(-Math.PI/2,0,rotation);mesh.position.set(x,z<.244?.015:.003,z);mesh.receiveShadow=true;root.add(mesh);
  }
  wet(-.08,.01,.66,.61,false,2,.2);wet(.21,.21,.34,.38,false,6,-.3);
  for(let i=0;i<8;i++){
    const z=.47+i*.47,x=(i%2?-.12:.12)+Math.sin(i*1.3)*.065;
    wet(x,z,.13,.3,true,13+i,(i%2?-.12:.1));
    for(let j=0;j<2;j++)wet(x+.10*Math.sin(i*7+j*4),z+.16+j*.1,.018+j*.016,.025+j*.021,false,i*3+j);
  }
  return root;
}
