import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {boxUV,softBox} from './materials.ts';

type Tile={x:number;y:number;w:number;h:number};
const binderTile=(i:number):Tile=>({x:(i%8)*128,y:0,w:128,h:512});
const cartonTile=(i:number):Tile=>({x:(i%4)*256,y:512,w:256,h:256});

// One atlas per room; rack instances own geometry but share these disposable materials.
export function storageMaterials(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#b4aa91';ctx.fillRect(0,0,1024,1024);
  const colors=['#535e53','#47575d','#716551','#5c635b','#4c5255','#766e5d','#686b5b','#54594f'];
  const titles=['시설기록','당직일지','입출기록','통화기록','설비점검','입주문서','원본보존','보수일지'];
  for(let i=0;i<8;i++){
    const x=i*128;ctx.fillStyle=colors[i];ctx.fillRect(x,0,128,512);
    // Worn edges stay subdued; the label and pull ring carry the close-up detail.
    ctx.fillStyle='#8b8c78';ctx.fillRect(x+3,5,2,502);ctx.fillRect(x+123,5,2,502);
    ctx.fillStyle='#d0c6a9';ctx.fillRect(x+22,66,84,213);ctx.fillStyle='#8a806a';ctx.fillRect(x+26,267,76,1);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='24px sans-serif';ctx.fillStyle='#494b41';
    ctx.fillText(titles[i].slice(0,2),x+64,126);ctx.fillText(titles[i].slice(2),x+64,160);
    ctx.font='17px monospace';ctx.fillText(`0${i+1}`,x+64,235);
    // The opening is dark behind the metal rim, with no emission or painted highlight.
    ctx.fillStyle='#121815';for(let y=-15;y<=15;y++){const r=Math.sqrt(225-y*y);ctx.fillRect(x+64-r,376+y,r*2,1);}
    ctx.fillStyle='#bbb097';for(let j=0;j<22;j++){const y=12+(j*67+i*11)%480;ctx.fillRect(x+6+(j*23)%114,y,1+(j%3),1);}
  }
  for(let i=0;i<4;i++){
    const x=i*256,y=512;ctx.fillStyle=['#9b8565','#a49373','#948568','#ad9977'][i];ctx.fillRect(x,y,256,256);
    ctx.fillStyle='#7b6c53';for(let j=0;j<75;j++)ctx.fillRect(x+(j*73)%250,y+(j*47)%250,2+(j%4),1);
    ctx.fillStyle='#cbc3a8';ctx.fillRect(x+43,y+118,170,100);ctx.fillStyle='#514f40';ctx.font='25px sans-serif';
    ctx.fillText(['보존문서','운영일지','설비대장','원본기록'][i],x+128,y+153);ctx.font='14px monospace';ctx.fillText(`BAEKRO / 0${i+1}`,x+128,y+190);
  }
  // The inner cardboard receives little indirect light through the small handhold.
  ctx.fillStyle='#201d17';ctx.fillRect(0,800,128,128);
  const atlas=new T.CanvasTexture(canvas);atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=8;
  const printed=new T.MeshStandardMaterial({map:atlas,roughness:.89});printed.name='storage-covers-and-cartons';
  const pages=document.createElement('canvas');pages.width=pages.height=256;const pageCtx=pages.getContext('2d')!;
  pageCtx.fillStyle='#c6bda3';pageCtx.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=2){pageCtx.fillStyle=y%6?'#b9b298':'#a9a48d';pageCtx.fillRect(0,y,256,1);}
  const pageMap=new T.CanvasTexture(pages);pageMap.colorSpace=T.SRGBColorSpace;pageMap.anisotropy=8;
  const paper=new T.MeshStandardMaterial({map:pageMap,roughness:.96});paper.name='storage-paper-edges';
  return {printed,paper};
}
type StorageMaterials=ReturnType<typeof storageMaterials>;

