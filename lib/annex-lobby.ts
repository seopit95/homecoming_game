import * as T from 'three';
import {surface,softBox,boxUV} from './materials.ts';
import {roundPipe} from './props.ts';
import {wetTexture} from './entry-props.ts';
import {batchStaticGeometry} from './static-geometry.ts';
import type {Solid} from './world.ts';

// World coordinates match the existing east facade and lift arrival corridor.
export function buildAnnexLobby(root:T.Group,solids:Solid[],lamps:T.PointLight[]){
 const lobby=new T.Group();lobby.name='annex-front-lobby';root.add(lobby);
 const plaster=surface('decayWall','#a7ab9c'),lower=surface('wall','#4b6054'),stone=surface('concrete','#777e73'),steel=surface('steel','#6f7771',{roughness:.6,metalness:.55}),paint=surface('paintedMetal','#646f67'),wood=surface('wood','#786a51'),black=new T.MeshStandardMaterial({color:'#202b28',roughness:.84});
 const glass=new T.MeshPhysicalMaterial({color:'#9eafa1',roughness:.18,metalness:.08,transparent:true,opacity:.14,side:T.DoubleSide,depthWrite:false});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,solid=false,parent:T.Group=lobby){const mesh=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.009,h/3,w/3,d/3)),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=!m.transparent;mesh.receiveShadow=true;parent.add(mesh);if(solid)solids.push({x,y,z,w,h,d});return mesh;}
 function sign(text:string,x:number,y:number,z:number,w:number,h:number,ry:number,parent:T.Group=lobby){const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);const ctx=c.getContext('2d')!,lines=text.split('\n'),size=Math.min(c.height/(lines.length*1.5),700/Math.max(...lines.map(s=>s.length)));ctx.fillStyle='#b6b19b';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#24312c';ctx.font=`${size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((s,i)=>ctx.fillText(s,384,c.height/2+(i-(lines.length-1)/2)*size*1.35));const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.93}));mesh.position.set(x,y,z);mesh.rotation.y=ry;parent.add(mesh);return mesh;}
 // The corridor sidelight is a real aperture. The low sill still stops bodies.
 box(2,.5,30.5,.15,1,2.6,lower,true);box(2,2.645,30.5,.15,.31,2.6,plaster,true);
 for(const z of [29.24,30.5,31.76])box(2,1.745,z,.18,1.49,.055,steel);
 for(const y of [1.04,2.45])box(2,y,30.5,.21,.08,2.6,steel);
 const sidelight=box(2,1.745,30.5,.012,1.33,2.46,glass);sidelight.name='annex-corridor-glazing';
 // A foyer separated from the staff room, with two usable connecting openings.
 for(const [a,b] of [[2.08,2.8],[4.2,13.3],[14.7,16.91]]){box((a+b)/2,1.4,24.8,b-a,2.8,.14,plaster,true);box((a+b)/2,.43,24.72,b-a,.86,.035,lower);}
 for(const x of [3.5,14]){box(x,2.58,24.8,1.4,.44,.14,plaster);for(const dx of [-.7,.7])box(x+dx,1.16,24.8,.055,2.32,.19,steel);}
 sign('경비 휴게실',3.5,2.56,24.8705,1.15,.22,0);sign('정문 로비',14,2.56,24.7295,1.1,.22,Math.PI);
 // Double glass door and fixed sidelights, all held in an aged metal frame.
 const door=new T.Group();door.name='annex-street-door';lobby.add(door);
 for(const z of [27.68,28.18,29.5,30.82,31.32])box(17,1.25,z,.10,2.5,.07,steel);
 for(const y of [.08,.2,2.42])box(17,y,29.5,.12,.075,3.72,steel);
 for(const [z,d] of [[27.93,.43],[28.84,1.25],[30.16,1.25],[31.07,.43]])box(16.995,1.3,z,.018,2.16,d,glass,false,door);
 for(const z of [29.36,29.64]){for(const y of [.96,1.23])roundPipe(door,[16.99,y,z],[16.88,y,z],.012,steel);roundPipe(door,[16.88,.96,z],[16.88,1.23,z],.014,steel);}
 solids.push({x:17,y:1.25,z:29.5,w:.15,h:2.5,d:3.8});
 sign('정문  /  당기세요',16.9855,1.68,30.16,1.05,.15,-Math.PI/2,door);
 for(let i=0;i<13;i++){const link=new T.Mesh(new T.TorusGeometry(.018,.0035,6,16),steel);link.position.set(16.865,1.09,29.34+i*.025);if(i%2)link.rotation.x=Math.PI/2;else link.rotation.y=Math.PI/2;door.add(link);}
 const lockMetal=new T.MeshStandardMaterial({color:'#7c7153',roughness:.62,metalness:.58});box(16.86,1.035,29.5,.045,.055,.05,lockMetal,false,door);const shackle=new T.Mesh(new T.TorusGeometry(.022,.004,8,20),steel);shackle.rotation.y=Math.PI/2;shackle.position.set(16.86,1.077,29.5);door.add(shackle);
 const shutter=new T.Group();shutter.name='annex-front-shutter';lobby.add(shutter);
 for(const z of [27.66,31.34])box(17.22,1.25,z,.12,2.5,.08,paint,false,shutter);
 box(17.22,2.62,29.5,.35,.27,3.84,paint,false,shutter);box(17.22,.065,29.5,.075,.13,3.6,paint,false,shutter);
 for(let y=.17;y<2.5;y+=.13)box(17.22,y,29.5,.055,.022,3.6,paint,false,shutter);
 for(const z of [28.1,28.8,29.5,30.2,30.9])box(17.22,1.29,z,.047,2.4,.026,steel,false,shutter);
 // Stained control enclosure explains the dead shutter without a magic lock.
 box(16.79,.91,32.2,.28,.48,.3,paint);box(16.6425,.91,32.2,.025,.44,.26,black);
 sign('누전 · 작동 금지\n중정 우회',16.629,.91,32.2,.25,.37,-Math.PI/2);
 roundPipe(lobby,[16.84,1.15,32.2],[16.84,2.58,32.2],.013,steel);roundPipe(lobby,[16.84,2.58,32.2],[17.22,2.58,31.3],.013,steel);
 const damp=new T.Mesh(new T.PlaneGeometry(.65,1.2),new T.MeshPhysicalMaterial({map:wetTexture(false,7101),color:'#3c4b40',transparent:true,opacity:.26,roughness:.23,depthWrite:false}));damp.rotation.y=-Math.PI/2;damp.position.set(16.908,1.43,32.2);lobby.add(damp);
 const water=new T.Mesh(new T.PlaneGeometry(2.9,2.8),new T.MeshPhysicalMaterial({map:wetTexture(false,7102),color:'#33443d',roughness:.09,transparent:true,opacity:.35,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.set(15.4,.009,31.1);lobby.add(water);
 // Original benches and a recessed mat give the foyer a lived-in scale.
 const bench=new T.Group();bench.name='annex-lobby-bench';lobby.add(bench);
 for(const x of [11.2,12.8])for(const z of [33.1,33.52])box(x,.225,z,.035,.45,.035,steel,true,bench);
 for(const z of [33.08,33.24,33.4,33.56])box(12,.468,z,2,.036,.12,wood,false,bench);
 for(const x of [11.2,12.8])box(x,.64,33.53,.035,.42,.035,steel,false,bench);box(12,.79,33.55,2,.18,.035,wood,false,bench);
 solids.push({x:12,y:.45,z:33.3,w:2.1,h:.9,d:.65});
 box(15.6,.008,29.5,1.4,.016,2.1,black);for(let z=28.55;z<30.5;z+=.09)box(15.6,.017,z,1.3,.003,.012,steel);
 // The actual outside is scenery beyond the playable facade, never a painted wall.
 const street=new T.Group();street.name='annex-street-vista';lobby.add(street);
 box(19.5,-.1,30,4.98,.2,16,stone,false,street);box(21.88,-.085,30,.16,.23,16,stone,false,street);box(25,-.21,30,6.2,.18,22,surface('garage','#424d4b',{roughness:.4}),false,street);
 for(const z of [21,24.5,28,31.5,35,38.5])box(25,-.115,z,.08,.008,1.5,new T.MeshStandardMaterial({color:'#aba783',roughness:.82}),false,street);
 box(28.05,3.85,30,.3,8.3,24,plaster,false,street);
 for(const z of [22,26,30,34,38]){box(27.895,3.3,z,.025,1.4,1.4,black,false,street);box(27.875,3.3,z,.035,.06,1.4,steel,false,street);box(27.875,3.3,z,.035,1.4,.055,steel,false,street);}
 for(const z of [24,27,30,33,36]){box(21.3,.45,z,.07,.9,.07,steel,false,street);box(21.3,.025,z,.2,.05,.2,stone,false,street);}roundPipe(street,[21.3,.78,24],[21.3,.78,36],.018,steel);
 roundPipe(street,[21.6,0,32.6],[21.6,3.6,32.6],.045,paint);roundPipe(street,[21.6,3.6,32.6],[22.3,3.6,32.6],.035,paint);box(22.3,3.57,32.6,.5,.12,.2,paint,false,street);
 const glow=new T.Mesh(new T.PlaneGeometry(.42,.16),new T.MeshBasicMaterial({color:'#b7c9b1'}));glow.rotation.x=Math.PI/2;glow.position.set(22.3,3.505,32.6);street.add(glow);
 const light=new T.PointLight('#acc4b1',7,13,2);light.position.set(22.3,3.45,32.6);light.userData.base=7;root.add(light);lamps.push(light);
 const board=box(-1.92,1.52,29,.04,1.18,1.9,paint);board.name='annex-route-board-backing';
 const map=sign('백로아파트 · 공동시설 1층\n정문 → 동측 로비 / 셔터 고장\n서측: 우편실 · 세탁실\n동측: 경비 휴게실 · 통신실\n우회: 북쪽 중정 → 지하 → 주차장',-1.8995,1.52,29,1.8,1.08,Math.PI/2);
 for(const y of [1.0,2.04])for(const z of [28.14,29.86]){const bolt=new T.Mesh(new T.CylinderGeometry(.009,.009,.006,8),steel);bolt.rotation.z=Math.PI/2;bolt.position.set(-1.897,y,z);lobby.add(bolt);}
 batchStaticGeometry(door,[]);batchStaticGeometry(shutter,[]);batchStaticGeometry(bench,[]);batchStaticGeometry(street,[]);batchStaticGeometry(lobby,[map]);
 return {root:lobby,door,shutter,street,map,frontPoint:new T.Vector3(16.86,1.10,29.64)};
}
