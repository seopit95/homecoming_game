import test,{mock} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import * as materials from '../lib/materials.ts';import * as lighting from '../lib/lighting.ts';
const source=new T.Texture(),clones=[],events=[],renderedSkies=new Set(),originalClone=source.clone.bind(source);let sourceDisposed=false;
source.addEventListener('dispose',()=>{sourceDisposed=true;});source.clone=()=>{const t=originalClone();clones.push(t);t.addEventListener('dispose',()=>events.push('sky'));return t;};
class Renderer{shadowMap={};getRenderTarget(){return null;}setRenderTarget(){}setPixelRatio(){}setSize(){}clearDepth(){}compileAsync(){return Promise.resolve();}render(scene){if(scene.background?.isTexture)renderedSkies.add(scene.background);}dispose(){events.push('renderer');}}
mock.module('three',{namedExports:{...T,WebGLRenderer:Renderer}});mock.module('../lib/materials.ts',{namedExports:{...materials,courtyardSky:()=>source}});mock.module('../lib/lighting.ts',{namedExports:{...lighting,roomReflections:()=>({dispose(){}})}});mock.module('../lib/audio.ts',{namedExports:{HorrorAudio:class{prepare(){}dispose(){}}}});
const doc=new EventTarget();Object.assign(doc,{createElement:()=>({getContext:()=>({fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})});Object.defineProperty(globalThis,'document',{value:doc,configurable:true});const win=new EventTarget();Object.assign(win,{devicePixelRatio:1,matchMedia:()=>({matches:true})});Object.defineProperty(globalThis,'window',{value:win,configurable:true});Object.assign(globalThis,{ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
const {createGame}=await import('../lib/game.ts');
test('each game warms an owned sky clone and retires it before renderer disposal without invalidating the decoded source',async()=>{
 const canvas=new EventTarget();Object.assign(canvas,{clientWidth:1280,clientHeight:720});const game=createGame(canvas,()=>{},e=>assert.fail(e));
 try{await game.ready;assert.equal(clones.length,1);assert.deepEqual([...renderedSkies],[clones[0]],'warm uses the owned texture, not the shared prepared source');assert.equal(clones[0].source,source.source,'decoded pixels are shared');}
 finally{game.dispose();await new Promise(resolve=>setImmediate(resolve));}
 assert.deepEqual(events,['sky','renderer']);assert.equal(sourceDisposed,false);
});
