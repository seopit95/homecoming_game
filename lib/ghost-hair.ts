import * as T from 'three';
import {surface} from './materials.ts';
import {faceDepth} from './ghost-face.ts';
const rows=28,cols=2,locks=96;
export function createHair(head:T.Group){
  const data=new Uint8Array(128*256*4);
  // A few joined wet strands, with thinner neighbours and staggered tips.
  // Keep this deterministic so pausing/reposing never changes the silhouette.
  const strands=Array.from({length:12},(_,i)=>({x:5+i*10.5+Math.sin(i*4.7)*2.6,width:1.1+(1+Math.sin(i*2.3))*.95,end:.74+(1+Math.sin(i*1.71))*.125,phase:i*2.47}));
  for(let y=0;y<256;y++)for(let x=0;x<128;x++){
    const u=x/127,v=y/255;let a=0;
    for(const s of strands){
      const center=s.x+Math.sin(v*4+s.phase)*1.6*v+Math.sin(v*8+s.phase)*.45*v;
      const taper=1-T.MathUtils.smoothstep(v,s.end-.22,s.end),radius=s.width*(.48+.52*taper);
      const coverage=T.MathUtils.smoothstep(radius+.9-Math.abs(x-center),0,1.8)*(1-T.MathUtils.smoothstep(v,s.end-.045,s.end));
      a=Math.max(a,coverage);
    }
    a*=Math.min(1,u*16,(1-u)*16);const i=(y*128+x)*4;
    data[i]=data[i+1]=data[i+2]=Math.round(Math.min(1,a)*255);data[i+3]=255;
  }
  const alpha=new T.DataTexture(data,128,256);alpha.needsUpdate=true;alpha.generateMipmaps=true;alpha.minFilter=T.LinearMipmapLinearFilter;alpha.magFilter=T.LinearFilter;alpha.anisotropy=4;
  const material=surface('hair','#302a27',{roughness:.56,metalness:0,alphaMap:alpha,alphaTest:.3,alphaToCoverage:true,side:T.DoubleSide});
  const hair=new T.Group();hair.name='ghost-scalp-hair';head.add(hair);
  // An open sphere retains both triangles along the hairline. Reusing a
  // closed sphere's south pole would leave a sawtooth band after reshaping it.
  const capEnd=2.64,capGeometry=new T.SphereGeometry(1,96,32,0,Math.PI*2,0,capEnd),p=capGeometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const a=Math.atan2(p.getZ(i),p.getX(i)),t=Math.acos(p.getY(i))/capEnd,ruffle=1+Math.sin(a*57+t*17)*.009+Math.sin(a*23-t*3)*.008,front=T.MathUtils.smoothstep(Math.sin(a),-.15,.65),max=capEnd-front*(1.47+Math.sin(a*7)*.016+Math.sin(a*13)*.009);
    p.setXYZ(i,Math.cos(a)*Math.sin(t*max)*.183*ruffle,Math.cos(t*max)*.238+.125,Math.sin(a)*Math.sin(t*max)*.169*ruffle-.009);
    if(p.getZ(i)>0&&p.getY(i)<=.35&&Math.abs(p.getX(i))<.178)p.setZ(i,Math.max(p.getZ(i),faceDepth(p.getX(i),p.getY(i))+.008));
  }
  capGeometry.computeVertexNormals();const cap=new T.Mesh(capGeometry,surface('hair','#2d2826',{roughness:.83,bumpScale:.00045}));cap.name='ghost-hair-cap';cap.castShadow=true;hair.add(cap);
  const tails=new T.Group();tails.name='ghost-long-hair';head.add(tails);
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[],specs:{angle:number;length:number;width:number;phase:number;bang:boolean}[]=[];
  for(let i=0;i<locks;i++){
    const angle=i/locks*Math.PI*2,front=Math.sin(angle)>.55,bang=front&&Math.cos(angle)<-.25;
    // Leave one eye exposed; the opposite side is screened by irregular wet clumps.
    if(front&&!bang&&Math.cos(angle)<.7)continue;
    const k=specs.length;specs.push({angle,bang,length:bang?.20+(i%5)*.055:.57+(i%7)*.038,width:bang?.015:.018+(i%4)*.004,phase:i*1.97});
    for(let j=0;j<=rows;j++)for(let col=0;col<=cols;col++){
      positions.push(0,0,0);uvs.push(i%2?1-col/cols:col/cols,j/rows);
      if(j<rows&&col<cols){const n=k*(rows+1)*(cols+1)+j*(cols+1)+col;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);
  const mesh=new T.Mesh(g,material);mesh.userData.locks=specs;mesh.castShadow=true;mesh.receiveShadow=true;tails.add(mesh);return {hair,tails};
}
export function settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number){
  tails.updateWorldMatrix(true,false);
  const world=tails.matrixWorld,inverse=world.clone().invert(),point=new T.Vector3(),center=new T.Vector3(),left=new T.Vector3(),sweepPoint=new T.Vector3();
  const mesh=tails.children[0] as T.Mesh,p=mesh.geometry.getAttribute('position');
  mesh.userData.locks.forEach(({angle:a,length,width,phase,bang}:{angle:number;length:number;width:number;phase:number;bang:boolean},lock:number)=>{
    left.set(-Math.sin(a),0,Math.cos(a)).transformDirection(world);
    sweepPoint.set(Math.cos(a),0,Math.sin(a)).transformDirection(world);
    for(let j=0;j<=rows;j++){
      // Blend the surface arc into gravity across the temple, rather than
      // abruptly switching from a skull tangent to a straight hanging card.
      const t=j/rows,blend=T.MathUtils.clamp(t-.24,0,.2),cap=(Math.min(t,.24)+blend-blend*blend/.4)/.34;
      const theta=cap*(bang?1.13:1.64)+Math.sin(phase)*.016*cap,hang=(blend*blend/.4+Math.max(0,t-.44))/.66;
      point.set(Math.cos(a)*Math.sin(theta)*.193,.126+Math.cos(theta)*.254,Math.sin(a)*Math.sin(theta)*.181-.009);
      point.applyMatrix4(world);
      // Broad, delayed curves keep the locks attached to the skull as it tilts.
      point.addScaledVector(sweepPoint,Math.sin(hang*Math.PI)*(.035+Math.sin(phase)*.018));
      point.y-=hang*length*tails.scale.y;
      point.x+=Math.sin(time*1.8+phase+hang*3)*.012*hang+Math.sin(hang*3.5+phase)*.026*hang;
      point.z+=Math.sin(hang*3+phase)*.019*hang;
      center.copy(point);
      for(let col=0;col<=cols;col++){
      const across=col/cols*2-1,spread=width*Math.sin(Math.min(1,t/.2)*Math.PI/2)*(1-hang*.86);
      point.copy(center).addScaledVector(left,across*spread*.5).addScaledVector(sweepPoint,(1-across*across)*spread*.12);
      const support=heightAt?heightAt(figure.position.x,point.z)+.09:figure.position.y+floor;
      if(point.y<support){const drag=support-point.y;point.z-=drag*.42;point.x+=Math.sin(phase)*drag*.14;point.y=Math.max(support,heightAt?heightAt(figure.position.x,point.z)+.09:support)+.001;}
      point.applyMatrix4(inverse);
      // Hair slides over the face, rather than appearing from inside its cheeks.
      if(point.y>-.10&&point.y<.33&&point.z>0){
        const r=Math.sqrt(Math.max(0,1-((point.y-.12)/.235)**2));
        const front=.182*r,side=.194*r;
        if(Math.abs(point.x)<side){const skinZ=Math.max(faceDepth(point.x,point.y),front*Math.sqrt(Math.max(0,1-(point.x/side)**2)));point.z=Math.max(point.z,skinZ+.01);}
      }
      p.setXYZ(lock*(rows+1)*(cols+1)+j*(cols+1)+col,point.x,point.y,point.z);
      }
    }
  });
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.boundingSphere??=new T.Sphere(new T.Vector3(0,-.6,0),2.3);
}
