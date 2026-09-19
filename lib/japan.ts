import * as T from 'three';
import {boxUV,surface,softBox,upholstery} from './materials.ts';
import {createLeatherShoe} from './entry-props.ts';
import {spaceFurniture} from './apartment-layout.ts';
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
    const {at,finish}=spaceFurniture(root);at(0,-5.15);
    box(0,.008,-5.15,2.65,.012,1.9,surface('tile','#b9bdb4',{roughness:.47}));
    for(const x of [-.82,-.58]){const shoe=createLeatherShoe('#736854',false);shoe.position.set(x,.014,-4.55);shoe.rotation.y=.08;root.add(shoe);}
    at(-1.05,-5.8);cylinder(-1.05,.3,-5.8,.14,.6,steel);for(let i=0;i<3;i++)rod(new T.Vector3(-1.12+i*.07,.15,-5.8),new T.Vector3(-1.2+i*.11,1.15+i*.12,-5.82),.016,dark);
    at(0,-6.25);notice(['백로아파트','3동 2803호','야간에는 조용히','관리사무소'],1.02,1.85,-5.83,0,.23,.38);
    at(6.08,1.55);for(const z of [1.05,2.05])box(5.556,1.24,z,.018,2.02,.96,paper);
    for(const y of [.23,1.22,2.25])box(5.532,y,1.55,.03,.034,2.04,wood);
    for(const z of [.53,1.55,2.57])box(5.526,1.25,z,.035,2.07,.027,wood);
    for(const z of [1.44,1.69]){const pull=cylinder(5.498,1.22,z,.04,.012,dark);pull.rotation.z=Math.PI/2;}
    at(-3.15,2.4);notice(['관리비 납부서','백로 관리사무소'],-3.1,.556,1.91,0,.33,.23).rotation.x=-Math.PI/2;
    at(0,6.25);box(0,2.58,6.02,1.34,.36,.25,paper);for(let i=0;i<8;i++)box(-.51+i*.145,2.46,5.85,.085,.027,.03,dark);
    for(const [x,z,ry] of [[-6.43,4.8,Math.PI/2],[6.43,3.2,-Math.PI/2]]){
      at(x<0?-6.46:6.46,z);
      const glass=new T.Mesh(new T.PlaneGeometry(1.45,1.53),nightWindow());glass.position.set(x,1.9,z);glass.rotation.y=ry;root.add(glass);
      for(const zz of [z-.77,z,z+.77])box(x*.998,1.9,zz,.04,1.65,.035,steel);box(x*.998,1.9,z,.04,.04,1.6,steel);
    }
    const linen=upholstery('#b4afa0'),cotton=upholstery('#6e7873'),ceramic=new T.MeshStandardMaterial({color:'#c6c3b6',roughness:.22});
    function cloth(x:number,y:number,z:number,w:number,h:number,rotation:number){
      const g=new T.PlaneGeometry(w,h,24,12),p=g.getAttribute('position');
      for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*43)*.037+Math.sin(p.getY(i)*5+p.getX(i)*14)*.006);
      g.computeVertexNormals();const m=new T.Mesh(g,linen);m.position.set(x,y,z);m.rotation.y=rotation;m.material.side=T.DoubleSide;m.castShadow=true;m.receiveShadow=true;root.add(m);
    }
    function contact(x:number,z:number,w:number,d:number,y=.012){
      const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){vec2 p=abs(v*2.-1.);float a=(1.-smoothstep(.55,1.,max(p.x,p.y)))*.27;gl_FragColor=vec4(.045,.036,.025,a);}'}));m.position.set(x,y,z);m.rotation.x=-Math.PI/2;root.add(m);
    }
    for(const [x,z,ry] of [[-6.4,4.8,Math.PI/2],[6.4,3.2,-Math.PI/2]]){
      at(x<0?-6.46:6.46,z);
      rod(new T.Vector3(x*.978,2.82,z-1.18),new T.Vector3(x*.978,2.82,z+1.18),.019);
      for(const side of [-1,1]){cloth(x*.972,1.78,z+side*.95,.47,2.04,ry);box(x*.982,.86,z,.26,.065,1.78,wood);for(let i=0;i<4;i++){const ring=new T.Mesh(new T.TorusGeometry(.028,.004,6,12),steel);ring.position.set(x*.978,2.79,z+side*.76+side*i*.105);ring.rotation.y=Math.PI/2;root.add(ring);}}
    }
    at(-1.2,2.5);
    for(const z of [1.6,3.45]){const pillow=new T.Mesh(softBox(.28,.44,.54,.1),cotton);pillow.position.set(-1.01,.93,z);pillow.rotation.z=-.18;pillow.rotation.y=z>2?.08:-.09;pillow.castShadow=true;pillow.receiveShadow=true;root.add(pillow);}
    contact(-1.2,2.5,1.35,3.5,.04);
    at(-3.15,2.4);contact(-3.15,2.4,1.48,2.05,.04);
    const mugHandle=new T.Mesh(new T.TorusGeometry(.062,.018,10,20),ceramic);mugHandle.position.set(-3.45,.66,2.98);root.add(mugHandle);
    at(-4.5,-1.7,0,-.45);
    for(const x of [-5.5,-4.5,-3.5]){box(x,2.1,-1.777,.84,.73,.027,wood);rod(new T.Vector3(x+.29,1.98,-1.75),new T.Vector3(x+.29,2.19,-1.75),.01);for(const y of [2,2.17])rod(new T.Vector3(x+.29,y,-1.79),new T.Vector3(x+.29,y,-1.75),.01);}
    box(-5.74,.993,-1.62,.5,.025,.37,steel);
    for(let i=0;i<4;i++){const dish=new T.Mesh(new T.CylinderGeometry(.13,.13,.014,28),ceramic);dish.position.set(-5.85+i*.075,1.12,-1.62);dish.rotation.set(Math.PI/2,.15,0);root.add(dish);}
    const kettle=new T.Mesh(new T.SphereGeometry(.14,20,14),steel);kettle.scale.y=.85;kettle.position.set(-3.8,1.09,-1.7);root.add(kettle);cylinder(-3.8,1.22,-1.7,.06,.025,dark);
    const handle=new T.Mesh(new T.TorusGeometry(.145,.015,8,20,Math.PI),dark);handle.position.set(-3.8,1.17,-1.7);root.add(handle);rod(new T.Vector3(-3.91,1.11,-1.7),new T.Vector3(-4.08,1.2,-1.7),.026,steel);
    at(-6.04,-.65);for(const y of [.95,1.65])rod(new T.Vector3(-5.625,y-.12,-.4),new T.Vector3(-5.625,y+.12,-.4),.018);
    at(-4.2,5.15);contact(-4.2,5.15,2.3,1.25);
    for(const x of [-4.82,-3.6]){cylinder(x,.836,5.15,.16,.025,ceramic);cylinder(x,.88,5.4,.065,.1,ceramic);rod(new T.Vector3(x-.17,.837,4.95),new T.Vector3(x+.15,.837,4.95),.004,wood);}
    at(4.8,4.6);contact(4.8,4.6,2.55,2.75);
    for(const x of [4.25,5.35]){const pillow=new T.Mesh(softBox(.86,.23,.46,.1),linen);pillow.position.set(x,.84,5.43);pillow.rotation.y=x<4.8?.04:-.06;root.add(pillow);}
    at(2.9,-5.5);
    const rim=new T.Mesh(new T.TorusGeometry(.315,.032,12,32),steel);rim.position.set(2.9,.57,-4.90);root.add(rim);
    const glass=new T.Mesh(new T.CircleGeometry(.278,32),new T.MeshPhysicalMaterial({color:'#354240',roughness:.12,metalness:.32}));glass.position.set(2.9,.57,-4.883);root.add(glass);box(2.9,1,-4.94,1.12,.11,.035,ceramic);
    for(const z of [-3,0,5.75]){at(-6.6,z);box(-6.492,.31,z,.017,.12,.19,ceramic);for(const dz of [-.045,.045])box(-6.479,.31,z+dz,.01,.029,.008,dark);}
    finish();
  }else if(area==='landing'){
    const rust=surface('concrete','#786151',{roughness:.94,metalness:.3});
    notice(['백로아파트','外壁補修のお知らせ','工事日程 未定','手すりに寄りかからないで','관리사무소'],2.87,1.8,25,-Math.PI/2,.95,1.25);
    notice(['昭和五十九年 竣工','백로아파트 第三棟'],0,1.8,31.84,Math.PI,1.65,.5);
    notice(['エレベーター','この先  →'],2.87,2.45,-15,-Math.PI/2,1.1,.28);
    for(const z of [-26,-14,-2,10,22]){
      rod(new T.Vector3(2.8,.12,z),new T.Vector3(2.8,3.05,z),.055,rust);
      box(2.72,.95,z,.03,.6,.42,surface('concrete','#576653'));
      ceilingStains(1,z,2,2.4);box(-2.98,.44,z,.014,.66,1.7,surface('concrete','#585c51'));
      box(2.67,.45,z+1,.33,.9,.46,paper);for(const y of [.18,.4,.62])box(2.49,y,z+1,.015,.035,.35,dark);
    }
    for(const z of [-23,7,19]){box(2.48,.22,z,.45,.44,.48,rust);for(let i=0;i<5;i++)rod(new T.Vector3(2.48,.4,z),new T.Vector3(2.4+Math.sin(i)*.16,.9+i*.045,z+Math.cos(i)*.18),.012,wood);}
    extinguisher(2.63,-29);extinguisher(2.63,19.7);
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
    notice(['立入禁止','十七階','관리사무소'],6.83,1.8,5,-Math.PI/2,.6,.9,'#5a2522');
  }else if(area==='office'){
    notice(['宿直日誌','三日前','交通死亡事故'], -4.8,1.456,4.58,0,.45,.32).rotation.x=-Math.PI/2;
    notice(['백로아파트','入居者一覧','2801　佐藤','2802　空室','2803　■■'], -11.85,1.9,5,Math.PI/2,.85,1.1);
    notice(['目撃情報','三日前 03:17','ひき逃げ事故','管理事務所'],11.84,1.8,-7,-Math.PI/2,.65,.9,'#61362e');
    for(let i=0;i<4;i++)box(-5.3+i*.36,1.43,4.48,.28,.04+i*.015,.45,paper);
    box(-11.7,1.12,7,.11,.9,.64,steel);ceilingStains(-4.5,1,3,3);
  }else if(area==='parking'){
    notice(['백로아파트','月極駐車場','無断駐車禁止'],24.82,1.7,29,-Math.PI/2,1.4,1.5);
    notice(['非常口','歩行者専用'],0,1.7,-42.61,0,.73,.55,'#d7ded5','#22463b');
    for(const x of [-22,22])for(const z of [-34,-16,2,20,38]){box(x,.006,z,1.8,.01,3,surface('concrete','#525e61',{roughness:.18,metalness:.18}));}
    for(let x=-23;x<24;x+=1.5)box(x,2.83,20,.026,.03,8,steel);
    extinguisher(-24.5,29);ceilingStains(-5,0,6,12);
  }
}
export function nightWindow(){
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