export function storageShelf(w:number,d:number,metal:T.Material,contents?:StorageMaterials,seed=0,maintenance=false){
  const rack=new T.Group();rack.name='grounded-shelving';rack.userData.floorProp=true;
  const pieces=new Map<T.Material,T.BufferGeometry[]>();
  function add(geometry:T.BufferGeometry,material:T.Material){
    const flat=geometry.index?geometry.toNonIndexed():geometry;if(flat!==geometry)geometry.dispose();
    const list=pieces.get(material)??[];list.push(flat);pieces.set(material,list);return flat;
  }
  function box(x:number,y:number,z:number,bw:number,bh:number,bd:number,material:T.Material,tile?:Tile,front=false,rounded=false){
    const g=rounded?softBox(bw,bh,bd,.012):new T.BoxGeometry(bw,bh,bd),uv=g.getAttribute('uv'),p=g.getAttribute('position'),n=g.getAttribute('normal');
    if(tile)for(let i=0;i<uv.count;i++){
      const show=front&&n.getZ(i)>.9;
      const u=show?p.getX(i)/bw+.5:.08+uv.getX(i)*.06,v=show?p.getY(i)/bh+.5:.03+uv.getY(i)*.025;
      uv.setXY(i,(tile.x+u*tile.w)/1024,1-(tile.y+(1-v)*tile.h)/1024);
    }else if(material===metal)boxUV(g,x,y,z,.35);
    g.translate(x,y,z);return add(g,material);
  }
  const xs=[-w/2+.025,w/2-.025],zs=[-d/2+.025,d/2-.025];
  for(const x of xs)for(const z of zs){
    box(x,.006,z,.05,.012,.05,metal);
    // Rolled angle uprights, not solid square bars.
    box(x+Math.sign(x)*.022,1.036,z,.006,2.048,.05,metal);
    box(x,1.036,z+Math.sign(z)*.022,.05,2.048,.006,metal);
  }
  for(const y of [.15,.75,1.35,2.03]){
    box(0,y+.016,0,w,.008,d,metal);
    for(const z of [-d/2+.009,d/2-.009])box(0,y-.004,z,w,.032,.018,metal);
    for(const x of xs)box(x,y-.004,0,.018,.032,d,metal);
    for(const x of xs)for(const side of [-1,1]){
      const bolt=new T.CylinderGeometry(.006,.006,.004,8);bolt.rotateX(Math.PI/2);bolt.translate(x,y,side*(d/2-.002));add(bolt,metal);
    }
  }
  for(const flip of [-1,1]){
    const dx=w-.05,dy=flip*1.78,g=new T.BoxGeometry(Math.hypot(dx,dy),.018,.006);g.rotateZ(Math.atan2(dy,dx));g.translate(0,1.09,-d/2+.006);boxUV(g,0,0,0,.35);add(g,metal);
  }
  if(contents&&maintenance){
    for(const x of [-.7,.6]){
      const tile=binderTile(1),paint=contents.printed,base=.17;
      box(x,base+.145,0,.48,.29,.36,paint,tile,false,true);
      box(x,base+.3225,0,.494,.065,.374,paint,tile,false,true);
      for(const side of [-1,1]){
        box(x+side*.074,base+.38,0,.022,.05,.03,paint,tile,false,true);
        box(x+side*.15,base+.285,.191,.036,.082,.012,metal);
        box(x+side*.15,base+.277,.200,.022,.032,.006,metal);
      }
      box(x,base+.409,0,.17,.025,.035,paint,tile,false,true);
    }
  }else if(contents){
    const {printed,paper}=contents;
    function binder(x:number,base:number,z:number,width:number,i:number){
      const h=.315+(i%3)*.006,depth=.275,tile=binderTile(i);
      for(const side of [-1,1])box(x+side*(width/2-.0013),base+h/2,z,.0026,h,depth,printed,tile);
      box(x,base+h/2,z+depth/2-.002,width,h,.004,printed,tile,true);
      const pages=box(x,base+h/2,z-.002,width-.007,h-.016,depth-.012,paper);
      const pageUV=pages.getAttribute('uv'),pagePosition=pages.getAttribute('position'),pageNormal=pages.getAttribute('normal');
      for(let k=0;k<pageUV.count;k++)pageUV.setXY(k,Math.abs(pageNormal.getY(k))>.5?(pagePosition.getZ(k)-z+.002)/(depth-.012)+.5:(pagePosition.getY(k)-base)/(h-.016),(pagePosition.getX(k)-x)/(width-.007)+.5);
      const ring=new T.TorusGeometry(.009,.0014,6,14);ring.translate(x,base+h*(1-376/512),z+depth/2+.001);add(ring,metal);
    }
    function carton(x:number,base:number,z:number,i:number){
      const width=.33,height=.275,depth=.41,tile=cartonTile(i),gauge=.004;
      box(x,base+.002,z,width,gauge,depth,printed,tile);
      for(const side of [-1,1])box(x+side*(width/2-.002),base+height/2,z,gauge,height,depth,printed,tile);
      const back=box(x,base+height/2,z-depth/2+.002,width,height,gauge,printed,tile);
      const backUV=back.getAttribute('uv'),backNormals=back.getAttribute('normal');
      for(let k=0;k<backUV.count;k++)if(backNormals.getZ(k)>.9)backUV.setXY(k,.06,.16);
      // Front handhold is a real aperture through the cardboard, with four connected panels.
      const holeY=height*.76,holeW=.10,holeH=.025,front=z+depth/2-.002;
      const frontParts=[[-(width+holeW)/4,height/2,(width-holeW)/2,height],[(width+holeW)/4,height/2,(width-holeW)/2,height],[0,(holeY-holeH/2)/2,holeW,holeY-holeH/2],[0,(height+holeY+holeH/2)/2,holeW,height-holeY-holeH/2]];
      for(const [dx,y,bw,bh] of frontParts){
        const g=new T.BoxGeometry(bw,bh,gauge),uv=g.getAttribute('uv'),p=g.getAttribute('position'),n=g.getAttribute('normal');
        for(let k=0;k<uv.count;k++){
          const u=n.getZ(k)>.9?(p.getX(k)+dx)/width+.5:.1,v=n.getZ(k)>.9?(p.getY(k)+y)/height:.03;
          uv.setXY(k,(tile.x+u*tile.w)/1024,1-(tile.y+(1-v)*tile.h)/1024);
        }g.translate(x+dx,base+y,front);add(g,printed);
      }
      box(x,base+height+.005,z,width+.008,.01,depth+.008,printed,tile);
      for(const side of [-1,1]){
        box(x+side*(width/2+.002),base+height-.01,z,.004,.03,depth+.008,printed,tile);
        box(x,base+height-.01,z+side*(depth/2+.002),width+.008,.03,.004,printed,tile);
      }
      box(x,base+height+.0105,z,.022,.001,depth+.008,printed,binderTile(2));
    }
    for(const [row,y] of [.17,.77,1.37].entries()){
      const front=d/2-.07,offset=Math.abs(seed+row*13)%4;
      if(row===0){
        for(let x=-w/2+.24,i=0;x<w/2-.2;x+=.365,i++)carton(x,y,front-.205,i+offset);
      }else{
        // Alternating room/row ends keep catalog sections readable without cloned rows.
        const boxLeft=(seed+row)%2===0,boxX=(boxLeft?-1:1)*(w/2-.245);
        carton(boxX,y,front-.205,offset);
        const start=-w/2+.10+(boxLeft?.43:0),end=w/2-.10-(boxLeft?0:.43);
        for(let x=start,i=offset;x+.08<end;i++){
          const width=.058+(i%4)*.008;binder(x+width/2,y,front-.1375,width,i);x+=width+.014+(i%7===0?.024:0);
        }
      }
    }
  }
  for(const [material,geometries] of pieces){
    const combined=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());combined.computeBoundingBox();combined.computeBoundingSphere();
    const mesh=new T.Mesh(combined,material);mesh.name=material===metal?'storage-frame':material===contents?.paper?'storage-pages':'storage-records';mesh.castShadow=mesh.receiveShadow=true;rack.add(mesh);
  }
  return rack;
}
