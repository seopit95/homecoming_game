import * as T from 'three';
import {softBox,residentPhotoMaterial} from './materials.ts';

// Dimensions are metres; the four rubber feet sit on the supplied cabinet top.
export function createAnsweringMachine(purpose:'answerphone'|'intercom'='answerphone'){
  const root=new T.Group();root.name=purpose==='intercom'?'annex-intercom-phone':'resident-answering-machine';
  const ivory=new T.MeshStandardMaterial({color:'#b9b299',roughness:.57}),edge=new T.MeshStandardMaterial({color:'#6b685d',roughness:.75}),black=new T.MeshStandardMaterial({color:'#171b1a',roughness:.7}),rubber=new T.MeshStandardMaterial({color:'#252825',roughness:.95});
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const o=new T.Mesh(softBox(w,h,d),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
  function pipe(points:T.Vector3[],radius:number,m:T.Material,parent:T.Object3D=root){const o=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(12,points.length*2),radius,6,false),m);o.castShadow=true;parent.add(o);return o;}
  for(const x of [-.133,.133])for(const z of [-.096,.096])box('answerphone-foot',x,.006,z,.026,.012,.024,rubber);
  box('answerphone-case',0,.041,0,.35,.058,.26,ivory);
  // A shallow case seam and upper deck leave a genuine recessed tape window.
  for(const x of [-.175,.175])box('case-seam',x,.033,0,.001,.0018,.22,edge);
  box('receiver-deck',-.112,.075,0,.108,.014,.243,ivory);
  box('control-deck',.058,.075,-.075,.208,.014,.095,ivory);
  box('display-deck',.058,.075,.086,.208,.014,.066,ivory);
  for(const x of [-.041,.159])box('tape-bezel',x,.075,.016,.012,.014,.074,ivory);
  box('tape-well',.059,.071,.018,.188,.003,.064,black);
  const reels:T.Group[]=[];
  for(const x of [.02,.1]){
    const reel=new T.Group();reel.position.set(x,.076,.018);root.add(reel);reels.push(reel);
    const tape=new T.Mesh(new T.CylinderGeometry(.025,.025,.003,32),edge);reel.add(tape);
    const hub=new T.Mesh(new T.CylinderGeometry(.012,.012,.004,20),ivory);hub.position.y=.002;reel.add(hub);
    for(let i=0;i<3;i++){const spoke=new T.Mesh(new T.BoxGeometry(.029,.002,.004),ivory);spoke.rotation.y=i*Math.PI/3;spoke.position.y=.002;reel.add(spoke);}
    const pin=new T.Mesh(new T.CylinderGeometry(.004,.004,.006,12),black);pin.position.y=.004;reel.add(pin);
  }
  pipe([new T.Vector3(.02,.076,-.006),new T.Vector3(.1,.076,-.006)],.0012,edge);
  const lid=box('tape-window',.059,.083,.018,.188,.0015,.064,new T.MeshStandardMaterial({color:'#9faea5',roughness:.16,transparent:true,opacity:.2,depthWrite:false}));lid.castShadow=false;
  for(const z of [-.09,.09])box('receiver-cradle',-.111,.087,z,.07,.034,.042,ivory);
  // One continuous moulded handset, with broad earpieces and a narrower curved grip.
  const positions:number[]=[],indices:number[]=[],rings=24,sides=20;
  for(let i=0;i<=rings;i++){
    const t=i/rings,z=(t-.5)*.237,end=Math.pow(Math.abs(2*t-1),4),cap=Math.sin(Math.PI*Math.min(1,Math.min(t,1-t)*12)/2),rx=(.015+end*.021)*cap,ry=(.012+end*.009)*cap,y=.123-Math.pow(2*t-1,2)*.02;
    for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;positions.push(-.111+Math.cos(a)*rx,y+Math.sin(a)*ry,z);if(i<rings&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const handset=new T.Mesh(geometry,ivory);handset.name='answerphone-handset';handset.castShadow=handset.receiveShadow=true;root.add(handset);
  for(const z of [-.103,.103])for(let i=-2;i<=2;i++)box('handset-grille',-.111+i*.007,.118,z,.0018,.001,.013,edge);
  const cord:T.Vector3[]=[];for(let i=0;i<=160;i++){const t=i/160;cord.push(new T.Vector3(-.432-.025*Math.sin(t*Math.PI)+Math.cos(t*60*Math.PI)*.006,.016-.37*Math.sin(t*Math.PI),.05+t*.07+Math.sin(t*60*Math.PI)*.007));}
  const coil=pipe(cord,.0025,black);coil.name='answerphone-coiled-cord';
  pipe([new T.Vector3(-.145,.095,.089),new T.Vector3(-.32,.043,.065),cord[0]],.0025,black);
  pipe([cord.at(-1)!,new T.Vector3(-.32,.027,.105),new T.Vector3(-.177,.034,.082)],.0025,black);
  // Separate moulded keys remain legible in the torch, rather than a flat painted keypad.
  const keypad:T.Mesh[]=[],keyLabels=['1','2','3','4','5','6','7','8','9','*','0','#'];
  for(let i=0;i<keyLabels.length;i++)keypad.push(box('telephone-key',.061-(i%3)*.036,.085,-.035-Math.floor(i/3)*.024,.029,.009,.019,ivory));
  const playButton=box('answerphone-play',.126,.085,-.09,.034,.009,.027,new T.MeshStandardMaterial({color:'#657b6b',roughness:.65}));
  const stopButton=box('answerphone-stop',.126,.085,-.05,.034,.009,.022,ivory);
  const face=document.createElement('canvas');face.width=768;face.height=576;const ink=face.getContext('2d')!;ink.fillStyle='#3c433c';ink.textAlign='center';ink.textBaseline='middle';ink.font='24px sans-serif';
  const px=(x:number)=>(.175-x)/.35*768,pz=(z:number)=>(.13-z)/.26*576;
  keypad.forEach((key,i)=>ink.fillText(keyLabels[i],px(key.position.x),pz(key.position.z)));
  ink.font='16px sans-serif';ink.fillText(purpose==='intercom'?'CALL':'PLAY',px(.126),pz(-.09));ink.fillText(purpose==='intercom'?'CLEAR':'STOP',px(.126),pz(-.05));
  const faceMap=new T.CanvasTexture(face);faceMap.colorSpace=T.SRGBColorSpace;
  const keyInk=new T.MeshStandardMaterial({map:faceMap,transparent:true,depthWrite:false,roughness:.85});
  for(const key of [...keypad,playButton,stopButton]){
    const width=(key===playButton||key===stopButton) ? .034 : .029,depth=key===playButton ? .027 : key===stopButton ? .022 : .019,geometry=new T.PlaneGeometry(width,depth),uv=geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,.5-key.position.x/.35+(uv.getX(i)-.5)*width/.35,.5+key.position.z/.26+(uv.getY(i)-.5)*depth/.26);
    const legend=new T.Mesh(geometry,keyInk);legend.name='key-legend';legend.rotation.set(-Math.PI/2,0,Math.PI);legend.position.y=.0046;key.add(legend);
  }
  const screen=document.createElement('canvas');screen.width=256;screen.height=80;const ctx=screen.getContext('2d')!,map=new T.CanvasTexture(screen);map.colorSpace=T.SRGBColorSpace;
  box('lcd-surround',.06,.084,.092,.134,.004,.039,edge);
  const display=new T.Mesh(new T.PlaneGeometry(.124,.03),new T.MeshStandardMaterial({map,roughness:.4}));display.rotation.set(-Math.PI/2,0,Math.PI);display.position.set(.06,.0865,.092);root.add(display);
  const ledMaterial=new T.MeshStandardMaterial({color:'#842f21',emissive:'#8e3523',emissiveIntensity:.5,roughness:.35});box('answerphone-message-led',.143,.086,.09,.006,.003,.006,ledMaterial);
  let previous='';function setScreen(counter:string){
    if(counter===previous)return;ctx.fillStyle='#637361';ctx.fillRect(0,0,256,80);ctx.fillStyle='#1e2b21';ctx.font='42px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(counter,128,42);map.needsUpdate=true;previous=counter;
  }
  function setPlayback(seconds:number|null){
    const active=seconds!==null,counter=active?`PLAY ${String(Math.floor(seconds)).padStart(2,'0')}`:'MSG 01';
    setScreen(counter);
    if(active)reels.forEach((r,i)=>r.rotation.y=seconds*(i?2.2:1.7));playButton.position.y=active?.082:.085;ledMaterial.emissiveIntensity=active?1:.35;
  }
  setPlayback(null);return {root,playButton,stopButton,setPlayback,setScreen,keys:keypad.map((mesh,i)=>({mesh,label:keyLabels[i]}))};
}

export function createResidentPhoto(){
  const root=new T.Group();root.name='resident-memory-photo';
  const paper=new T.MeshStandardMaterial({color:'#c6c2ad',roughness:.9});
  const backing=new T.Mesh(softBox(.43,.297,.0016),paper);backing.receiveShadow=true;root.add(backing);
  const photo=new T.Mesh(new T.PlaneGeometry(.405,.27),residentPhotoMaterial());photo.name='resident-photo-print';photo.position.z=.001;photo.receiveShadow=true;root.add(photo);
  const tape=new T.MeshStandardMaterial({color:'#a4a688',roughness:.85});
  for(const x of [-.16,.16]){const magnet=new T.Mesh(softBox(.036,.022,.007),tape);magnet.position.set(x,.139,.003);magnet.rotation.z=x>0?.11:-.14;magnet.castShadow=true;root.add(magnet);}
  return root;
}
