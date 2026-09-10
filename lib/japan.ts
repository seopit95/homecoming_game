import * as T from 'three';
import {boxUV,surface,softBox} from './materials.ts';
import type {Area} from './story';

// Dressing is kept against walls or on existing furniture; it never changes escape routes.
export function dressApartment(root:T.Group,area:Area){
  const steel=new T.MeshStandardMaterial({color:'#717574',metalness:.72,roughness:.32});
  const dark=new T.MeshStandardMaterial({color:'#191b1c',roughness:.85});
  const paper=surface('wall','#d1c7af',{roughness:.96}),wood=surface('wood','#8e8272');
  function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){const mesh=new T.Mesh(boxUV(softBox(w,h,d),x,y,z),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
  function cylinder(x:number,y:number,z:number,r:number,h:number,m:T.Material){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,16),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
  function rod(a:T.Vector3,b:T.Vector3,r=.022,m:T.Material=steel){const mesh=cylinder(0,0,0,r,a.distanceTo(b),m);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return mesh;}
  function notice(lines:string[],x:number,y:number,z:number,ry=0,w=.8,h=1,color='#353d39',background='#cec5ae'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=background;ctx.fillRect(0,0,512,768);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
    for(let i=0;i<lines.length;i++){ctx.font=`${i===0?'bold 48':'35'}px "Hiragino Mincho ProN","Yu Mincho",serif`;ctx.fillText(lines[i],256,115+i*(530/Math.max(1,lines.length-1)));}
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,roughness:.95}));mesh.position.set(x,y,z);mesh.rotation.y=ry;root.add(mesh);return mesh;
  }
  function extinguisher(x:number,z:number){const red=new T.MeshStandardMaterial({color:'#773b31',metalness:.2,roughness:.5});cylinder(x,.36,z,.11,.58,red);box(x,.7,z,.21,.05,.1,dark);rod(new T.Vector3(x+.11,.68,z),new T.Vector3(x+.15,.23,z),.016,dark);}
  function ceilingStains(x:number,z:number,w:number,d:number){box(x,3.155,z,w,.008,d,surface('concrete','#646961'));}
  if(area==='apartment'){
    box(0,.008,-5.15,2.65,.012,1.9,surface('tile','#b9bdb4',{roughness:.47}));
    for(const x of [-.82,-.58])box(x,.044,-4.55,.19,.075,.37,paper);
    cylinder(-1.05,.3,-5.8,.14,.6,steel);for(let i=0;i<3;i++)rod(new T.Vector3(-1.12+i*.07,.15,-5.8),new T.Vector3(-1.2+i*.11,1.15+i*.12,-5.82),.016,dark);
    notice(['白鷺ハイツ','第三棟 2803号室','夜間は静かに','管理組合'],1.02,1.85,-5.83,0,.23,.38);
    for(const z of [1.05,2.05])box(5.556,1.24,z,.018,2.02,.96,paper);
    for(const y of [.23,1.22,2.25])box(5.532,y,1.55,.03,.034,2.04,wood);
    for(const z of [.53,1.55,2.57])box(5.526,1.25,z,.035,2.07,.027,wood);
    for(const z of [1.44,1.69]){const pull=cylinder(5.498,1.22,z,.04,.012,dark);pull.rotation.z=Math.PI/2;}
    notice(['家賃振込票','白鷺管理事務所'],-3.1,.586,1.91,0,.33,.23).rotation.x=-Math.PI/2;
    box(0,2.58,6.02,1.34,.36,.25,paper);for(let i=0;i<8;i++)box(-.51+i*.145,2.46,5.85,.085,.027,.03,dark);
    for(const [x,z,ry] of [[-6.43,4.8,Math.PI/2],[6.43,3.2,-Math.PI/2]]){
      const glass=new T.Mesh(new T.PlaneGeometry(1.45,1.53),nightWindow());glass.position.set(x,1.9,z);glass.rotation.y=ry;root.add(glass);
      for(const zz of [z-.77,z,z+.77])box(x*.998,1.9,zz,.04,1.65,.035,steel);box(x*.998,1.9,z,.04,.04,1.6,steel);
    }
  }else if(area==='landing'){
    notice(['白鷺ハイツ','掲示板','夜間巡回 03:00','防犯カメラ作動中','管理組合'],10.83,1.75,.4,-Math.PI/2,1.55,1.8);
    for(const z of [3,3.55,4.1])for(const y of [1.1,1.45]){box(10.83,y,z,.12,.3,.47,steel);box(10.74,y+.055,z,.02,.025,.28,dark);}
    extinguisher(-10.6,-16.4);ceilingStains(4,0,2.5,4);
    notice(['白鷺ハイツ','SHIRASAGI HEIGHTS','第三棟'],0,1.85,19.84,Math.PI,1.7,.7);
  }else if(area==='lift'){
    notice(['安全のために','ドアにご注意','異常時は','非常ボタン'], -1.82,1.95,.2,Math.PI/2,.55,.78);
    box(0,.006,0,3.3,.01,4.9,surface('tile','#b4b5a8',{roughness:.32}));
    rod(new T.Vector3(-1.7,1.05,2.6),new T.Vector3(1.7,1.05,2.6),.026);
    for(let z=-2.3;z<2.6;z+=.19)for(const x of [-1.86,1.86])box(x,2.83,z,.014,.11,.035,dark);
    for(let i=0;i<4;i++){const button=cylinder(1.69,1.35-i*.12,-1.2,.027,.024,steel);button.rotation.z=Math.PI/2;}
  }else if(area==='corridor'){
    for(let z=-33;z<34;z+=6)for(const x of [-14.7,14.7]){
      box(x,1.3,z+.91,.06,.2,.1,steel);const peephole=cylinder(x,1.65,z,.025,.03,steel);peephole.rotation.z=Math.PI/2;
      rod(new T.Vector3(x,2.98,z-2.6),new T.Vector3(x,2.98,z+2.6),.034);
    }
    notice(['避難経路','非常階段 →','エレベーターは','使用しない'],14.82,1.8,-20,-Math.PI/2,.75,.95);
    extinguisher(14.58,-36);ceilingStains(10,10,2.5,5);ceilingStains(-10,-11,2,4);
    for(const x of [-14.84,14.84])for(const z of [-30,-18,-6,6,18,30]){const glass=new T.Mesh(new T.PlaneGeometry(3.6,1.45),nightWindow());glass.position.set(x,1.8,z);glass.rotation.y=x<0?Math.PI/2:-Math.PI/2;root.add(glass);}
  }else if(area==='stairs'){
    for(const side of [-1,1]){
      rod(new T.Vector3(side*.41,.94,-.08),new T.Vector3(side*.41,.94-side*2.8,-6),.025);
      rod(new T.Vector3(side*6.64,.94,-.08),new T.Vector3(side*6.64,.94-side*2.8,-6),.025);
    }
    notice(['立入禁止','十七階','管理組合'],6.83,1.8,5,-Math.PI/2,.6,.9,'#5a2522');
  }else if(area==='office'){
    notice(['宿直日誌','三日前','交通死亡事故'], -4.8,1.456,4.58,0,.45,.32).rotation.x=-Math.PI/2;
    notice(['白鷺ハイツ','入居者一覧','2801　佐藤','2802　空室','2803　■■'], -11.85,1.9,5,Math.PI/2,.85,1.1);
    notice(['目撃情報','三日前 03:17','ひき逃げ事故','管理事務所'],11.84,1.8,-7,-Math.PI/2,.65,.9,'#61362e');
    for(let i=0;i<4;i++)box(-5.3+i*.36,1.43,4.48,.28,.04+i*.015,.45,paper);
    box(-11.7,1.12,7,.11,.9,.64,steel);ceilingStains(-4.5,1,3,3);
  }else if(area==='parking'){
    notice(['白鷺ハイツ','月極駐車場','無断駐車禁止'],24.82,1.7,29,-Math.PI/2,1.4,1.5);
    notice(['非常口','歩行者専用'],0,1.7,-42.61,0,.73,.55,'#d7ded5','#22463b');
    for(const x of [-22,22])for(const z of [-34,-16,2,20,38]){box(x,.006,z,1.8,.01,3,surface('concrete','#525e61',{roughness:.18,metalness:.18}));}
    for(let x=-23;x<24;x+=1.5)box(x,2.83,20,.026,.03,8,steel);
    extinguisher(-24.5,29);ceilingStains(-5,0,6,12);
  }
}
function nightWindow(){
  return new T.ShaderMaterial({
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 uv=vUv;float block=floor(uv.x*8.0);float top=.18+hash(vec2(block,7.0))*.5;
        vec3 col=mix(vec3(.014,.023,.042),vec3(.09,.105,.125),uv.y);
        if(uv.y<top){col=vec3(.014,.02,.026);vec2 cell=floor(uv*vec2(58.,85.));vec2 f=fract(uv*vec2(58.,85.));float lit=step(.62,hash(cell))*step(.25,f.x)*step(f.x,.68)*step(.28,f.y)*step(f.y,.65);col+=lit*mix(vec3(.13,.18,.2),vec3(.43,.34,.2),hash(cell+17.));}
        float rain=pow(max(0.,sin(uv.x*191.+sin(uv.y*12.)*.2)),48.)*.04;
        col+=rain;gl_FragColor=vec4(col,1.);
      }`,
  });
}
