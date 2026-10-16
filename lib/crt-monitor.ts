import * as T from 'three';
import {softBox} from './materials.ts';

function outline(w:number,h:number,r:number){const x=w/2,y=h/2,s=new T.Shape();s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.quadraticCurveTo(x,-y,x,-y+r);s.lineTo(x,y-r);s.quadraticCurveTo(x,y,x-r,y);s.lineTo(-x+r,y);s.quadraticCurveTo(-x,y,-x,y-r);s.lineTo(-x,-y+r);s.quadraticCurveTo(-x,-y,-x+r,-y);return s;}
export function crtScreenGeometry(w:number,h:number){const g=new T.PlaneGeometry(w,h,16,12),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i)/(w/2),y=p.getY(i)/(h/2);p.setZ(i,.013*(1-x*x)*(1-y*y));}g.computeVertexNormals();return g;}

// A desktop 4:3 CRT. Root y=0 is the supporting desktop, front faces +Z.
export function createCRT(videoCable=false){
 const root=new T.Group();root.name='aged-crt-monitor';const plastic=new T.MeshStandardMaterial({color:'#aaa58e',roughness:.66}),dark=new T.MeshStandardMaterial({color:'#333931',roughness:.78}),rubber=new T.MeshStandardMaterial({color:'#202622',roughness:.96}),metal=new T.MeshStandardMaterial({color:'#777e74',roughness:.55,metalness:.45});
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const mesh=new T.Mesh(softBox(w,h,d),m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;}
 for(const x of [-.13,.13])for(const z of [-.27,-.03])box('crt-rubber-foot',x,.004,z,.04,.008,.035,rubber);
 box('crt-tilt-base',0,.019,-.15,.35,.022,.31,plastic);
 const neck=new T.Mesh(new T.CylinderGeometry(.052,.066,.09,24),dark);neck.position.set(0,.067,-.17);neck.castShadow=true;root.add(neck);
 const contour=outline(.58,.45,.025).getSpacedPoints(96),n=contour.length,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 const sections=[[0,1,.325],[-.06,1,.325],[-.18,.98,.324],[-.36,.88,.319],[-.49,.78,.312]];
 for(let row=0;row<sections.length;row++){const [z,scale,cy]=sections[row];for(let j=0;j<n;j++){positions.push(contour[j].x*scale,contour[j].y*scale+cy,z);uvs.push(j/(n-1),-z/.49);if(row<sections.length-1&&j<n-1){const k=row*n+j;indices.push(k,k+n,k+1,k+1,k+n,k+n+1);}}}
 const center=positions.length/3;positions.push(0,.312,-.49);uvs.push(.5,.5);for(let j=0;j<n-1;j++)indices.push(center,(sections.length-1)*n+j+1,(sections.length-1)*n+j);
 const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(positions,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));shell.setIndex(indices);shell.computeVertexNormals();
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#b0ac96';ctx.fillRect(0,0,512,256);
 let seed=171;for(let i=0;i<1000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%512;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%256;ctx.fillStyle=i%3?'rgba(72,67,51,.045)':'rgba(233,223,183,.07)';ctx.fillRect(x,y,1+i%4,1+i%3);}
 ctx.fillStyle='#3e453d';for(const left of [153,409])for(let i=0;i<9;i++)ctx.fillRect(left+i*7,40,3,151);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;const shellMaterial=plastic.clone();shellMaterial.map=map;shellMaterial.bumpMap=map;shellMaterial.bumpScale=.0007;
 const caseMesh=new T.Mesh(shell,shellMaterial);caseMesh.name='crt-rear-housing';caseMesh.castShadow=caseMesh.receiveShadow=true;root.add(caseMesh);
 const shape=outline(.58,.45,.025),hole=outline(.46,.345,.018);shape.holes.push(new T.Path(hole.getPoints(10).map(p=>p.add(new T.Vector2(0,.012)))));
 const bezel=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.028,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:2,steps:1,curveSegments:10}),plastic);bezel.name='crt-open-bezel';bezel.position.y=.325;bezel.castShadow=bezel.receiveShadow=true;root.add(bezel);
 const backing=new T.Mesh(new T.PlaneGeometry(.47,.36),new T.MeshBasicMaterial({color:'#050a08'}));backing.name='crt-display-backing';backing.position.set(0,.337,.025);root.add(backing);
 const screenMount=new T.Group();screenMount.name='crt-screen-mount';screenMount.position.set(0,.337,.027);screenMount.scale.setScalar(.625);root.add(screenMount);
 const power=new T.Mesh(new T.CylinderGeometry(.009,.009,.005,20),dark);power.rotation.x=Math.PI/2;power.position.set(.225,.126,.032);root.add(power);
 const led=box('crt-power-led',.198,.126,.032,.004,.004,.003,new T.MeshStandardMaterial({color:'#6b8a53',emissive:'#597b48',emissiveIntensity:.5}));led.castShadow=false;
 for(let i=0;i<4;i++)box('crt-adjustment-key',-.19+i*.032,.126,.032,.022,.009,.005,dark);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=48;const ink=labelCanvas.getContext('2d')!;ink.fillStyle='#4f554b';ink.font='23px sans-serif';ink.textAlign='center';ink.textBaseline='middle';ink.fillText('B/W MONITOR',128,24);const labelMap=new T.CanvasTexture(labelCanvas);labelMap.colorSpace=T.SRGBColorSpace;
 const label=new T.Mesh(new T.PlaneGeometry(.095,.018),new T.MeshStandardMaterial({map:labelMap,transparent:true,depthWrite:false,roughness:.85}));label.position.set(.045,.126,.0313);root.add(label);
 for(const x of [-.12,.12]){box('crt-rear-jack',x,.248,-.496,.055,.035,.014,metal);if(x>0||videoCable)box('crt-cable-plug',x,.248,-.511,.034,.022,.016,dark);else{const socket=new T.Mesh(new T.CircleGeometry(.008,16),dark);socket.name='crt-unused-video-socket';socket.rotation.y=Math.PI;socket.position.set(x,.248,-.5032);root.add(socket);}}
 for(const x of [-.17,.17])for(const y of [.18,.44]){const screw=new T.Mesh(new T.CylinderGeometry(.003,.003,.003,10),metal);screw.rotation.x=Math.PI/2;screw.position.set(x,y,-.492);root.add(screw);}
 return {root,screenMount,powerPort:new T.Vector3(.12,.248,-.519),videoPort:new T.Vector3(-.12,.248,-.519)};
}

