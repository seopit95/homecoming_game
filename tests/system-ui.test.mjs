import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
function compiled(relative,imports={}){let js=ts.transpileModule(readFileSync(new URL(relative,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [name,url] of Object.entries({'react':import.meta.resolve('react'),'react/jsx-runtime':import.meta.resolve('react/jsx-runtime'),...imports}))js=js.replaceAll(JSON.stringify(name),JSON.stringify(url)).replaceAll("'"+name+"'",JSON.stringify(url));return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');}
const icons=compiled('../lib/icons.tsx');
const {GameHud,StaminaMeter}=await import(compiled('../app/game-hud.tsx',{'../lib/icons':icons}));
const noop=()=>{};
test('active objective and the three HUD actions remain named, while disabled hints leave no objective panel',()=>{
 const props={view:{location:'관리사무소',floor:'1F',clock:'03:17',objective:'세 기록을 확인한다.',threat:0},recordCount:3,onPause:noop,onNotes:noop,onFullscreen:noop};
 const html=render(h(GameHud,props));assert.match(html,/aria-label="현재 목표"/);assert.match(html,/세 기록을 확인한다/);
 for(const label of ['수집한 기록 보기','전체 화면','일시정지'])assert.match(html,new RegExp('aria-label="'+label+'"'));
 const quiet=render(h(GameHud,{...props,view:{...props.view,objective:''}}));assert.doesNotMatch(quiet,/현재 목표/);
});
test('stamina appears during use and recovery with a named native meter, then disappears when full',()=>{
 assert.equal(render(h(StaminaMeter,{value:1,exhausted:false})), '');
 const use=render(h(StaminaMeter,{value:.42,exhausted:false}));assert.match(use,/<progress[^>]*aria-label="달리기 체력"[^>]*value="0.42"/);assert.match(use,/42%/);
 const tired=render(h(StaminaMeter,{value:.12,exhausted:true}));assert.match(tired,/숨 고르기/);assert.match(tired,/aria-valuetext="12%.*회복/);
});

const {PauseMenu}=await import(compiled('../app/pause-menu.tsx',{'../lib/icons':icons}));
test('pause separates settings and notebook in a named modal without losing resume or restart',()=>{
 const props={location:'관리사무소',floor:'1F',clock:'03:17',showNotes:false,onContinue:noop,onRestart:noop,onSettings:noop,onNotes:noop,settingsPanel:h('label',null,'전체 음량',h('input',{'aria-label':'전체 음량',type:'range',value:.42,readOnly:true})),controlsHelp:h('p',null,'WASD 이동'),notebook:h('section',{'aria-label':'조사 수첩'},'회수한 편지')};
 const html=render(h(PauseMenu,props));assert.match(html,/<dialog[^>]*aria-modal="true"[^>]*aria-labelledby="pause-title"/);assert.match(html,/계속하기/);assert.match(html,/처음부터 다시/);assert.match(html,/aria-label="전체 음량"/);assert.doesNotMatch(html,/회수한 편지/);
 const book=render(h(PauseMenu,{...props,showNotes:true}));assert.match(book,/회수한 편지/);assert.doesNotMatch(book,/aria-label="전체 음량"/);assert.match(book,/aria-label="일시정지 탐색"/);
});
