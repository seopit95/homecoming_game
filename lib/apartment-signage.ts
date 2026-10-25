import * as T from 'three';
import {sharePrintedTexture,softBox,surface} from './materials.ts';
import {apartmentEscapeLayout} from './escape-layout.ts';

const korean='"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';
const ink='#2d3d36',green='#3f5d50',sheet='#dedbcf';

function canvas(width:number,height:number){
 const c=document.createElement('canvas');c.width=width;c.height=height;return {c,g:c.getContext('2d')!};
}
function lettering(g:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,weight=500,color=ink,align:CanvasTextAlign='left'){
 g.font=`${weight} ${size}px ${korean}`;g.fillStyle=color;g.textAlign=align;g.textBaseline='middle';g.fillText(text,x,y);
}
function printed(c:HTMLCanvasElement,key:(string|number|boolean)[]){
 const map=sharePrintedTexture(new T.CanvasTexture(c),['apartment-signage-v134',...key]);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}

export type ApartmentPlaqueOptions={
 text:string;code?:string;subtitle?:string;width:number;height:number;
 /** Rear mounting plane; the case projects 27 mm along its local +Z. */
 position:[number,number,number];rotationY?:number;name?:string;lit?:boolean;
};

/** Worn stencil lettering on a matte, wall-mounted steel plate. */
export function createApartmentPlaque(parent:T.Object3D,options:ApartmentPlaqueOptions){
 const {text,code='',subtitle='',width:w,height:h,position,rotationY=0,name='apartment-plaque',lit=false}=options;
 const {c,g}=canvas(1024,Math.max(160,Math.round(1024*h/w))),H=c.height;
 const bg='#272729',fg='#d7d1c5';
 g.fillStyle=bg;g.fillRect(0,0,1024,H);
 // Edge wear has a stable pattern per plate size; the centre stays legible.
 for(let i=0;i<176;i++){const x=(i*137+text.length*29)%1024,y=i%2?H-3-(i*7%18):i*11%19;g.fillStyle=i%3?'#373431':'#62554a';g.fillRect(x,y,2+i%17,1+i%3);}
 g.fillStyle='#696158';g.fillRect(18,16,988,1);g.fillRect(18,H-17,988,1);
 const left=code?202:58,right=966,available=right-left;
 if(code){
  g.fillStyle='#686055';g.fillRect(173,H*.22,1,H*.56);
  const size=H*.34;g.font=`650 ${size}px ${korean}`;
  const measured=g.measureText?.(code).width??size*code.length*.65;
  lettering(g,code,91,H/2,size*Math.min(1,138/Math.max(1,measured)),650,'#b8aa95','center');
 }
 else{g.fillStyle='#8b6655';g.fillRect(29,H*.30,3,H*.40);}
 const titleSize=Math.min(H*(subtitle ? .38 : .52),available/(text.length+.35));
 lettering(g,text,left,H*(subtitle ? .36 : .51),titleSize,700,fg);
 if(subtitle)lettering(g,subtitle,left,H*.75,Math.min(H*.205,available/(subtitle.length+.35)),500,'#a6a097');
 const group=new T.Group();group.name=name;group.position.set(...position);group.rotation.y=rotationY;group.userData.apartmentPlaque=true;parent.add(group);
 const metal=surface('paintedMetal','#393736',{metalness:.5,roughness:.84});
 const backing=new T.Mesh(softBox(w+.048,h+.048,.026,.004),metal);backing.name=`${name}-backing`;backing.position.z=.013;backing.receiveShadow=true;group.add(backing);
 // The narrow raised rim encloses the insert without masking any printed letters.
 for(const [x,y,ww,hh] of [[0,-h/2-.012,w+.048,.012],[0,h/2+.012,w+.048,.012],[-w/2-.012,0,.012,h],[w/2+.012,0,.012,h]]){
  const rim=new T.Mesh(new T.BoxGeometry(ww,hh,.005),metal);rim.position.set(x,y,.026);group.add(rim);
 }
 const fastener=new T.MeshStandardMaterial({color:'#625b54',metalness:.6,roughness:.68});
 for(const x of [-w/2-.012,w/2+.012])for(const y of [-h/2-.012,h/2+.012]){
  const screw=new T.Mesh(new T.CylinderGeometry(.004,.004,.003,8),fastener);screw.name=`${name}-${x}-${y}-screw`;screw.rotation.x=Math.PI/2;screw.position.set(x,y,.028);group.add(screw);
  const slot=new T.Mesh(new T.BoxGeometry(.005,.0009,.0005),new T.MeshStandardMaterial({color:'#262423',roughness:.9}));slot.position.set(x,y,.0297);group.add(slot);
 }
 const map=printed(c,['stencilled-steel',text,code,subtitle,w,h,lit]),material=new T.MeshStandardMaterial({map,roughness:.88,emissiveMap:lit?map:null,emissive:'#d4c9b5',emissiveIntensity:lit?.2:0});
 const face=new T.Mesh(new T.PlaneGeometry(w,h),material);face.name=`${name}-face`;face.position.z=.0265;face.userData.text=text;group.add(face);
 return {group,face};
}

