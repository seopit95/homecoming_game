import * as T from 'three';
import {sharePrintedTexture,softBox,surface} from './materials.ts';

const korean='"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
const ink='#2d3d36',green='#3f5d50',sheet='#dedbcf';

function canvas(width:number,height:number){
 const c=document.createElement('canvas');c.width=width;c.height=height;return {c,g:c.getContext('2d')!};
}
function lettering(g:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,weight=500,color=ink,align:CanvasTextAlign='left'){
 g.font=`${weight} ${size}px ${korean}`;g.fillStyle=color;g.textAlign=align;g.textBaseline='middle';g.fillText(text,x,y);
}
function printed(c:HTMLCanvasElement,key:(string|number|boolean)[]){
 const map=sharePrintedTexture(new T.CanvasTexture(c),['apartment-signage-v129',...key]);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}

export type ApartmentPlaqueOptions={
 text:string;code?:string;subtitle?:string;width:number;height:number;
 /** Rear mounting plane; the case projects 27 mm along its local +Z. */
 position:[number,number,number];rotationY?:number;name?:string;lit?:boolean;
};

/** A modest enamel insert in a screwed, wall-mounted painted metal case. No light or collider. */
export function createApartmentPlaque(parent:T.Object3D,options:ApartmentPlaqueOptions){
 const {text,code='',subtitle='',width:w,height:h,position,rotationY=0,name='apartment-plaque',lit=false}=options;
 const {c,g}=canvas(1024,Math.max(160,Math.round(1024*h/w))),H=c.height;
 const bg=lit?'#344c40':sheet,fg=lit?'#e0e6ce':ink;
 g.fillStyle=bg;g.fillRect(0,0,1024,H);g.fillStyle=lit?'#4a6050':'#c9c6b9';g.fillRect(0,0,1024,3);g.fillRect(0,H-3,1024,3);
 const left=code?220:58,right=970,available=right-left;
 if(code){
  g.fillStyle=green;g.fillRect(0,0,164,H);
  const size=H*.34;g.font=`650 ${size}px ${korean}`;
  const measured=g.measureText?.(code).width??size*code.length*.65;
  lettering(g,code,82,H/2,size*Math.min(1,138/Math.max(1,measured)),650,'#e3e4d6','center');
 }
 else{g.fillStyle=green;g.fillRect(28,H*.24,5,H*.52);}
 const titleSize=Math.min(H*(subtitle ? .38 : .52),available/(text.length+.35));
 lettering(g,text,left,H*(subtitle ? .36 : .51),titleSize,700,fg);
 if(subtitle)lettering(g,subtitle,left,H*.75,Math.min(H*.205,available/(subtitle.length+.35)),500,lit?'#c1cbb4':'#657067');
 const group=new T.Group();group.name=name;group.position.set(...position);group.rotation.y=rotationY;group.userData.apartmentPlaque=true;parent.add(group);
 const metal=surface('paintedMetal','#777d73',{metalness:.35,roughness:.65});
 const backing=new T.Mesh(softBox(w+.048,h+.048,.026,.004),metal);backing.name=`${name}-backing`;backing.position.z=.013;backing.receiveShadow=true;group.add(backing);
 // The narrow raised rim encloses the insert without masking any printed letters.
 for(const [x,y,ww,hh] of [[0,-h/2-.012,w+.048,.012],[0,h/2+.012,w+.048,.012],[-w/2-.012,0,.012,h],[w/2+.012,0,.012,h]]){
  const rim=new T.Mesh(new T.BoxGeometry(ww,hh,.005),metal);rim.position.set(x,y,.026);group.add(rim);
 }
 const fastener=new T.MeshStandardMaterial({color:'#555c54',metalness:.6,roughness:.58});
 for(const x of [-w/2-.012,w/2+.012])for(const y of [-h/2-.012,h/2+.012]){
  const screw=new T.Mesh(new T.CylinderGeometry(.004,.004,.003,8),fastener);screw.name=`${name}-${x}-${y}-screw`;screw.rotation.x=Math.PI/2;screw.position.set(x,y,.028);group.add(screw);
  const slot=new T.Mesh(new T.BoxGeometry(.005,.0009,.0005),new T.MeshStandardMaterial({color:'#343a34',roughness:.9}));slot.position.set(x,y,.0297);group.add(slot);
 }
 const map=printed(c,['code-fit',text,code,subtitle,w,h,lit]),material=lit?new T.MeshBasicMaterial({map}):new T.MeshStandardMaterial({map,roughness:.87});
 const face=new T.Mesh(new T.PlaneGeometry(w,h),material);face.name=`${name}-face`;face.position.z=.0265;face.userData.text=text;group.add(face);
 return {group,face};
}

