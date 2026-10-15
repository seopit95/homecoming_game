import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {softBox,upholstery} from './materials.ts';
import type {Solid} from './world.ts';

// The body and mirrors have separate footprints: the side aisle must stay usable.
export function sedanSolids(x:number,z:number):Solid[]{
  return [{x,z,w:1.91,d:4.57,y:.76,h:1.52},...[-1,1].map(side=>({x:x+side*1.008,z:z+.65,w:.213,d:.263,y:1.01,h:.17}))];
}

// Shared by the physical pane and its rain/crack surface layers (+Z forward).
export function sedanWindshieldPoint(u:number,v:number){
 const x=(u*2-1)*T.MathUtils.lerp(.815,.658,v),bow=1-(u*2-1)**2;
 return [x,.923+v*.48+.047*bow*v+.025*bow*Math.sin(v*Math.PI),.968-v*.592+.033*bow*Math.sin(v*Math.PI)];
}

// Generic late-1990s compact sedan, in metres. The front points along +Z.
export function createSedan(color:string,damaged=false,driving=false,passengerAccess=false){
  const root=new T.Group();root.name=damaged?'hit-and-run-car':'parked-sedan';
  const door=new T.Group();door.name='hero-driver-door';door.position.set(.86,0,.94);if(driving)root.add(door);const passengerDoor=new T.Group();passengerDoor.name='hero-passenger-door';passengerDoor.position.set(-.86,0,.94);if(driving&&passengerAccess)root.add(passengerDoor);let onDoor=false,onPassenger=false,onHood=false;
  const hood=new T.Group();hood.name='hero-hood';hood.position.set(0,.9,.968);if(driving)root.add(hood);
  const steering=new T.Group();steering.position.set(.39,1.004,.555);steering.rotation.x=.57;
  const steeringWheel=new T.Group();steeringWheel.name='hero-steering-wheel';steering.add(steeringWheel);if(driving)root.add(steering);
  const paint=new T.MeshPhysicalMaterial({color,metalness:.58,roughness:.38,clearcoat:.45,clearcoatRoughness:.3,vertexColors:true,side:driving?T.DoubleSide:T.FrontSide});
  const trim=new T.MeshStandardMaterial({color:'#202623',roughness:.8});
  const rubber=new T.MeshStandardMaterial({color:'#202221',roughness:.96});
  const interior=driving?upholstery('#424b49'):new T.MeshStandardMaterial({color:'#343837',roughness:.95});
  const alloy=new T.MeshStandardMaterial({color:'#a2a8a7',metalness:.8,roughness:.35});
  const chrome=new T.MeshStandardMaterial({color:'#b5c0c0',metalness:.94,roughness:.19});
  const glass=new T.MeshPhysicalMaterial({color:'#26322f',metalness:.22,roughness:.14,transparent:true,opacity:driving?.12:.8,depthWrite:false,side:T.DoubleSide,clearcoat:1});
  const headlamp=new T.MeshPhysicalMaterial({color:'#87938a',metalness:.35,roughness:.26,clearcoat:1});
  const tail=new T.MeshPhysicalMaterial({color:'#721b17',roughness:.24,clearcoat:1});
  tail.name='sedan-tail-lamps';
  const amber=new T.MeshPhysicalMaterial({color:'#90602b',roughness:.26,clearcoat:1});
  const scratch=new T.MeshStandardMaterial({color:driving?'#52635f':'#8b9693',roughness:.8});
  const batches=new Map<T.Material,T.BufferGeometry[]>(),doorBatches=new Map<T.Material,T.BufferGeometry[]>(),passengerBatches=new Map<T.Material,T.BufferGeometry[]>(),hoodBatches=new Map<T.Material,T.BufferGeometry[]>();
  const transform=new T.Object3D();
  function add(g:T.BufferGeometry,m:T.Material,p=[0,0,0],r=[0,0,0]){
    transform.position.set(...p as [number,number,number]);transform.rotation.set(...r as [number,number,number]);transform.updateMatrix();g.applyMatrix4(transform.matrix);
    const geometry=g.index?g.toNonIndexed():g;if(geometry!==g)g.dispose();
    if(m===paint){
      const positions=geometry.getAttribute('position'),colors:number[]=[];
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
        const grime=.69+.31*T.MathUtils.smoothstep(y,.34,.91),grain=.022*Math.sin(z*19+x*13)*Math.sin(y*27+z*11);
        const scuff=damaged?.22*Math.exp(-((x-.28)**2/.08+(z-1.48)**2/.16+(y-.8)**2/.04)):0;
        colors.push(grime+grain-scuff,grime+grain-scuff,grime+grain-scuff);
      }
      geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    }
    const batch=onDoor?(onPassenger?passengerBatches:doorBatches):onHood?hoodBatches:batches;if(onDoor)geometry.translate(onPassenger?.86:-.86,0,-.94);if(onHood)geometry.translate(0,-.9,-.968);const list=batch.get(m)??[];list.push(geometry);batch.set(m,list);
  }
  function box(p:number[],size:number[],m:T.Material,r=[0,0,0],radius=.025){add(softBox(...size as [number,number,number],radius),m,p,r);}
  function pipe(points:number[][],radius:number,m:T.Material,segments=12){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));
    add(new T.TubeGeometry(curve,segments,radius,5,false),m);
  }
  function patch(fn:(u:number,v:number)=>number[],nu:number,nv:number,m:T.Material,flip=false){
    const p:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+2,d=a+nu+1;indices.push(...(flip?[a,c,b,a,d,c]:[a,b,c,a,c,d]));}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,m);
  }
  function interpolate(z:number,points:number[][]){
    for(let i=1;i<points.length;i++)if(z<=points[i][0]){const [a,y]=points[i-1],[b,h]=points[i];return T.MathUtils.lerp(y,h,T.MathUtils.smoothstep(z,a,b));}
    return points[points.length-1][1];
  }
  const width=(z:number)=>interpolate(z,[[-2.18,.815],[-1.9,.83],[-1.45,.88],[1.35,.88],[1.93,.82],[2.18,.815]]);
  const belt=(z:number)=>interpolate(z,[[-2.18,.66],[-1.83,.81],[-1.25,.9],[.95,.91],[1.92,.8],[2.18,.68]]);
  function arch(z:number){let y=.34;for(const axle of [-1.35,1.35])if(Math.abs(z-axle)<.374)y=Math.max(y,.314+Math.sqrt(.374**2-(z-axle)**2));return y;}
  function top(x:number,z:number){
    const dome=.045*(1-(x/width(z))**2);
    const dent=damaged?.115*Math.exp(-((x-.28)**2/.064+(z-1.48)**2/.075)):0;
    return belt(z)+dome-dent;
  }
  for(const [lo,hi] of driving?[[-2.18,-1.255],[.968,2.18]]:[[-2.18,2.18]]){onHood=driving&&lo===.968;patch((u,v)=>{const z=lo+v*(hi-lo),x=(u*2-1)*width(z);return [x,top(x,z),z];},16,driving?24:48,paint,true);}onHood=false;
  for(const side of [-1,1]){
    onPassenger=side<0;
    for(const [a,b] of driving&&(side===1||passengerAccess)?[[-2.18,-.23],[-.23,.94],[.94,2.18]]:[[-2.18,2.18]]){onDoor=driving&&(side===1||passengerAccess)&&a===-.23;patch((u,v)=>{const z=a+u*(b-a),lo=arch(z);return [side*width(z)*(.956+.044*v+.025*Math.sin(v*Math.PI)),T.MathUtils.lerp(lo,belt(z),v),z];},driving?40:100,5,paint,side>0);}onDoor=false;
    // Rolled wheel-arch lips, with a dark inner liner behind the real opening.
    for(const z of [-1.35,1.35]){
      const lip:number[][]=[];
      for(let i=0;i<=20;i++){const a=i*Math.PI/20,zz=z+Math.cos(a)*.374;lip.push([side*(width(zz)+.001),.314+Math.sin(a)*.374,zz]);}
      pipe(lip,.009,paint,24);
      patch((u,v)=>{const a=u*Math.PI,r=.32+v*.063;return [side*.817,.314+Math.sin(a)*r,z+Math.cos(a)*r];},24,1,trim,side<0);
    }
    pipe([[side*.846,.368,-.95],[side*.857,.359,0],[side*.846,.368,.95]],.024,trim);
  }
  for(const front of [-1,1])patch((u,v)=>{const z=front*2.18,x=(u*2-1)*width(z);return [x,T.MathUtils.lerp(.35,top(x,z),v),z];},16,4,paint,front<0);
  box([0,driving?.21:.337,0],[1.46,.065,3.55],trim);

  // Gently crowned roof and four fitted panes; no floating rectangular roof slab.
  const windshield=sedanWindshieldPoint;
  patch(windshield,18,9,glass);
  const rearGlass=(u:number,v:number)=>{const x=(u*2-1)*T.MathUtils.lerp(.81,.663,v);return [x,.915+v*.488+.047*(1-(u*2-1)**2)*v,-1.255+v*.501-.02*(1-(u*2-1)**2)*Math.sin(v*Math.PI)];};
  patch(rearGlass,18,8,glass,true);
  patch((u,v)=>{const x=(u*2-1)*.683,z=-.775+1.165*v;return [x,1.403+.047*(1-(u*2-1)**2)+.011*Math.sin(v*Math.PI),z];},20,12,paint,true);
  for(const fn of [windshield,rearGlass]){
    for(const v of [0,1])pipe(Array.from({length:13},(_,i)=>fn(i/12,v)),.018,trim,16);
    for(const u of [0,1])pipe(Array.from({length:10},(_,i)=>fn(u,i/9)),.025,paint,12);
  }
  for(const side of [-1,1]){
    onPassenger=side<0;
    const sideWindow=(u:number,v:number)=>[side*T.MathUtils.lerp(.814,.665,v),.923+.48*v,T.MathUtils.lerp(-1.24,-.76,v)+u*T.MathUtils.lerp(2.18,1.13,v)];
    if(driving&&(side===1||passengerAccess)){
      for(const front of [false,true]){onDoor=front;patch((u,v)=>{const a=sideWindow(0,v),b=sideWindow(1,v);return [a[0],a[1],front?T.MathUtils.lerp(-.23,b[2],u):T.MathUtils.lerp(a[2],-.23,u)];},12,8,glass,true);}onDoor=false;
    }else patch(sideWindow,18,8,glass,side>0);
    for(const v of [0,1]){if(driving&&(side===1||passengerAccess)){const a=sideWindow(0,v),b=sideWindow(1,v);pipe([a,[a[0],a[1],-.23]],.02,trim,4);onDoor=true;pipe([[a[0],a[1],-.23],b],.02,trim,4);onDoor=false;}else pipe(Array.from({length:12},(_,i)=>sideWindow(i/11,v)),.02,trim,12);}
    // Painted sills and black B-pillar give the windows a believable thickness.
    pipe([[side*.81,.929,-1.235],[side*.68,1.385,-.75]],.041,paint);
    pipe([[side*.816,.925,.955],[side*.664,1.396,.384]],.035,paint);
    pipe([[side*.815,.925,-.23],[side*.665,1.403,-.23]],.041,trim);
    if(!(driving&&(side===1||passengerAccess)))pipe([[side*.816,.924,-1.21],[side*.831,.926,0],[side*.816,.924,.94]],.008,chrome);
    for(const z of [-.25,.93,-1.19]){onDoor=driving&&(side===1||passengerAccess)&&z===.93;
      pipe([[side*(width(z)+.004),.889,z],[side*(width(z)+.009),.69,z-.035],[side*(width(z-.09)-.014),.404,z-.09]],.003,trim);
    }
    onDoor=false;for(const z of [-.38,.67]){onDoor=driving&&(side===1||passengerAccess)&&z===.67;
      box([side*.893,.798,z-.075],[.013,.048,.19],trim,[0,0,0],.007);
      box([side*.91,.805,z-.08],[.025,.021,.145],paint,[0,0,0],.007);
    }
    onDoor=driving&&(side===1||passengerAccess);
    // Mirror stem enters the A-pillar; the reflective face is recessed in its housing.
    pipe([[side*.803,.964,.73],[side*.949,1.008,.667]],.022,trim);
    box([side*1.008,1.014,.65],[.184,.104,.223],paint,[0,side*.12,0],.021);
    box([side*1.008,1.018,.54],[.144,.071,.006],chrome,[0,side*.12,0],.002);
    if(driving&&side===-1){
      // The passenger card follows its hinge in the garage and is the same
      // fitted trim in the road cabin; opening never exposes an empty sheet.
      box([-.835,.65,.355],[.045,.44,1.06],interior,[0,0,0],.025);
      box([-.795,.72,.40],[.06,.05,.34],trim,[0,0,0],.012);
      box([-.805,.8,.30],[.018,.035,.14],chrome,[0,0,0],.005);
      box([-.79,.78,.30],[.025,.012,.10],trim,[0,0,0],.004);
      pipe([[-.803,.65,.63],[-.775,.65,.63],[-.775,.62,.67]],.006,alloy,3);
      box([-.769,.62,.67],[.014,.018,.025],trim,[0,0,0],.005);
    }
  }
  onDoor=false;
  // Inside the glass, seats and the dashboard supply depth rather than an empty shell.
  box([0,driving?.24:.719,-.24],[driving?1.7:1.36,.065,2.4],interior);
  box([0,.905,.775],[1.38,.115,.29],trim,[-.1,0,0]);
  for(const side of [-1,1]){
    for(const z of [.18,-.52]){
      if(driving){
        box([side*.38,.455,z],[.49,.14,.48],trim,[0,0,0],.055);
        box([side*.38,.51,z+.025],[.36,.09,.41],interior,[.04,0,0],.044);
        for(const edge of [-1,1]){box([side*.38+edge*.207,.525,z],[.075,.12,.43],interior,[0,0,edge*.12],.035);box([side*.38+edge*.197,.86,z-.174],[.085,.66,.15],interior,[-.15,0,-edge*.06],.04);}
        box([side*.38,.86,z-.198],[.34,.60,.105],interior,[-.15,0,0],.048);
        for(const dx of [-.068,.068])pipe([[side*.38+dx,1.17,z-.225],[side*.38+dx,1.258,z-.235]],.008,alloy,1);
        box([side*.38,1.285,z-.245],[.25,.135,.115],interior,[-.15,0,0],.052);
        for(const dx of [-.105,.105])pipe([[side*.38+dx,.558,z+.16],[side*.38+dx,.56,z-.13]],.0018,trim,3);
      }else{
      box([side*.38,.79,z],[.49,.15,.47],interior,[0,0,0],.06);
      box([side*.38,1.035,z-.18],[.48,.49,.13],interior,[-.15,0,0],.065);
      box([side*.38,1.295,z-.21],[.26,.16,.1],interior,[-.15,0,0],.034);
      }
    }
  }
  if(driving){
    pipe([[.39,.9,.72],[.39,1.004,.555]],.027,trim,4);
    const rim=new T.Mesh(new T.TorusGeometry(.137,.015,6,24),trim);steeringWheel.add(rim);
    for(const x of [-1,1]){const spoke=new T.Mesh(new T.CylinderGeometry(.012,.012,.137,8),trim);spoke.rotation.z=Math.PI/2;spoke.position.x=x*.0685;steeringWheel.add(spoke);}
  }else{add(new T.TorusGeometry(.137,.015,6,24),trim,[-.39,1.004,.555],[-.57,0,0]);pipe([[-.53,.98,.56],[-.39,1.004,.555],[-.25,.98,.56]],.012,trim);}

  // A flattened tread meets the floor. Sidewalls, rim well, spokes and lugs are separate surfaces.
  for(const side of [-1,1])for(const axle of [-1.35,1.35]){
    const profile=[[-.1,.187],[-.109,.235],[-.096,.29],[-.066,.311],[.063,.311],[.096,.29],[.109,.235],[.101,.187]].map(([x,r])=>new T.Vector2(r,x));
    const tire=new T.LatheGeometry(profile,40);tire.rotateZ(-Math.PI/2);tire.translate(side*.795,.314,axle);
    const p=tire.getAttribute('position');for(let i=0;i<p.count;i++)if(p.getY(i)<.004)p.setY(i,.004);tire.computeVertexNormals();add(tire,rubber);
    for(const dx of [-.052,0,.052])add(new T.TorusGeometry(.308,.0035,4,40),trim,[side*.795+dx,.314,axle],[0,Math.PI/2,0]);
    const face=side*.911;
    add(new T.CylinderGeometry(.181,.181,.075,32),trim,[side*.868,.314,axle],[0,0,Math.PI/2]);
    add(new T.TorusGeometry(.176,.009,6,32),alloy,[face,.314,axle],[0,Math.PI/2,0]);
    add(new T.TorusGeometry(.195,.005,5,32),rubber,[side*.899,.314,axle],[0,Math.PI/2,0]);
    add(new T.CylinderGeometry(.061,.061,.023,16),alloy,[face,.314,axle],[0,0,Math.PI/2]);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      box([face,.314+Math.cos(a)*.115,axle+Math.sin(a)*.115],[.02,.126,.032],alloy,[a,0,0],.005);
      add(new T.CylinderGeometry(.012,.012,.008,6),chrome,[face+side*.016,.314+Math.cos(a)*.038,axle+Math.sin(a)*.038],[0,0,Math.PI/2]);
    }
  }

  for(const front of [-1,1]){
    // Rounded bumper corners turn into the fenders, unlike a bar stuck on the front.
    patch((u,v)=>{const x=(u*2-1)*.847,z=front*(2.23-.045*Math.abs(u*2-1)**8);return [x,.383+v*.145,z];},24,4,trim,front<0);
    pipe(Array.from({length:17},(_,i)=>{const x=(i/8-1)*.832;return [x,.551,front*(2.235-.04*Math.abs(x/.847)**8)];}),.009,chrome,24);
    box([0,.548,front*2.245],[.5,.125,.02],trim,[0,0,0],.008);
    for(const side of [-1,1]){
      const broken=damaged&&front===1&&side===1;
      if(broken){
        box([.588,.636,2.184],[.447,.118,.035],trim,[0,.035,0],.013);
        const edge=new T.Shape();edge.moveTo(-.211,-.046);for(const [x,y] of [[-.211,.046],[.075,.046],[.107,.027],[.033,.012],[.088,-.014],[.018,-.031],[.095,-.046]])edge.lineTo(x,y);edge.closePath();
        const lens=new T.ExtrudeGeometry(edge,{depth:.008,bevelEnabled:false});lens.translate(0,0,.016);add(lens,headlamp,[.588,.636,2.184],[0,.035,0]);
        box([.735,.636,2.203],[.112,.071,.008],alloy,[.18,.035,.12],.003);
        
      }else box([side*.588,.636,front*2.187],[.435,.1,.028],front>0?headlamp:tail,[0,side*front*.035,0],.014);
      box([side*.793,.636,front*2.18],[.044,.096,.028],amber,[0,side*front*.06,0],.009);
      for(let i=0;i<(broken?5:9);i++){const dx=-.16+i*.04,a=side*front*.035,x=side*.588+dx*Math.cos(a)+front*.026*Math.sin(a),z=front*2.184-dx*Math.sin(a)+front*.026*Math.cos(a);pipe([[x,.596,z],[x,.676,z]],.0012,front>0?chrome:tail,1);}
    }
  }
  box([0,.642,2.188],[.67,.1,.021],trim,[0,0,0],.006);
  for(const y of [.612,.642,.672])pipe([[-.309,y,2.204],[0,y,2.21],[.309,y,2.204]],.006,alloy,6);
  box([0,.641,2.215],[.043,.031,.007],chrome,[0,0,0],.004);
  for(const side of [-1,1]){
    onHood=driving;const line:number[][]=[];for(let i=0;i<=20;i++){const z=.982+i*.055,x=side*(.68-.05*i/20);line.push([x,top(x,z)+.002,z]);}pipe(line,.0025,trim,24);onHood=false;
    pipe([[side*.655,top(side*.655,-1.3)+.002,-1.3],[side*.63,top(side*.63,-1.78)+.002,-1.78],[side*.59,top(side*.59,-2.05)+.002,-2.05]],.0025,trim);
  }
  // Wipers and the impact crack lie on the actual curved windshield surface.
  if(!driving)for(const offset of [.12,.53])pipe([windshield(offset,.04),windshield(offset+.14,.1),windshield(offset+.31,.13)].map(([x,y,z])=>[x,y+.008,z+.008]),.007,trim,5);
  if(damaged){
    for(let i=0;i<9;i++){
      const a=i*2.399,r=(driving?.052:.11)+(i%3)*(driving?.027:.028);
      const points=Array.from({length:driving?6:4},(_,j)=>{const f=j/(driving?5:3),bend=driving&&j>0?Math.sin(i*7+j*4)*.16:0,u=.66+Math.cos(a+bend)*r*f,v=.34+Math.sin(a+bend)*r*1.7*f;const [x,y,z]=windshield(u,v);return [x,y+.001,z+.003];});
      pipe(points,driving?.00065:.0013,scratch,driving?7:3);
      if(driving&&i%2===0){const fork=points[3],tip=points[5];pipe([fork,[(fork[0]+tip[0])/2+.018,(fork[1]+tip[1])/2-.012,(fork[2]+tip[2])/2+.014],[tip[0]+.028,tip[1]-.018,tip[2]+.022]],.00045,scratch,3);}
    }
  }
  // Each material is submitted once per car; bolts and trim do not multiply draw calls.
  for(const [parent,batch] of [[root,batches],[door,doorBatches],[passengerDoor,passengerBatches],[hood,hoodBatches]] as const)for(const [material,parts] of batch){
    const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
    const mesh=new T.Mesh(geometry,material);mesh.castShadow=material!==glass;mesh.receiveShadow=true;parent.add(mesh);
  }
  return root;
}