/** One continuous schematic of the real foyer, small office and B1 route. */
export function apartmentEvacuationTexture(){
 const {c,g}=canvas(1536,1152),planInk='#17251c',routeInk='#28543b',warningInk='#6d3027',unit=24;
 const sx=(x:number)=>320+x*unit,sy=(z:number)=>382-z*unit;
 g.fillStyle=sheet;g.fillRect(0,0,1536,1152);g.fillStyle=green;g.fillRect(56,46,112,108);lettering(g,'1F',112,100,47,700,'#e8e8d8','center');
 lettering(g,'백로아파트',207,61,25,600,'#687368');lettering(g,'1층 피난안내도',207,117,58,750);g.fillStyle='#728071';g.fillRect(56,176,1424,3);
 function room(x:number,z:number,w:number,d:number){const px=sx(x),py=sy(z);g.fillStyle='#39483c';g.fillRect(px,py,w*unit,d*unit);g.fillStyle='#eeede3';g.fillRect(px+5,py+5,w*unit-10,d*unit-10);}
 const A=apartmentEscapeLayout.annex,O=apartmentEscapeLayout.archive;
 room(-A.x,A.z,A.x*2,A.z*2);room(-4.2,1.8,2.6,3.8);
 // The office copy is translated(+3,-16) at the normalized blind-turn handoff.
 const ox=3,oz=-(A.z+6+O.z);room(ox-O.x,oz+O.z,O.x*2,O.z*2);
 g.fillStyle='#eeede3';g.fillRect(sx(-1.6)-5,sy(1.65),10,1.3*unit);g.fillRect(sx(-.65),sy(A.z)-5,1.3*unit,10);g.fillRect(sx(-.7),sy(-A.z)-5,1.4*unit,10);g.fillRect(sx(ox-.7),sy(oz+O.z)-5,1.4*unit,10);g.fillRect(sx(ox-.7),sy(oz-O.z)-5,1.4*unit,10);
 // The open B cabin is drawn behind its1F threshold; A remains a closed stop.
 room(-.9,A.z+2.7,1.8,2.7);g.fillStyle='#eeede3';g.fillRect(sx(-.65),sy(A.z)-5,1.3*unit,10);
 g.fillStyle=warningInk;g.fillRect(sx(-2.85),sy(A.z)-3,1.3*unit,7);lettering(g,'A호기 · 운행 중지',135,222,19,650,warningInk,'center');lettering(g,'B호기',320,222,21,700,planInk,'center');
 const route=[[2.85,3.4],[.4,3.4],[.4,1],[-2.5,1],[-2.5,.35],[-2.5,1],[.4,1],[.4,-4.7],[0,-A.z],[0,-A.z-2],[3,-A.z-2],[3,-A.z-6],[3,oz-O.z],[3,oz-O.z-2],[6,oz-O.z-2],[6,oz-O.z-6]];
 g.strokeStyle=routeInk;g.lineWidth=7;g.lineJoin='round';g.beginPath();g.moveTo(sx(route[0][0]),sy(route[0][1]));for(const [x,z]of route.slice(1))g.lineTo(sx(x),sy(z));g.stroke();
 function arrow(x:number,z:number,dx:number,dz:number){const px=sx(x),py=sy(z),dy=-dz;g.beginPath();g.moveTo(px-dx*11-dy*7,py-dy*11+dx*7);g.lineTo(px,py);g.lineTo(px-dx*11+dy*7,py-dy*11-dx*7);g.stroke();}
 arrow(.4,-2.8,0,-1);arrow(1.8,-A.z-2,1,0);arrow(3,oz-2.5,0,-1);arrow(6,oz-O.z-4.5,0,-1);
 lettering(g,'경비실',sx(-2.9),sy(1.35),18,750,planInk,'center');lettering(g,'열쇠',sx(-2.9),sy(-1.4),16,650,planInk,'center');lettering(g,'공동현관',sx(1.2),sy(-2.9),27,750,planInk,'center');
 g.fillStyle=warningInk;g.beginPath();g.arc(sx(2.85),sy(3.4),7,0,Math.PI*2);g.fill();lettering(g,'현위치',452,sy(3.4),24,750,warningInk);
 g.fillRect(sx(A.x)-3,sy(2.1),7,3.2*unit);lettering(g,'정문 폐쇄',464,sy(.5),22,700,warningInk);
 // Desk stations match the actual office's west records and east CCTV desk.
 for(const [n,x,z]of[[1,-1.85,1.7],[2,-1.85,-.7],[3,1.85,1.7]]){g.fillStyle='#b5b79f';g.fillRect(sx(ox+x)-15,sy(oz+z)-9,30,18);lettering(g,String(n),sx(ox+x),sy(oz+z),16,700,planInk,'center');}
 g.fillStyle='#eeede3';g.fillRect(sx(ox)-68,sy(oz+3.1)-15,136,30);lettering(g,'관리사무소',sx(ox),sy(oz+3.1),24,750,planInk,'center');lettering(g,'CCTV',sx(ox+1.85),sy(oz-2.55),19,700,planInk,'center');
 room(4.5,oz-O.z-5.7,3,2.1);lettering(g,'B1 비상계단',sx(6),sy(oz-O.z-6.4),22,750,planInk,'center');lettering(g,'B1 주차장',sx(6),sy(oz-O.z-7.3),22,750,planInk,'center');
 lettering(g,'북 ↑',80,258,25,700,planInk);
 g.fillStyle='#728071';g.fillRect(690,232,3,820);lettering(g,'주차장으로 가는 길',756,265,43,750,planInk);
 for(const [text,y]of[['B호기 → 공동현관',345],['경비실 책상에서 관리용 열쇠',410],['관리사무소: 세 기록 확인',475],['CCTV 재생 후 B1 비상계단',540],['계단을 내려가 B1 주차장',605]] as const)lettering(g,text,756,y,31,650,planInk);
 lettering(g,'정문 통행 불가',756,744,35,750,warningInk);lettering(g,'보수 작업 · 낙하물 위험',756,798,29,650,warningInk);lettering(g,'승강기는 지하로 연결되지 않습니다',756,897,27,650,planInk);lettering(g,'이 도면은 연결 개략도입니다',756,966,25,500,'#667363');
 g.fillStyle='#728071';g.fillRect(56,1095,1424,3);lettering(g,'화재 시 승강기 사용 금지',70,1121,27,700,planInk);lettering(g,'공동현관 · 관리사무소 · B1',1465,1121,25,600,planInk,'right');
 return printed(c,['1f-ground-support-v133']);
}
