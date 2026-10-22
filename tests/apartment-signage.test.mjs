import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildApartmentEscape,apartmentEscapeLayout} from '../lib/apartment-escape.ts';
import {disposeWorld} from '../lib/world.ts';

globalThis.document={createElement:()=>{
 const canvas={width:0,height:0,texts:[],lettering:[]};
 const ink={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},fillText(text,x,y){canvas.texts.push(text);canvas.lettering.push({text,x,y,font:this.font});}};
 canvas.getContext=()=>ink;return canvas;
}};
function build(area){const root=new T.Group();return {root,...buildApartmentEscape(root,area)};}

test('V129 1F evacuation board is a room diagram with a distinct title, current position and B1 route',()=>{
 const w=build('annex');try{
  const t=w.targets.find(t=>t.id==='annex_map'),face=w.root.getObjectByName('annex-floor-plan'),image=face.material.map.image;
  for(const text of ['1층 피난안내도','공동현관','경비실','관리문서 보관실','비상계단','B1 주차장','현위치'])assert.ok(image.texts.includes(text),`${text} appears as a separate diagram label`);
  const title=image.lettering.find(l=>l.text==='1층 피난안내도'),legend=image.lettering.find(l=>l.text==='낙하물 위험 · 출입 금지');
  assert.ok(parseFloat(title.font.match(/[\d.]+(?=px)/)[0])>parseFloat(legend.font.match(/[\d.]+(?=px)/)[0])*1.5,'main title has clear type hierarchy');
  assert.deepEqual(face.position.toArray(),[-5.8395,1.5,5.35]);
  assert.equal(face.geometry.parameters.width,1.84);assert.equal(face.geometry.parameters.height,1.14);
  assert.equal(t.mesh,face);assert.deepEqual(t.point.toArray(),[-5.83,1.5,5.35]);assert.deepEqual(t.mesh.userData.approach,{x:-4.6,z:5.35});
 }finally{disposeWorld(w.root);}
});

test('V129 connection plaques display concise place names while interaction captions retain their meaning',()=>{
 for(const [area,label] of [['annex','관리문서 보관실'],['archive','비상계단'],['plant','지하주차장']]){
  const w=build(area);try{
   const face=w.root.getObjectByName(`${area}-exit-plaque-face`),target=w.targets.find(t=>t.id===`${area}_exit`);
   assert.ok(face,`${area} has a framed lintel plaque`);assert.equal(face.userData.text,label);
   assert.equal(target.label,apartmentEscapeLayout[area].exit,'place plaque is separate from the existing target caption');
   const texts=[];w.root.traverse(o=>{if(o.material?.map?.image?.texts)texts.push(...o.material.map.image.texts);});
   assert.equal(texts.some(s=>s.includes('경비실 ←     북측 연결문')||s.includes('1F 공동현관 / B1')),false,'floating hanging banners are removed');
  }finally{disposeWorld(w.root);}
 }
});

test('V129 new plaques have real rear wall contact, a backing, rim and four fasteners',()=>{
 for(const area of ['annex','archive','plant']){
  const w=build(area);try{
   w.root.updateMatrixWorld(true);const plaques=[];
   w.root.traverse(o=>{if(o.userData.apartmentPlaque)plaques.push(o);});assert.ok(plaques.length>=2,`${area} mounted signage`);
   for(const plaque of plaques){
    const caseMesh=plaque.getObjectByName(`${plaque.name}-backing`),face=plaque.getObjectByName(`${plaque.name}-face`);
    assert.ok(caseMesh&&face,`${plaque.name} face and case`);
    assert.equal(plaque.children.filter(o=>o.name.endsWith('-screw')).length,4,'four physical screws');
    const normal=new T.Vector3(0,0,1).transformDirection(plaque.matrixWorld),rear=new T.Vector3(0,0,.001).applyMatrix4(plaque.matrixWorld),others=[];
    w.root.traverse(o=>{if(o.isMesh&&!plaque.getObjectById(o.id))others.push(o);});
    assert.ok(new T.Raycaster(rear,normal.clone().negate(),.00001,.004).intersectObjects(others,false)[0],`${plaque.name} rear touches the actual wall/backing`);
   }
  }finally{disposeWorld(w.root);}
 }
});
