import * as T from 'three';

// Narrow translucent ribbons resolve into wet strands, instead of thick cylindrical locks.
export function createHair(head:T.Group){
  const data=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const u=x/127,v=y/127,strand=Math.pow(Math.max(0,Math.sin(x*1.93+Math.sin(y*.035)*.8)),.35);
    const a=Math.min(1,u*12,(1-u)*12)*Math.min(1,(1-v)*10)*(.28+strand*.72),i=(y*128+x)*4;
    data[i]=data[i+1]=data[i+2]=Math.round(a*255);data[i+3]=255;
  }
  const alpha=new T.DataTexture(data,128,128);alpha.needsUpdate=true;alpha.minFilter=T.LinearFilter;alpha.magFilter=T.LinearFilter;
  const material=new T.MeshStandardMaterial({color:'#11171a',roughness:.4,metalness:.09,alphaMap:alpha,alphaTest:.25,side:T.DoubleSide});
  const hair=new T.Group();hair.name='ghost-scalp-hair';head.add(hair);
  const capGeometry=new T.SphereGeometry(1,40,24);const cp=capGeometry.getAttribute('position');for(let i=0;i<cp.count;i++){const a=Math.atan2(cp.getZ(i),cp.getX(i)),t=Math.acos(cp.getY(i))/Math.PI,max=Math.sin(a)>.1?1.0:2.55;cp.setXYZ(i,Math.cos(a)*Math.sin(t*max),Math.cos(t*max),Math.sin(a)*Math.sin(t*max));}capGeometry.computeVertexNormals();const cap=new T.Mesh(capGeometry,material);cap.position.set(0,.125,-.004);cap.scale.set(.183,.238,.167);hair.add(cap);
  for(let i=0;i<7;i++){
    const x=-.13+i*.027,curve=new T.CatmullRomCurve3([new T.Vector3(x,.329,.078),new T.Vector3(x+.017,.245,.143),new T.Vector3(x-.01,.10,.178),new T.Vector3(x+.012,-.005-(i%3)*.025,.177)]);
    const strand=new T.Mesh(new T.TubeGeometry(curve,20,.0016+(i%2)*.0006,4,false),new T.MeshStandardMaterial({color:'#151b1c',roughness:.4}));hair.add(strand);
  }
  const tails=new T.Group();tails.name='ghost-long-hair';head.add(tails);
  for(let i=0;i<42;i++){
    const angle=i/42*Math.PI*2,front=Math.sin(angle)>.05;
    if(front&&Math.abs(Math.cos(angle))<.78)continue;
    const length=front?.74+(i%4)*.07:.89+(i%5)*.045,width=.019+(i%3)*.007;
    const geometry=new T.PlaneGeometry(width,1,2,24),mesh=new T.Mesh(geometry,material);
    mesh.userData={angle,length,width,phase:i*1.7};mesh.castShadow=true;mesh.receiveShadow=true;tails.add(mesh);
  }
  return {hair,tails};
}
export function settleHair(tails:T.Group,figure:T.Group,time:number,floor:number,heightAt?:(x:number,z:number)=>number){
  figure.updateMatrixWorld(true);
  const world=tails.matrixWorld,inverse=world.clone().invert(),point=new T.Vector3(),anchor=new T.Vector3(),left=new T.Vector3(),down=new T.Vector3(0,-1,0);
  for(const child of tails.children){
    const mesh=child as T.Mesh,{angle:a,length,width,phase}=mesh.userData,p=mesh.geometry.getAttribute('position');
    for(let j=0;j<=24;j++)for(let col=0;col<3;col++){
      const t=j/24,cap=Math.min(1,t/.15),sweep=cap*Math.PI*.43;
      anchor.set(Math.cos(a)*(.11+Math.sin(sweep)*.076),.3-(1-Math.cos(sweep))*.2,Math.sin(a)*(.09+Math.sin(sweep)*.079));
      anchor.applyMatrix4(world);point.copy(anchor);
      const hanging=Math.max(0,(t-.15)/.85),sway=Math.sin(time*1.4+phase+t*4)*.014*hanging;
      point.addScaledVector(down,hanging*length*tails.scale.y);
      point.x+=sway;point.z+=Math.sin(phase+t*5)*.022*hanging;
      left.set(-Math.sin(a),0,Math.cos(a)).transformDirection(world);point.addScaledVector(left,(col-1)*width*.5*(1-hanging*.3));
      const support=heightAt?heightAt(figure.position.x,point.z)+.09:figure.position.y+floor;
      point.y=Math.max(support,point.y);point.applyMatrix4(inverse);p.setXYZ(j*3+col,point.x,point.y,point.z);
    }
    p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  }
}
