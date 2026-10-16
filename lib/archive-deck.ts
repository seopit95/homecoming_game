import * as T from 'three';
import {softBox,surface} from './materials.ts';
import type {Action} from './story.ts';

export function createArchiveDeck(){
 const root=new T.Group();root.name='archive-review-deck';
 const paint=surface('paintedMetal','#6d766e',{roughness:.64,metalness:.38}),steel=surface('steel','#848a80',{roughness:.48,metalness:.7}),rubber=new T.MeshStandardMaterial({color:'#202824',roughness:.92}),ivory=new T.MeshStandardMaterial({color:'#a7aa95',roughness:.68}),red=new T.MeshStandardMaterial({color:'#7a3a32',roughness:.63});
 const controls:{id:Action;label:string;mesh:T.Mesh}[]=[];
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root){const mesh=new T.Mesh(softBox(w,h,d,Math.min(.006,h/3)),m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function print(parent:T.Object3D,text:string,w:number,d:number,x:number,y:number,z:number,background:string,ink:string){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*d/w);const ctx=canvas.getContext('2d')!;ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=ink;ctx.font=`${Math.min(canvas.height*.65,700/Math.max(text.length,1))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,canvas.height/2);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const label=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:tex,roughness:.88}));label.rotation.x=-Math.PI/2;label.position.set(x,y,z);parent.add(label);}
 for(const x of [-.27,.27])for(const z of [-.12,.12]){const foot=new T.Mesh(new T.CylinderGeometry(.019,.019,.015,16),rubber);foot.name='archive-deck-foot';foot.position.set(x,.0075,z);root.add(foot);}
 box('archive-deck-case',0,.0625,0,.68,.095,.34,paint);
 const top=box('archive-deck-top',0,.112,0,.666,.004,.326,steel);
 print(root,'BAEKRO  /  EDIT CONTROL',.35,.022,-.1,.1144,-.143,'#81867c','#27322c');
 for(const x of [-.308,.308])for(const z of [-.142,.142]){const screw=new T.Mesh(new T.CylinderGeometry(.004,.004,.002,10),rubber);screw.position.set(x,.115,z);root.add(screw);}
 function key(id:Action,title:string,caption:string,x:number,z:number,material:T.Material=ivory){box('control-recess',x,.115,z,.098,.002,.061,rubber);const mesh=box(id,x,.122,z,.086,.014,.05,material);print(mesh,caption,.07,.027,0,.0074,0,material===red?'#7a3a32':'#a7aa95',material===red?'#c9c5ab':'#28332c');controls.push({id,label:title,mesh});return mesh;}
 for(const [i,source,title] of [[0,'road','A 도로 · 1'],[1,'call','B 통화 · 2'],[2,'gate','C 입차 · 3']] as const)key(`archive_preview_${source}`,title+' 원본 재생',String(i+1)+' / '+source.toUpperCase(),-.23+i*.115,-.075);
 key('archive_record_back','1초 되감기 · ←','−1',-.23,.067);key('archive_record_pause','정지 / 재생 · Space','Ⅱ / ▶',-.115,.067);key('archive_record_forward','1초 앞으로 · →','+1',0,.067);key('archive_record_mark','증거 표시 · Enter','MARK',.22,.095,red);
 const jog=new T.Mesh(new T.CylinderGeometry(.057,.057,.018,48),rubber);jog.position.set(.22,.124,-.047);root.add(jog);
 const dial=new T.Mesh(new T.CylinderGeometry(.049,.049,.012,48),steel);dial.position.set(.22,.136,-.047);root.add(dial);
 for(let i=0;i<16;i++){const a=i*Math.PI/8,mark=box('jog-grip',.22+Math.sin(a)*.046,.1423,-.047+Math.cos(a)*.046,.002,.001,.006,rubber);mark.rotation.y=a;}
 print(root,'JOG / FRAME',.11,.016,.22,.1144,-.128,'#81867c','#27322c');
 for(let i=0;i<9;i++)box('deck-front-vent',-.26+i*.032,.057,.1702,.018,.004,.001,rubber);
 const power=new T.Mesh(new T.CylinderGeometry(.006,.006,.014,12),rubber);power.rotation.x=Math.PI/2;power.position.set(-.26,.065,-.174);root.add(power);
 const link=new T.Mesh(new T.CylinderGeometry(.009,.009,.014,12),steel);link.rotation.x=Math.PI/2;link.position.set(.15,.065,-.174);root.add(link);
 const guide=box('archive-deck-guide',-.62,.001,0,.46,.002,.16,ivory);
 for(const [line,z] of [['1 · 2 · 3  원본 선택',-.047],['Space  정지 / 재생',-.016],['← · →  1초     Enter  표시',.016],['사건이 드러난 순간에 표시할 것',.048]] as const)print(guide,line,.43,.022,0,.0013,z,'#a7aa95','#28332c');
 return {root,controls,top,power:new T.Vector3(-.26,.065,-.181),link:new T.Vector3(.15,.065,-.181)};
}
