import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {softBox} from './materials.ts';
import type {Solid} from './world.ts';

// One vertex-coloured batch per room keeps small physical traces within the draw budget.
// All props rest on existing furniture; none adds a floor obstruction or interaction.
export function dressLivingSpace(root:T.Group,solids:Solid[],area:'apartment'|'resident'):void{
  const parts:T.BufferGeometry[]=[];root.updateMatrixWorld(true);
  function add(anchor:T.Object3D,g:T.BufferGeometry,p:[number,number,number],color:string,rotation:[number,number,number]=[0,0,0],scale:[number,number,number]=[1,1,1]){
    const pose=new T.Object3D();pose.position.set(...p);pose.rotation.set(...rotation);pose.scale.set(...scale);pose.updateMatrix();
    g.applyMatrix4(anchor.matrix.clone().multiply(pose.matrix));const flat=g.index?g.toNonIndexed():g;const c=new T.Color(color),colors=new Float32Array(flat.getAttribute('position').count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}flat.setAttribute('color',new T.BufferAttribute(colors,3));parts.push(flat);if(flat!==g)g.dispose();
  }
  function vessel(anchor:T.Object3D,x:number,z:number,top:number,r:number,h:number,color:string){
    const profile=[[0,0],[r*.75,0],[r,h*.88],[r*.98,h],[r*.85,h],[r*.86,h*.88],[r*.64,.012],[0,.012]].map(([x,y])=>new T.Vector2(x,y));
    add(anchor,new T.LatheGeometry(profile,28),[x,top,z],color);
  }
  function clothing(anchor:T.Object3D,x:number,z:number,top:number,color:string,jacket=false){
    const w=jacket?.50:.46,d=jacket?.52:.50,h=jacket?.050:.036;
    const height=(px:number,pz:number)=>h+.012*Math.sin(px*19+pz*13)+.012*Math.cos(px*24-pz*9);
    const cloth=new T.PlaneGeometry(w,d,24,24);cloth.rotateX(-Math.PI/2);const p=cloth.getAttribute('position');
    for(let i=0;i<p.count;i++){
      let px=p.getX(i),pz=p.getZ(i);px*=.90+.10*Math.cos(pz/d*Math.PI);pz-=Math.max(0,1-Math.abs(px)/.06)*Math.max(0,(pz/d-.3)/.2)*.06;
      p.setXYZ(i,px,height(px,pz),pz);
    }
    // Closed thin cloth: its underside lies on the cushion/mattress while the top carries irregular folds.
    const upper=cloth.toNonIndexed(),bottom=upper.clone(),bp=bottom.getAttribute('position'),edge:number[]=[];
    for(let i=0;i<bp.count;i+=3){const a=new T.Vector3().fromBufferAttribute(bp,i),b=new T.Vector3().fromBufferAttribute(bp,i+2),c=new T.Vector3().fromBufferAttribute(bp,i+1);bp.setXYZ(i,a.x,0,a.z);bp.setXYZ(i+1,b.x,0,b.z);bp.setXYZ(i+2,c.x,0,c.z);}
    for(let i=0;i<24;i++)for(const [a,b] of [[i,i+1],[24*25+i+1,24*25+i],[(i+1)*25,i*25],[i*25+24,(i+1)*25+24]]){
      const A=new T.Vector3().fromBufferAttribute(p,a),B=new T.Vector3().fromBufferAttribute(p,b);edge.push(A.x,0,A.z,B.x,0,B.z,B.x,B.y,B.z,A.x,0,A.z,B.x,B.y,B.z,A.x,A.y,A.z);
    }
    const sides=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(edge,3)).setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(edge.length/3*2),2));sides.computeVertexNormals();upper.computeVertexNormals();bottom.computeVertexNormals();
    const body=mergeGeometries([upper,bottom,sides])!;cloth.dispose();upper.dispose();bottom.dispose();sides.dispose();add(anchor,body,[x,top,z],color);
    // Bent sleeves with oval cross-sections overlap the curved torso instead of forming rectangular slabs.
    for(const side of [-1,1]){
      const sleeve=[[-.11,side*.11],[.01,side*.16],[.15,side*.075]].map(([pz,px])=>new T.Vector3(px,(height(px,pz)+.020)/.38,pz));
      add(anchor,new T.TubeGeometry(new T.CatmullRomCurve3(sleeve),24,.052,12,false),[x,top,z],color,[0,0,0],[1,.38,1]);
    }
    add(anchor,new T.TorusGeometry(.045,.011,8,24,Math.PI*1.25),[x,top+height(0,d*.33)+.009,z+d*.33],color,[Math.PI/2,0,.42],[1,1,.5]);
    const line=[-.4,-.1,.22].map(v=>new T.Vector3(x,top+height(0,d*v)+.003,z+d*v));
    add(anchor,new T.TubeGeometry(new T.CatmullRomCurve3(line),16,.003,5,false),[0,0,0],jacket?'#727c77':'#999e95');
  }
  if(area==='apartment'){
    const table=root.getObjectByName('home-phone-table')!,desk=root.getObjectByName('home-study-desk')!,sofa=root.getObjectByName('home-sofa')!;
    vessel(table,-.2,.58,.535,.095,.18,'#bbb6a5');
    add(table,new T.TorusGeometry(.052,.014,8,22),[-.305,.638,.58],'#bbb6a5');
    vessel(desk,.62,.12,.80,.062,.19,'#7e908c');
    add(table,new T.TorusGeometry(.035,.005,8,24),[.35,.540,-.48],'#969e98',[Math.PI/2,0,0]);
    for(const [i,a] of [[0,.22],[1,-.38]]){
      add(table,new T.TorusGeometry(.018,.004,8,18),[.355+i*.03,.539,-.43],'#969e98',[Math.PI/2,0,a]);
      add(table,softBox(.014,.007,.075),[.355+i*.03,.5385,-.38],'#969e98',[0,a,0]);
      add(table,softBox(.024,.007,.01),[.365+i*.03,.5385,-.348],'#969e98',[0,a,0]);
    }
    clothing(sofa,0,0,.50,'#414b4b',true);
  }else{
    const bed=root.getObjectByName('resident-bed')!,desk=root.getObjectByName('resident-study-desk')!;
    // The shirt is laid on the uncovered head half, with no duplicate work badge.
    clothing(bed,.48,.63,.505,'#c0c3b7');
    vessel(desk,-.7,.05,.81,.105,.17,'#957864');
    add(desk,new T.CylinderGeometry(.087,.087,.018,24),[-.7,.957,.05],'#343e2a');
    const stem=[new T.Vector3(-.7,.956,.05),new T.Vector3(-.713,1.11,.057),new T.Vector3(-.69,1.27,.047)];
    add(desk,new T.TubeGeometry(new T.CatmullRomCurve3(stem),16,.007,6,false),[0,0,0],'#65734c');
    for(let i=0;i<6;i++){
      const side=i%2?-1:1,y=1.02+i*.036;
      add(desk,new T.SphereGeometry(1,16,10),[-.7+side*.057,y,.05+(i%3-1)*.035],'#687b54',[.15,side*.6,side*.42],[.082,.014,.041]);
    }
  }
  const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.68}));mesh.name=`${area}-living-traces`;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
}