/** Schematic follows the actual west guard room, north archive and two-flight B1 connection. */
export function apartmentEvacuationTexture(){
 const {c,g}=canvas(1536,952);
 const planInk='#111c15',routeInk='#1b4530',warningInk='#59281f';
 g.fillStyle=sheet;g.fillRect(0,0,1536,952);g.fillStyle='#cdcabe';g.fillRect(0,0,1536,9);g.fillRect(0,943,1536,9);
 g.fillStyle=green;g.fillRect(62,48,112,112);lettering(g,'1F',118,104,48,700,'#e7e7d8','center');
 lettering(g,'백로아파트',210,62,25,600,'#647166');lettering(g,'1층 피난안내도',210,119,59,750);
 lettering(g,'비상시 북측 연결문을 이용하십시오',1468,126,25,500,'#536456','right');
 g.fillStyle='#637163';g.fillRect(62,185,1410,3);
 // Flush plan outlines and door gaps describe rooms; nothing is added to the walkable world.
 const outline=(x:number,y:number,w:number,h:number)=>{g.fillStyle='#34443a';g.fillRect(x,y,w,h);g.fillStyle='#eeede3';g.fillRect(x+11,y+11,w-22,h-22);};
 outline(83,393,550,416);outline(83,474,190,178);outline(226,229,407,171);outline(758,229,212,171);outline(758,506,212,151);
 g.fillStyle='#eeede3';g.fillRect(530,389,61,16);g.fillRect(626,283,14,61);g.fillRect(751,283,14,61);g.fillRect(840,393,50,16);g.fillRect(840,499,50,16);g.fillRect(266,548,14,47);
 // A muted green continuous route is distinct from red closed-entrance/current-position marks.
 const route=[[155,729],[560,729],[560,313],[865,313],[865,572]];
 g.strokeStyle=routeInk;g.lineWidth=16;g.lineJoin='round';g.beginPath();g.moveTo(...route[0] as [number,number]);for(const [x,y] of route.slice(1))g.lineTo(x,y);g.stroke();
 const arrow=(x:number,y:number,dx:number,dy:number)=>{g.beginPath();g.moveTo(x-dx*20-dy*13,y-dy*20+dx*13);g.lineTo(x,y);g.lineTo(x-dx*20+dy*13,y-dy*20-dx*13);g.stroke();};
 arrow(560,440,0,-1);arrow(700,313,1,0);arrow(865,469,0,1);
 lettering(g,'관리문서 보관실',429,269,39,750,planInk,'center');
 lettering(g,'비상계단',864,265,35,750,planInk,'center');lettering(g,'B1 주차장',864,615,34,750,planInk,'center');
 lettering(g,'경비실',177,514,38,750,planInk,'center');lettering(g,'열쇠 보관',177,616,26,650,planInk,'center');
 lettering(g,'공동현관',420,605,42,750,planInk,'center');
 g.fillStyle=warningInk;g.fillRect(141,715,28,28);g.fillStyle=sheet;g.fillRect(151,725,8,8);lettering(g,'현위치',154,776,32,750,warningInk,'center');
 g.fillStyle=warningInk;g.fillRect(620,669,20,77);lettering(g,'정문 폐쇄',681,699,28,750,warningInk);
 lettering(g,'북 ↑',88,255,28,700,planInk);
 // Deliberately short legend: navigation, hazard and one familiar apartment evacuation rule.
 g.fillStyle='#637163';g.fillRect(1024,230,3,584);
 lettering(g,'피난 동선',1090,258,39,750,planInk);g.strokeStyle=routeInk;g.lineWidth=12;g.beginPath();g.moveTo(1091,319);g.lineTo(1430,319);g.stroke();arrow(1430,319,1,0);
 lettering(g,'북측 연결문 이용',1090,385,32,750,planInk);lettering(g,'관리문서 보관실을 지나',1090,438,27,650,planInk);lettering(g,'비상계단으로 이동',1090,479,27,650,planInk);
 lettering(g,'정문 통행 불가',1090,592,32,750,warningInk);lettering(g,'낙하물 위험 · 출입 금지',1090,644,27,650,planInk);
 g.fillStyle='#637163';g.fillRect(62,862,1410,3);lettering(g,'화재 시 승강기 사용 금지',76,905,30,700,planInk);lettering(g,'1층 · 지하 연결 개략도',1467,907,24,600,planInk,'right');
 return printed(c,['1f-evacuation-plan-contrast']);
}
