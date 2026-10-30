import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
function compiled(relative,imports={}){let js=ts.transpileModule(readFileSync(new URL(relative,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [name,url] of Object.entries({'react':import.meta.resolve('react'),'react/jsx-runtime':import.meta.resolve('react/jsx-runtime'),...imports}))js=js.replaceAll(JSON.stringify(name),JSON.stringify(url)).replaceAll("'"+name+"'",JSON.stringify(url));return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');}
const icons=compiled('../lib/icons.tsx');
const hud=compiled('../app/game-hud.tsx',{'../lib/icons':icons});
const {GameHud,StaminaMeter}=await import(hud);
const noop=()=>{};
test('play HUD announces the first objective prominently without upper-right controls',()=>{
 const props={view:{location:'관리사무소',floor:'1F',clock:'03:17',objective:'세 기록을 확인한다.',mission:'세 기록을 확인한다.',threat:0,elapsed:120,paused:false}};
 const html=render(h(GameHud,props));
 assert.match(html,/aria-label="현재 목표"/);assert.match(html,/aria-label="새 목표 안내"/);assert.match(html,/<output[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
 assert.doesNotMatch(html,/<button|플레이 메뉴|hud-tools/);
 const quiet=render(h(GameHud,{view:{...props.view,objective:''}}));assert.doesNotMatch(quiet,/현재 목표|새 목표|<output/);
 const status=render(h(GameHud,{view:{...props.view,objective:'통신실 녹음 재생 중'}}));assert.match(status,/<output[^>]*>[\s\S]*세 기록을 확인한다.[\s\S]*<\/output>/);assert.doesNotMatch(status.match(/<output[^>]*>[\s\S]*?<\/output>/)?.[0]||'',/통신실 녹음/);
 const covered=render(h(GameHud,{...props,obscured:true}));assert.doesNotMatch(covered,/<output/);
 const paused=render(h(GameHud,{view:{...props.view,paused:true}}));assert.doesNotMatch(paused,/<output/);assert.match(paused,/세 기록을 확인한다/);
});
test('stamina appears during use and recovery with a named native meter, then disappears when full',()=>{
 assert.equal(render(h(StaminaMeter,{value:1,exhausted:false})), '');
 const use=render(h(StaminaMeter,{value:.42,exhausted:false}));assert.match(use,/<progress[^>]*aria-label="달리기 체력"[^>]*value="0.42"/);assert.match(use,/42%/);
 const tired=render(h(StaminaMeter,{value:.12,exhausted:true}));assert.match(tired,/숨 고르기/);assert.match(tired,/aria-valuetext="12%.*회복/);
});

const {PauseMenu}=await import(compiled('../app/pause-menu.tsx',{'../lib/icons':icons,'./game-hud':hud}));
test('pause separates settings and notebook in a named modal without losing resume or restart',()=>{
 const props={location:'관리사무소',floor:'1F',clock:'03:17',objective:'세 기록을 확인한다.',showNotes:false,onFullscreen:noop,onContinue:noop,onRestart:noop,onSettings:noop,onNotes:noop,settingsPanel:h('label',null,'전체 음량',h('input',{'aria-label':'전체 음량',type:'range',value:.42,readOnly:true})),controlsHelp:h('p',null,'WASD 이동'),notebook:h('section',{'aria-label':'조사 수첩'},'회수한 편지')};
 const html=render(h(PauseMenu,props));assert.match(html,/<dialog[^>]*aria-modal="true"[^>]*aria-labelledby="pause-title"/);assert.match(html,/계속하기/);assert.match(html,/aria-label="현재 목표"/);assert.match(html,/세 기록을 확인한다/);assert.match(html,/전체 화면/);assert.match(html,/처음부터 다시/);assert.match(html,/aria-label="전체 음량"/);assert.doesNotMatch(html,/회수한 편지/);
 const book=render(h(PauseMenu,{...props,showNotes:true}));assert.match(book,/회수한 편지/);assert.match(book,/세 기록을 확인한다/);assert.doesNotMatch(book,/aria-label="전체 음량"/);assert.match(book,/aria-label="일시정지 탐색"/);
});

test('mission action stays emphasized while the unsettling second line remains readable',()=>{
 const mission='침대 옆 스마트폰을 집는다.\n꺼진 방에서 화면만 눈을 뜬다.';
 const html=render(h(GameHud,{view:{location:'침실',floor:'28F',clock:'03:17',objective:mission,mission,threat:0,elapsed:4,paused:false}}));
 assert.match(html,/<strong[^>]*>침대 옆 스마트폰을 집는다.<\/strong>/);
 assert.match(html,/<span class="objective-echo">꺼진 방에서 화면만 눈을 뜬다.<\/span>/);
 assert.match(html,/<output[^>]*role="status"/);
});