// Rounded cable elbows stay inside their control polygon, including floor-contact runs.
export function crtCable(root:T.Object3D,points:T.Vector3[]){
 const path=new T.CurvePath<T.Vector3>();let from=points[0];for(let i=1;i<points.length-1;i++){const at=points[i],next=points[i+1],r=Math.min(.06,at.distanceTo(from)*.25,at.distanceTo(next)*.25),a=at.clone().addScaledVector(from.clone().sub(at).normalize(),r),b=at.clone().addScaledVector(next.clone().sub(at).normalize(),r);path.add(new T.LineCurve3(from,a));path.add(new T.QuadraticBezierCurve3(a,at,b));from=b;}path.add(new T.LineCurve3(from,points.at(-1)!));
 const cable=new T.Mesh(new T.TubeGeometry(path,Math.max(48,points.length*12),.0035,6,false),new T.MeshStandardMaterial({color:'#242b26',roughness:.87}));cable.name='crt-connected-cable';cable.castShadow=true;root.add(cable);return cable;
}
export function createCrtSocket(){
 const root=new T.Group();root.name='crt-wall-socket';const plastic=new T.MeshStandardMaterial({color:'#a6a18d',roughness:.8}),dark=new T.MeshStandardMaterial({color:'#33392f',roughness:.9});
 const plate=new T.Mesh(softBox(.086,.13,.016),plastic);plate.position.z=.008;root.add(plate);
 for(const y of [-.027,.027]){const inset=new T.Mesh(new T.CircleGeometry(.019,24),dark);inset.position.set(0,y,.0162);root.add(inset);}
 const plug=new T.Mesh(softBox(.032,.035,.026),plastic);plug.position.set(0,.027,.029);plug.castShadow=true;root.add(plug);
 return {root,lead:new T.Vector3(0,.027,.042)};
}
