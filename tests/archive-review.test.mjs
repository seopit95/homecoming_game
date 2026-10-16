import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildWorld,disposeWorld,canStandAt} from '../lib/world.ts';
import {findPath} from '../lib/navigation.ts';
import {initialStory,transition} from '../lib/story.ts';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};

test('the archive recording can be paused and jogged to a decisive frame without pausing the game',()=>{
 const world=buildWorld(new T.Scene(),'archive'),player=world.archiveReview;
 assert.ok(player,'the archive needs a real source recording player');
 player.operate('archive_preview_call',10);assert.equal(player.read(12).time,2);assert.equal(player.read(12).playing,true);
 player.operate('archive_record_pause',12);assert.equal(player.read(90).time,2);assert.equal(player.read(90).playing,false);
 player.operate('archive_record_forward',90);assert.equal(player.read(91).time,3);
 assert.equal(player.operate('archive_record_mark',91).mark,undefined,'an arbitrary early frame cannot be accepted');
 for(let i=0;i<20;i++)player.operate('archive_record_forward',92);
 assert.equal(player.read(93).time,12);assert.equal(player.operate('archive_record_mark',93).mark,undefined,'the silent tail is not the moment the receiver cuts off the caller');player.operate('archive_record_back',93);player.operate('archive_record_back',93);assert.equal(player.operate('archive_record_mark',93).mark,'archive_sequence_call');
 player.operate('archive_preview_gate',100);assert.equal(player.read(101).source,'gate');assert.equal(player.read(101).time,1);
 world.reset();assert.equal(player.read(101).source,null);
});

test('V70 decisive evidence is visible at the marked moment rather than any later frame',()=>{
 const w=buildWorld(new T.Scene(),'archive');try{for(const [source,at,late] of [['road',4,6],['call',10,12],['gate',6,9]]){w.archiveReview.operate('archive_preview_'+source,100);assert.equal(w.archiveReview.operate('archive_record_mark',100+late).mark,undefined,source+' must reject the aftermath or silent tail');w.archiveReview.operate('archive_preview_'+source,200);w.archiveReview.operate('archive_record_pause',200+at);assert.equal(w.archiveReview.operate('archive_record_mark',300).mark,'archive_sequence_'+source,source+' can be marked on a paused decisive frame');}}finally{disposeWorld(w.root);}
});
test('V70 earned conclusions survive save and remain readable in the journal',async()=>{
 const {readProgress,writeProgress}=await import('../lib/preferences.ts');const {journalEntry}=await import('../lib/story.ts');let s={...initialStory(),stage:'archive_edit',notes:['archive_road','archive_call','archive_gate']};for(const id of ['archive_sequence_gate','archive_sequence_road','archive_sequence_call'])s=transition(s,id);assert.equal(s.stage,'archive_reveal');for(const id of s.circuit){assert.ok(s.notes.includes(id),'earned finding is retained');assert.ok(journalEntry(id,s)?.text.length>40,'the actual journal can explain the conclusion');}let raw;writeProgress({setItem:(_k,v)=>raw=v},s,950);const saved=readProgress({getItem:()=>raw});assert.deepEqual(saved.notes,s.notes);assert.deepEqual(saved.circuit,s.circuit);
});

test('V70 legacy save loading backfills only earned archive findings in their original order',async()=>{
 const {readProgress}=await import('../lib/preferences.ts'),{journalEntry}=await import('../lib/story.ts');for(const [stage,circuit] of [['archive_edit',['archive_sequence_road']],['archive_edit',['archive_sequence_gate','archive_sequence_road']],['archive_reveal',['archive_sequence_gate','archive_sequence_road','archive_sequence_call']]]){const saved=readProgress({getItem:()=>JSON.stringify({version:2,stage,circuit,notes:['archive_road','archive_call','archive_gate'],elapsed:950})});assert.equal(saved.stage,stage);assert.deepEqual(saved.circuit,circuit);assert.deepEqual(saved.notes,['archive_road','archive_call','archive_gate',...circuit]);for(const id of circuit)assert.ok(journalEntry(id,saved)?.text.length>40);}const notes=['archive_road','archive_sequence_road'],saved=readProgress({getItem:()=>JSON.stringify({version:2,stage:'archive_edit',circuit:['archive_sequence_road','plant_circuit_pump'],notes,elapsed:950})});assert.deepEqual(saved.notes,notes,'existing findings are not duplicated and switches are not fabricated as observations');
});
test('V70 physical review keys have real reachable surfaces and the deck rests on the desk',()=>{
 const w=buildWorld(new T.Scene(),'archive');try{const deck=w.root.getObjectByName('archive-review-deck');assert.ok(deck);w.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(deck),keys=w.targets.filter(t=>t.id.startsWith('archive_preview_')||t.id.startsWith('archive_record_')),keyBounds=new T.Box3();for(const t of keys)keyBounds.union(new T.Box3().setFromObject(t.mesh));assert.ok(keyBounds.max.x-keyBounds.min.x<.6,'a desk remote must fit human hands rather than span a metre');assert.ok(Math.abs(bounds.min.y-.82)<.001,'actual feet meet the existing desk top');for(const t of keys){assert.equal(t.precise,true,'nearby small controls need actual ray selection');const eye=new T.Vector3(t.mesh.userData.approach.x,1.65,t.mesh.userData.approach.z),d=t.point.clone().sub(eye),ray=new T.Raycaster(eye,d.normalize());assert.ok(ray.intersectObject(t.mesh,false).length,'target ray reaches the real key surface');}}finally{disposeWorld(w.root);}
});

