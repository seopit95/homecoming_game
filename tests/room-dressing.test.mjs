import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld} from '../lib/world.ts';
import {dressApartment} from '../lib/japan.ts';
const S=Math.SQRT2;
globalThis.document={createElement:()=>{
 const c={width:0,height:0,texts:[],fonts:[]};c.getContext=()=>({fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(text){c.texts.push(text);c.fonts.push(this.font);}});return c;
}};
// Removing the new vessel wall, lifting a prop or using an unspread home anchor must fail these checks.
const rows={apartment:[
 ['mug',-3.15*S-.2,2.4*S+.58,.535,.15,.15,.15],
 ['glass',-5.3*S+.62,-5.6*S+.12,.8,.09,.09,.15],
 ['jacket',-1.2*S,2.5*S,.5,.33,.41,.07]
],resident:[
 ['shirt',-3.38,-4.03,.505,.33,.36,.05],
 ['plant',2.3,-4.6,.81,.24,.25,.4]
]};
for(const [area,props] of Object.entries(rows))test(`${area}: curved living traces contact the real support and avoid other solids`,()=>{
 const w=buildWorld(new T.Scene(),area);try{
  w.root.updateMatrixWorld(true);const mesh=w.root.getObjectByName(`${area}-living-traces`);assert.ok(mesh,'physical lived-in dressing exists');
  const p=mesh.geometry.getAttribute('position');
  for(const [name,x,z,y,hx,hz,rise] of props){
   const points=[];for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);if(Math.abs(v.x-x)<=hx&&Math.abs(v.z-z)<=hz)points.push(v);}
   assert.ok(points.length>40,`${name} is native shaped geometry`);const b=new T.Box3().setFromPoints(points);
   assert.ok(Math.abs(b.min.y-y)<.003,`${name} base ${b.min.y} must contact ${y}`);assert.ok(b.max.y-y>=rise,`${name} has physical volume`);
   const support=[];w.root.traverse(o=>{if(o.isMesh&&o!==mesh)support.push(o);});
   const hit=new T.Raycaster(new T.Vector3(x,y+.002,z),new T.Vector3(0,-1,0),0,.012).intersectObjects(support,false)[0];assert.ok(hit&&Math.abs(hit.point.y-y)<.003,`${name} has an actual support beneath it`);
   for(const v of points)for(const s of w.solids){if(name==='jacket'&&Math.abs(s.x+1.2*S)<.001&&Math.abs(s.z-2.5*S)<.001)continue; // Sofa collision includes its tall back; real seat was ray-checked above.
    const top=(s.y??1.5)+(s.h??3)/2,bottom=(s.y??1.5)-(s.h??3)/2;if(v.y<=bottom+.001||v.y>=top-.001)continue;const a=s.yaw??0,dx=v.x-s.x,dz=v.z-s.z;assert.ok(Math.abs(dx*Math.cos(a)-dz*Math.sin(a))>=s.w/2-.003||Math.abs(dx*Math.sin(a)+dz*Math.cos(a))>=s.d/2-.003,`${name} intrudes another solid`);}
  }
  // A hollow vessel retains its base but no full cylinder lid.
  const [,x,z,y]=props[0];if(area==='apartment'){const hit=new T.Raycaster(new T.Vector3(x,y+.3,z),new T.Vector3(0,-1,0),0,.4).intersectObject(mesh,false)[0];assert.ok(hit&&hit.point.y<y+.03,'mug opening is hollow');}
 }finally{disposeWorld(w.root);}
});
for(const area of ['apartment','resident'])test(`${area}: new traces leave entry, device and clue sight lines open`,()=>{
 const w=buildWorld(new T.Scene(),area);try{w.root.updateMatrixWorld(true);const mesh=w.root.getObjectByName(`${area}-living-traces`);assert.ok(mesh);
 const rows=area==='apartment'?[['phone',[-3.15*S,1.65,2.4*S-1.25]],['radio',[2.75*S,1.65,5.15*S-1.25]],['shoes',[0,1.65,-5.9*S]],['door',[0,1.65,-5.3*S]]]:[['answerphone',[-3.8,1.65,2.8]],['portrait',[2.8,1.65,4.1]],['belongings',[1.35,1.65,4.6]],['resident_open',[0,1.65,4.9]]];
 for(const [id,eye] of rows){const target=w.targets.find(t=>t.id===id);assert.ok(target,`${id} identity remains`);const origin=new T.Vector3(...eye),d=target.point.clone().sub(origin),length=d.length();assert.equal(new T.Raycaster(origin,d.normalize(),0,length).intersectObject(mesh,false).length,0,`${id} is masked by new dressing`);}
 }finally{disposeWorld(w.root);}
});
test('folded garments have a curved cloth surface rather than a flat board top',()=>{
 for(const [area,points] of [['apartment',[[-1.2*S+.18,2.5*S-.15],[-1.2*S+.18,2.5*S],[-1.2*S+.18,2.5*S+.15]]],['resident',[[-3.38+.15,-4.03+.16],[-3.38,-4.03+.16],[-3.38-.15,-4.03+.16]]]]){
  const w=buildWorld(new T.Scene(),area);try{w.root.updateMatrixWorld(true);const m=w.root.getObjectByName(`${area}-living-traces`),ys=points.map(([x,z])=>new T.Raycaster(new T.Vector3(x,1,z),new T.Vector3(0,-1,0),0,.6).intersectObject(m,false)[0]?.point.y);assert.ok(ys.every(Number.isFinite),'cloth top exists across its body');assert.ok(Math.max(...ys)-Math.min(...ys)>.008,'folds curve by more than 8 mm across the body');}finally{disposeWorld(w.root);}
 }
});
test('physical building notices use Korean fonts and consistent resident identity without invented dates',()=>{
 const texts=[],fonts=[];for(const area of ['apartment','landing','lift','corridor','stairs','resident','office','parking']){const w=buildWorld(new T.Scene(),area);try{w.root.traverse(o=>{const c=o.material?.map?.image;if(c?.texts){texts.push(...c.texts);fonts.push(...c.fonts.filter(Boolean));}});}finally{disposeWorld(w.root);}}
 // Legacy non-home dressing is dormant in buildWorld; exercise its real canvas production separately.
 for(const area of ['landing','lift','corridor','stairs','office','parking']){const root=new T.Group();dressApartment(root,area);root.traverse(o=>{const c=o.material?.map?.image;if(c?.texts){texts.push(...c.texts);fonts.push(...c.fonts.filter(Boolean));}});disposeWorld(root);}
 assert.ok(texts.some(t=>t.includes('1994년 준공')));assert.ok(texts.some(t=>t.includes('한서연')));assert.ok(texts.some(t=>t.includes('2803'))&&texts.some(t=>t.includes('1704'))&&texts.some(t=>t.includes('내선 17')));
 assert.equal(texts.filter(t=>/[\u3040-\u30ff]|昭和|竣工|外壁補修|入居者|佐藤|非常口|立入禁止|十七階|避難経路|宿直日誌|目撃情報|月極|無断|歩行者/.test(t)).length,0,'Japanese notices or tenant names must be replaced');
 assert.equal(fonts.filter(f=>/Hiragino|Yu Mincho/.test(f)).length,0,'physical notices must use a Korean-capable font');
 assert.ok(texts.some(t=>t.includes('약속'))&&texts.some(t=>t.includes('내일 오후 두 시')),'reminder agrees with existing fridge appointment');
});
