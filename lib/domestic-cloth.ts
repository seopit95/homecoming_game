import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Static, closed cloth volumes. UVs are in the same 1.8m space as boxUV;
// the hanging sides use cloth length rather than a collapsed top projection.
function shell(nx:number,nz:number,point:(u:number,v:number,upper:boolean)=>number[]){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],row=nx+1,count=row*(nz+1);
 for(const upper of [true,false])for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const [x,y,z,s,t]=point(i/nx,j/nz,upper);positions.push(x,y,z);uv.push(s/1.8,t/1.8);
 }
 function triangle(a:number,b:number,c:number){
  const equal=(i:number,j:number)=>Math.hypot(...[0,1,2].map(k=>positions[i*3+k]-positions[j*3+k]))<1e-8;
  if(!equal(a,b)&&!equal(b,c)&&!equal(c,a))indices.push(a,b,c);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const a=j*row+i,b=a+1,c=b+row,d=a+row;
  // At these two corners the other diagonal would join three seam points,
  // laying a zero-volume upper triangle directly over its underside.
  if((i===0&&j===0)||(i===nx-1&&j===nz-1)){
   triangle(a,d,c);triangle(a,c,b);triangle(a+count,c+count,d+count);triangle(a+count,b+count,c+count);
  }else{triangle(a,d,b);triangle(b,d,c);triangle(a+count,b+count,d+count);triangle(b+count,c+count,d+count);}
 }
 const boundary=[...Array.from({length:nx},(_,i)=>i),...Array.from({length:nz},(_,i)=>i*row+nx),...Array.from({length:nx},(_,i)=>nz*row+nx-i),...Array.from({length:nz},(_,i)=>(nz-i)*row)];
 for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];triangle(a,b,b+count);triangle(a,b+count,a+count);}
 const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(positions,3));raw.setAttribute('uv',new T.Float32BufferAttribute(uv,2));raw.setIndex(indices);
 const geometry=mergeVertices(raw,1e-6);raw.dispose();geometry.computeVertexNormals();return geometry;
}

export function cushionGeometry(width:number,height:number,depth:number,seat=false){
 return shell(24,16,(s,t,upper)=>{
  const u=s*2-1,v=t*2-1,q=Math.max(0,(1-u*u)*(1-v*v));
  const x=width/2*u*(1-.08*Math.abs(v)**6),z=depth/2*v*(1-.08*Math.abs(u)**6);
  const crown=seat?Math.sin(Math.min(1,(1-Math.abs(u))/.4,(1-Math.abs(v))/.28)*Math.PI/2):q**.3;
  const seam=height*(seat?.09:.3+.025*Math.sin(u*3+v*5)),wrinkle=seat?0:.009*Math.sin(v*28+u*3)*Math.exp(-(((Math.abs(u)-.78)/.17)**2))*Math.sqrt(q);
  const y=upper?seam+(height-seam)*crown+wrinkle:seam*Math.max(0,1-q/(seat?.42:.25));
  return [x,y,z,x,z];
 });
}

export function pillowSeam(width:number,height:number,depth:number){
 const points:T.Vector3[]=[];
 for(const edge of [0,1,2,3])for(let i=0;i<16;i++){
  const a=i/8-1,u=edge===0?a:edge===1?1:edge===2?-a:-1,v=edge===0?-1:edge===1?a:edge===2?1:-a;
  points.push(new T.Vector3(width/2*u*(1-.08*Math.abs(v)**6),height*(.3+.025*Math.sin(u*3+v*5)),depth/2*v*(1-.08*Math.abs(u)**6)));
 }
 const path=new T.CatmullRomCurve3(points,true,'centripetal'),geometry=new T.TubeGeometry(path,128,.0015,5,true),uv=geometry.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*path.getLength()/1.8,uv.getY(i)*Math.PI*.003/1.8);
 return geometry;
}

export function quiltGeometry(width:number,depth:number,mattressTop:number){
 const edge=width/2-.042,radius=.07,fall=.23;
 return shell(72,28,(s,t,upper)=>{
  const u=s*2-1,side=Math.sign(u),a=Math.abs(u),hanging=Math.max(0,(a-.76)/.24);
  let x=u/.76*edge,y=0,nx=0,ny=1,length=x;
  if(hanging>0){
   const angle=Math.min(1,hanging/.32)*Math.PI/2,drop=Math.max(0,(hanging-.32)/.68)*fall;
   nx=side*Math.sin(angle);ny=Math.cos(angle);x=side*(edge+radius*Math.sin(angle));y=-radius*(1-Math.cos(angle))-drop;
   length=side*(edge+radius*angle+drop);
   x+=side*.006*Math.sin(t*23+.7)*Math.sin(Math.min(1,hanging/.32)*Math.PI/2);
  }
  const z=-depth*.46+t*depth*.58+.009*Math.sin(u*6+1)*Math.sin(Math.PI*t);
  const quilted=Math.abs(Math.sin(x*Math.PI/.26)*Math.sin(z*Math.PI/.26));
  const rumple=.022*Math.exp(-(((x-.18-.12*Math.sin(z*5))/.18)**2))*Math.sin(t*Math.PI)**2+.014*Math.exp(-(((x+.6+.14*Math.sin(z*3))/.12)**2))*Math.sin(t*Math.PI);
  const folds=.006+.018*quilted**.55+rumple+.012*Math.exp(-(((t-.95)/.07)**2));
  const thickness=upper?folds:0;
  return [x+nx*thickness,mattressTop+y+ny*thickness,z,length,z];
 });
}
