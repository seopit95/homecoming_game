import * as T from 'three';
import {surface,softBox,boxUV} from './materials.ts';
export function roundPipe(parent:T.Object3D,a:number[],b:number[],radius:number,material:T.Material){
  const start=new T.Vector3(...a as [number,number,number]),end=new T.Vector3(...b as [number,number,number]);
  const pipe=new T.Mesh(new T.CylinderGeometry(radius,radius,start.distanceTo(end),12),material);pipe.position.copy(start).add(end).multiplyScalar(.5);pipe.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());pipe.castShadow=true;pipe.receiveShadow=true;parent.add(pipe);return pipe;
}
function box(parent:T.Object3D,p:number[],size:number[],m:T.Material){const g=boxUV(softBox(...size as [number,number,number]),...p as [number,number,number]);const mesh=new T.Mesh(g,m);mesh.position.set(...p as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function basin(width:number,depth:number,metal=false){
  const root=new T.Group();root.name=metal?'recessed-steel-sink':'recessed-porcelain-basin';
  const material=surface(metal?'steel':'ceramic','#d3d8d5',{roughness:metal?.3:.22,metalness:metal?.6:0});
  const profile=[[0,-.2],[.24,-.2],[.42,-.15],[.47,-.02],[.5,0],[.53,0],[.53,-.025],[.49,-.035],[.44,-.175],[.24,-.22],[0,-.22]].map(([r,y])=>new T.Vector2(r,y));
  const bowl=new T.Mesh(new T.LatheGeometry(profile.reverse(),48),material);bowl.scale.set(width,1,depth);bowl.castShadow=true;bowl.receiveShadow=true;root.add(bowl);
  const chrome=surface('steel','#c7ccca',{roughness:.21,metalness:.8});
  const drain=new T.Mesh(new T.CylinderGeometry(.025,.025,.004,24),chrome);drain.position.y=-.197;root.add(drain);
  for(let i=0;i<5;i++){const a=i*2.4;box(root,[Math.cos(a)*.012,-.194,Math.sin(a)*.012],[.002,.001,.006],new T.MeshStandardMaterial({color:'#222b2b'}));}
  const faucet=new T.CatmullRomCurve3([new T.Vector3(0,.002,-depth*.53),new T.Vector3(0,.19,-depth*.53),new T.Vector3(0,.22,-depth*.17),new T.Vector3(0,.14,-depth*.12)]);
  const tap=new T.Mesh(new T.TubeGeometry(faucet,24,.014,10,false),chrome);tap.castShadow=true;root.add(tap);roundPipe(root,[.06,.006,-depth*.53],[.1,.075,-depth*.53],.012,chrome);
  return root;
}
export function sinkCounter(width:number,depth:number,sinkX:number,sinkWidth:number,sinkDepth:number,sinkZ=0){
  const root=new T.Group();root.name='cut-out-sink-worktop';const material=surface('ceramic','#d0cec3');
  const gapW=sinkWidth*.93,gapD=sinkDepth*.9,left=sinkX-gapW/2,right=sinkX+gapW/2;
  for(const [a,b] of [[-width/2,left],[right,width/2]])if(b>a)box(root,[(a+b)/2,-.03,0],[b-a,.06,depth],material);
  for(const [a,b] of [[-depth/2,sinkZ-gapD/2],[sinkZ+gapD/2,depth/2]])if(b>a)box(root,[sinkX,-.03,(a+b)/2],[gapW,.06,b-a],material);
  const flange=new T.Shape();flange.moveTo(-sinkWidth*.55,-sinkDepth*.55);flange.lineTo(sinkWidth*.55,-sinkDepth*.55);flange.lineTo(sinkWidth*.55,sinkDepth*.55);flange.lineTo(-sinkWidth*.55,sinkDepth*.55);flange.closePath();const hole=new T.Path();hole.absellipse(0,0,sinkWidth*.495,sinkDepth*.495,0,Math.PI*2,true,0);flange.holes.push(hole);const rim=new T.Mesh(new T.ShapeGeometry(flange,40),surface('steel','#d3d8d5',{roughness:.3,metalness:.6,side:T.DoubleSide}));rim.rotation.x=-Math.PI/2;rim.position.set(sinkX,.002,sinkZ);root.add(rim);
  const sink=basin(sinkWidth,sinkDepth,true);sink.position.set(sinkX,.003,sinkZ);root.add(sink);return root;
}
export function cabinet(width:number,height:number,depth:number,material:T.Material){
 const root=new T.Group();root.name='hollow-kitchen-cabinet';
 box(root,[0,.05,0],[width,.1,depth],material);for(const side of [-1,1])box(root,[side*(width/2-.025),height/2,0],[.05,height,depth],material);
 box(root,[0,height/2,-depth/2+.018],[width,height,.036],material);
 const count=Math.ceil(width/.6),chrome=surface('steel','#98a29d',{metalness:.65});
 for(let i=0;i<count;i++){const x=-width/2+(i+.5)*width/count;box(root,[x,height/2,depth/2],[width/count-.008,height-.09,.036],material);roundPipe(root,[x-.09,height-.15,depth/2+.047],[x+.09,height-.15,depth/2+.047],.006,chrome);for(const dx of [-.09,.09])roundPipe(root,[x+dx,height-.15,depth/2+.018],[x+dx,height-.15,depth/2+.047],.006,chrome);}
 return root;
}
export function doorHardware(leaf:T.Object3D,width:number,centerY=0,front=1){
 const metal=surface('steel','#98a09c',{metalness:.65,roughness:.28}),dark=new T.MeshStandardMaterial({color:'#252a28'});
 for(const y of [-.78,.78]){roundPipe(leaf,[-width/2+.025,centerY+y-.055,0],[-width/2+.025,centerY+y+.055,0],.017,metal);}
 const x=width*.34,y=centerY-.12,z=front*.049;
 const rose=new T.Mesh(new T.CylinderGeometry(.032,.032,.008,24),metal);rose.rotation.x=Math.PI/2;rose.position.set(x,y,z);leaf.add(rose);
 roundPipe(leaf,[x,y,z],[x,y,z+front*.07],.011,metal);roundPipe(leaf,[x,y,z+front*.07],[x-.12,y,z+front*.07],.012,metal);
 box(leaf,[0,centerY+.92,front*.06],[.22,.07,.05],metal);roundPipe(leaf,[0,centerY+.955,front*.08],[-.18,centerY+1.035,front*.055],.008,dark);
}
export {createSedan,sedanSolids} from './sedan.ts';

export function bathtub(){
 const root=new T.Group();root.name='built-in-bathtub';
 const profile=[[0,-.5],[.25,-.5],[.4,-.44],[.46,-.1],[.47,-.02],[.5,0],[.52,0],[.52,-.64],[0,-.64]].reverse().map(([r,y])=>new T.Vector2(r,y));
 const geometry=new T.LatheGeometry(profile,64),p=geometry.getAttribute('position');
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);if(r>.0001)p.setXYZ(i,Math.sign(x)*Math.pow(Math.abs(x/r),.34)*r*1.65,p.getY(i),Math.sign(z)*Math.pow(Math.abs(z/r),.34)*r*.88);}
 geometry.computeVertexNormals();const shell=new T.Mesh(geometry,surface('ceramic','#d2d5cb',{roughness:.27}));shell.castShadow=true;shell.receiveShadow=true;root.add(shell);
 const chrome=surface('steel','#abb6b6',{roughness:.25,metalness:.72});
 const drain=new T.Mesh(new T.CylinderGeometry(.027,.027,.004,24),chrome);drain.position.set(.4,-.496,0);root.add(drain);
 roundPipe(root,[.6,.014,-.47],[.6,.13,-.47],.016,chrome);roundPipe(root,[.6,.13,-.47],[.6,.13,-.29],.016,chrome);
 return root;
}
