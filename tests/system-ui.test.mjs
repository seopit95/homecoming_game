import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement as h} from 'react';
import {renderToStaticMarkup as renderMarkup} from 'react-dom/server';
function compiled(relative,imports={}){let js=ts.transpileModule(readFileSync(new URL(relative,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [name,url] of Object.entries({'react':import.meta.resolve('react'),'react/jsx-runtime':import.meta.resolve('react/jsx-runtime'),...imports}))js=js.replaceAll(JSON.stringify(name),JSON.stringify(url)).replaceAll("'"+name+"'",JSON.stringify(url));return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');}
const localization=compiled('../app/localization.tsx',{'react':import.meta.resolve('react'),'../lib/i18n':new URL('../lib/i18n.ts',import.meta.url).href});
const {LanguageContext}=await import(localization);
const icons=compiled('../lib/icons.tsx');
const hud=compiled('../app/game-hud.tsx',{'../lib/icons':icons,'./localization':localization,'../lib/i18n':new URL('../lib/i18n.ts',import.meta.url).href,'react':import.meta.resolve('react')});
const {GameHud,MissionCopy,StaminaMeter}=await import(hud);
const render=node=>renderMarkup(h(LanguageContext.Provider,{value:'ko'},node));
const noop=()=>{};
test('play HUD never exposes mission text or automatic notices, even when the objective changes',()=>{
 const view={location:'관리사무소',floor:'1F',clock:'03:17',objective:'세 기록을 확인한다.',mission:'세 기록을 확인한다.',threat:0,elapsed:120,paused:false};
 for(const change of [{},{elapsed:0},{paused:true},{objective:'다음 장소로 이동한다.',mission:'다음 장소로 이동한다.'},{objective:''}]){
  const html=render(h(GameHud,{view:{...view,...change}}));
  assert.match(html,/관리사무소/);assert.match(html,/03:17/);
  assert.doesNotMatch(html,/현재 목표|새 목표|objective-notice|hud-objective|세 기록을 확인|다음 장소로 이동|<output|aria-live/);
 }
});
test('stamina appears during use and recovery with a named native meter, then disappears when full',()=>{
 assert.equal(render(h(StaminaMeter,{value:1,exhausted:false})), '');
 const use=render(h(StaminaMeter,{value:.42,exhausted:false}));assert.match(use,/<progress[^>]*aria-label="달리기 체력"[^>]*value="0.42"/);assert.match(use,/42%/);
 const tired=render(h(StaminaMeter,{value:.12,exhausted:true}));assert.match(tired,/숨 고르기/);assert.match(tired,/aria-valuetext="12%.*회복/);
});

const {PauseMenu}=await import(compiled('../app/pause-menu.tsx',{'../lib/icons':icons,'./game-hud':hud,'./localization':localization}));
test('pause separates settings and notebook in a named modal without losing resume or restart',()=>{
 const props={location:'관리사무소',floor:'1F',clock:'03:17',objective:'세 기록을 확인한다.',showNotes:false,onMission:noop,onFullscreen:noop,onContinue:noop,onRestart:noop,onSettings:noop,onNotes:noop,settingsPanel:h('label',null,'전체 음량',h('input',{'aria-label':'전체 음량',type:'range',value:.42,readOnly:true})),controlsHelp:h('p',null,'WASD 이동'),notebook:h('section',{'aria-label':'조사 수첩'},'회수한 편지')};
 const html=render(h(PauseMenu,props));assert.match(html,/<dialog[^>]*aria-modal="true"[^>]*aria-labelledby="pause-title"/);assert.match(html,/계속하기/);assert.doesNotMatch(html,/pause-objective|세 기록을 확인한다/);assert.match(html,/미션 메모/);assert.match(html,/전체 화면/);assert.match(html,/처음부터 다시/);assert.match(html,/aria-label="전체 음량"/);assert.doesNotMatch(html,/회수한 편지/);
 const book=render(h(PauseMenu,{...props,showNotes:true}));assert.match(book,/회수한 편지/);assert.doesNotMatch(book,/pause-objective|세 기록을 확인한다/);assert.doesNotMatch(book,/aria-label="전체 음량"/);assert.match(book,/aria-label="일시정지 탐색"/);
});

test('mission action stays emphasized while the unsettling second line remains readable',()=>{
 const mission='침대 옆 스마트폰을 집는다.\n꺼진 방에서 화면만 눈을 뜬다.';
 const html=render(h(MissionCopy,{text:mission}));
 assert.match(html,/<strong[^>]*>침대 옆 스마트폰을 집는다.<\/strong>/);
 assert.match(html,/<span class="objective-echo">꺼진 방에서 화면만 눈을 뜬다.<\/span>/);
 assert.doesNotMatch(html,/<output|aria-live/);
});

const {MissionNote}=await import(compiled('../app/mission-note.tsx',{'react':import.meta.resolve('react'),'./localization':localization,'./game-hud':hud,'../lib/icons':icons}));
test('mission note is an explicit accessible dialog with handwritten-paper structure and two safe exit actions',()=>{
 const html=render(h(MissionNote,{mission:'침대 옆 스마트폰을 집는다.\n꺼진 방에서 화면만 눈을 뜬다.',location:'침실',clock:'03:17',onClose:noop,onNotebook:noop}));
 assert.match(html,/<dialog[^>]*class="mission-note"[^>]*lang="ko"[^>]*aria-labelledby="mission-note-title"/);
 assert.match(html,/<article class="mission-paper"/);assert.match(html,/미션 메모 닫기/);assert.match(html,/접어 두기/);assert.match(html,/조사 수첩/);assert.match(html,/침대 옆 스마트폰을 집는다/);
 assert.doesNotMatch(html,/aria-live|objective-notice|hud-objective/);
 const empty=render(h(MissionNote,{mission:'',location:'침실',clock:'03:17',onClose:noop,onNotebook:noop}));assert.match(empty,/아직 적힌 미션이 없다/);
});
test('mission controls are opt-in, pause safely, and preserve the evidence shortcut',()=>{
 const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8'),note=readFileSync(new URL('../app/mission-note.tsx',import.meta.url),'utf8');
 assert.match(page,/className="mission-trigger"[^>]*aria-label="미션 메모 열기"[^>]*aria-haspopup="dialog"[^>]*aria-keyshortcuts="Tab"[^>]*onClick=\{openMission\}/);
 assert.match(page,/e.code==='Tab'&&!state.paused/);assert.match(page,/e.code==='KeyJ'/);
 assert.match(page,/function openMission\(\)\{[^}]*pause\(true\)/);assert.match(page,/function closeMission\(\)\{[^}]*pause\(false\)/);
 assert.match(page,/paused&&!ended&&!showMission/);assert.match(page,/paused&&showMission/);
 assert.match(note,/event.stopPropagation\(\)/);assert.match(note,/event.key==='Escape'/);assert.match(note,/event.key!=='Tab'/);assert.match(note,/previous\?\.isConnected/);
});

test('stamina status distinguishes ready from exhausted and clamps malformed display values',()=>{
 assert.match(render(h(StaminaMeter,{value:.25,exhausted:false})),/달리기 가능/);
 for(const value of [-.2,NaN,Infinity]){
  const html=render(h(StaminaMeter,{value,exhausted:true}));
  assert.match(html,/value="0"/);assert.match(html,/0%/);assert.doesNotMatch(html,/NaN|Infinity|-20%/);
 }
 assert.equal(render(h(StaminaMeter,{value:1.2,exhausted:false})), '');
 for(const [language,ready] of [['en','Ready to sprint'],['ja','走れる'],['zh-CN','可以奔跑']]){
  const html=renderMarkup(h(LanguageContext.Provider,{value:language},h(StaminaMeter,{value:.25,exhausted:false})));
  assert.ok(html.includes(ready));assert.doesNotMatch(html,/[가-힣]/);
 }
});
