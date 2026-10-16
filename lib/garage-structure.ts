import * as T from 'three';
import {surface,boxUV,softBox} from './materials.ts';
import {roundPipe} from './props.ts';
import {batchStaticGeometry} from './static-geometry.ts';

// Paint has no volume and does not cast a second, floating shadow on the slab.
export function garageMarking(root:T.Group,x:number,z:number,w:number,d:number,material:T.Material){
 const g=new T.PlaneGeometry(w,d),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w,uv.getY(i)*d);
 const mesh=new T.Mesh(g,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.0005,z);mesh.receiveShadow=true;root.add(mesh);return mesh;
}

export function buildGarageStructure(root:T.Group){
 const structure=new T.Group();structure.name='garage-structure';root.add(structure);
 const concrete=surface('concrete','#99a69b'),steel=surface('paintedMetal','#8a9690',{roughness:.68,metalness:.3}),pipePaint=new T.MeshStandardMaterial({color:'#60413c',roughness:.74,metalness:.24}),dark=new T.MeshStandardMaterial({color:'#33423d',roughness:.86});
 concrete.normalScale.setScalar(.35);steel.map?.dispose();steel.map=null;steel.metalnessMap=null;steel.metalness=.3;steel.normalScale.setScalar(.18);
 const box=(parent:T.Group,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const p=new T.Mesh(boxUV(softBox(w,h,d,Math.min(.009,h/4,w/4,d/4)),x,y,z),m);p.position.set(x,y,z);p.castShadow=p.receiveShadow=true;parent.add(p);return p;};
 const transverse=new T.Group();transverse.name='garage-transverse-beams';structure.add(transverse);
 for(const z of [-12,0,12])box(transverse,0,2.5,z,23.82,.4,.52,concrete);
 const longitudinal=new T.Group();longitudinal.name='garage-longitudinal-beams';structure.add(longitudinal);
 for(const x of [-9,0,9])box(longitudinal,x,2.56,0,.7,.28,43.82,concrete);
 // Offset the duct from the central column line. Its skin and seam frames sit
 // below the beams, with U hangers bearing on the actual roof slab.
 const duct=new T.Group();duct.name='garage-ventilation-duct';structure.add(duct);
 box(duct,1.1,2.16,0,.48,.2,43.82,steel);
 for(const z of [-20,-16,-12,-8,-4,0,4,8,12,16,20]){
  for(const y of [2.056,2.264])box(duct,1.1,y,z,.496,.008,.028,steel);
  for(const x of [.856,1.344])box(duct,x,2.16,z,.008,.208,.028,steel);
  box(structure,1.1,2.046,z,.62,.012,.05,steel);
  for(const x of [.81,1.39]){roundPipe(structure,[x,2.046,z],[x,2.7,z],.006,steel);box(structure,x,2.693,z,.10,.014,.10,steel);}
 }
 // Longitudinal mains pass below the beams. Cross runs rise above the duct
 // between the column rows, staying below the longitudinal girder soffits.
 const services=new T.Group();services.name='garage-service-pipes';structure.add(services);
 for(const x of [-8,8]){
  roundPipe(services,[x,2.17,-21.91],[x,2.17,21.91],.0325,pipePaint);
  for(let z=-20;z<=20;z+=5){const collar=new T.Mesh(new T.TorusGeometry(.035,.005,6,20),steel);collar.position.set(x,2.17,z);services.add(collar);roundPipe(structure,[x,2.17,z],[x,2.7,z],.006,steel);box(structure,x,2.693,z,.10,.014,.10,steel);}
 }
 for(const z of [-11.3,.7,12.7]){
  roundPipe(services,[-11.91,2.34,z],[11.91,2.34,z],.0325,pipePaint);
  for(const x of [-8,8])roundPipe(services,[x,2.17,z],[x,2.34,z],.0325,pipePaint);
  for(const x of [-10,-6,-2,2,6,10]){roundPipe(structure,[x,2.34,z],[x,2.7,z],.006,steel);box(structure,x,2.693,z,.10,.014,.10,steel);}
 }
 // A muted, worn epoxy stencil shares a metre-scale alpha mask across the floor.
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,128,128);ctx.fillStyle='#000';let seed=7301;for(let i=0;i<135;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%128;seed=(seed*1664525+1013904223)>>>0;ctx.fillRect(x,seed%128,1+(seed%7),1+(i%2));}
 const alpha=new T.CanvasTexture(c);alpha.wrapS=alpha.wrapT=T.RepeatWrapping;
 const floorPaint=new T.MeshStandardMaterial({color:'#b0b2a1',roughness:.94,alphaMap:alpha,alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});floorPaint.name='garage-floor-paint';
 const markings=new T.Group();markings.name='garage-direction-paint';structure.add(markings);
 for(const x of [-2.2,2.2])for(const z of [-16,-6,6,18]){
  const shape=new T.Shape();shape.moveTo(-.12,-.7);shape.lineTo(.12,-.7);shape.lineTo(.12,.15);shape.lineTo(.42,.15);shape.lineTo(0,.72);shape.lineTo(-.42,.15);shape.lineTo(-.12,.15);shape.closePath();const mesh=new T.Mesh(new T.ShapeGeometry(shape),floorPaint);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.0005,z);mesh.receiveShadow=true;markings.add(mesh);
 }
 // Keep the central pier strip distinct from the two real driving aisles.
 for(const z of [-12,0,12])for(const x of [-.72,.72])garageMarking(markings,x,z,.045,1.45,floorPaint);
 // The vehicle exit board is an actual supported object below the slab.
 const exit=new T.Group();exit.name='garage-vehicle-exit-board';structure.add(exit);
 box(exit,5.8,2.45,-21.5,2.1,.28,.045,dark);for(const x of [5,6.6])roundPipe(structure,[x,2.59,-21.5],[x,2.7,-21.5],.007,steel);
 const face=document.createElement('canvas');face.width=768;face.height=100;const f=face.getContext('2d')!;f.fillStyle='#2e423b';f.fillRect(0,0,768,100);f.fillStyle='#c8cdb7';f.font='50px sans-serif';f.textAlign='center';f.textBaseline='middle';f.fillText('차량 출구',384,50);const map=new T.CanvasTexture(face);map.colorSpace=T.SRGBColorSpace;const panel=new T.Mesh(new T.PlaneGeometry(2.02,.22),new T.MeshStandardMaterial({map,roughness:.88}));panel.position.set(5.8,2.45,-21.477);exit.add(panel);
 batchStaticGeometry(transverse,[]);batchStaticGeometry(longitudinal,[]);batchStaticGeometry(duct,[]);batchStaticGeometry(services,[]);batchStaticGeometry(markings,[]);batchStaticGeometry(structure,[]);
 return {root:structure,floorPaint};
}