test('V70 archive evidence framing keeps the walk signal and passenger hand readable on the actual recording',()=>{
 const scene=new T.Scene(),w=buildWorld(scene,'archive');try{for(const [source,time,name,minPixels] of [['road',4,'cctv-walk-signal',12],['gate',6,'cctv-passenger-hand',26]]){w.archiveReview.operate('archive_preview_'+source,0);w.archiveReview.operate('archive_record_pause',time);w.updateStory('archive_edit',time,false,{...initialStory(),stage:'archive_edit'});let recording,camera;w.surveillance.render({shadowMap:{autoUpdate:true},getRenderTarget:()=>null,setRenderTarget(){},render(s,c){recording=s;camera=c;}},scene,true);recording.updateMatrixWorld(true);camera.updateMatrixWorld();let object=recording.getObjectByName(name);if(!object)recording.traverse(o=>{if(name==='cctv-walk-signal'&&o.geometry?.type==='CircleGeometry'&&o.position.x===-3.9)object=o;});assert.ok(object,'physical evidence object '+name);const b=new T.Box3().setFromObject(object),projected=new T.Box2();for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).project(camera);projected.expandByPoint(new T.Vector2(p.x,p.y));}assert.ok(projected.min.x>-.95&&projected.max.x<.95&&projected.min.y>-.75&&projected.max.y<.75,'the evidence fits inside the recorded image, clear of captions');assert.ok((projected.max.y-projected.min.y)*240>=minPixels,'the clue must occupy readable pixels on the real 640×480 feed');}}finally{disposeWorld(w.root);}
});

test('V70 desk supports the remote feet and guide while the closer control approach remains reachable',()=>{
 const w=buildWorld(new T.Scene(),'archive');try{w.root.updateMatrixWorld(true);const deck=w.root.getObjectByName('archive-review-deck'),outside=[];w.root.traverse(o=>{if(o.isMesh&&!deck.getObjectById(o.id))outside.push(o);});const supported=[];deck.traverse(o=>{if(o.name==='archive-deck-foot'||o.name==='archive-deck-guide')supported.push(o);});assert.equal(supported.length,5);for(const o of supported){const b=new T.Box3().setFromObject(o),p=b.getCenter(new T.Vector3());p.y=b.min.y+.0001;const hit=new T.Raycaster(p,new T.Vector3(0,-1,0),0,.002).intersectObjects(outside,false)[0];assert.ok(hit&&hit.distance<.001,'a real desk surface must support '+o.name);}for(const t of w.targets.filter(t=>t.id.startsWith('archive_record_')||t.id.startsWith('archive_preview_'))){const a=t.mesh.userData.approach;assert.ok(canStandAt(a.x,a.z,w.solids,.23,w.bounds),t.id+' has standing room');assert.ok(findPath(w.spawn,a,w.solids,w.bounds,.23).length,t.id+' is reachable through the original booth entrance');}}finally{disposeWorld(w.root);}
});

test('marked recordings accept any investigative order and preserve existing saved conclusions',()=>{
 let story={...initialStory(),stage:'archive_edit',notes:['archive_road','archive_call','archive_gate'],circuit:['archive_sequence_road']};
 const same=transition(story,'archive_sequence_road');assert.equal(same,story,'repeat marking cannot erase accepted evidence');
 story=transition(story,'archive_sequence_gate');assert.equal(story.stage,'archive_edit');assert.ok(story.circuit.includes('archive_sequence_road'));assert.ok(story.circuit.includes('archive_sequence_gate'));
 story=transition(story,'archive_sequence_call');assert.equal(story.stage,'archive_reveal');
});
