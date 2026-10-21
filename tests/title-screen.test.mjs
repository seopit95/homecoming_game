import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Render the actual TSX without importing the game's WebGL module or adding a runner.
function compiled(relative,imports={}){
  let js=ts.transpileModule(readFileSync(new URL(relative,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [name,url] of Object.entries({'react/jsx-runtime':import.meta.resolve('react/jsx-runtime'),...imports}))js=js.replaceAll(JSON.stringify(name),JSON.stringify(url)).replaceAll("'"+name+"'",JSON.stringify(url));
  return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');
}
const icons=compiled('../lib/icons.tsx');
const {TitleScreen}=await import(compiled('../app/title-screen.tsx',{'../lib/icons':icons}));
const defaults={ready:false,phase:'게임 자료를 불러오는 중',error:'',canContinue:false,showSettings:false,settingsPanel:null,onStart(){},onContinue(){},onSettings(){},onRetry(){}};
const render=props=>renderToStaticMarkup(createElement(TitleScreen,{...defaults,...props}));

test('initial server markup exposes the title and real loading status before game readiness',()=>{
  const html=render({});
  assert.match(html,/<h1[^>]*>귀가<small[^>]*lang="zh-Hant"[^>]*>\(歸家\)<\/small><span>03 : 17/);
  assert.match(html,/role="status"[^>]*>.*게임 자료를 불러오는 중/s);
  assert.doesNotMatch(html,/aria-busy="true"/,'loading announcements must not be queued behind a busy ancestor');
  assert.doesNotMatch(html,/<button|<canvas|<progress/);
});
test('ready state reveals only usable start/settings actions, and an existing save adds continue',()=>{
  const fresh=render({ready:true}),saved=render({ready:true,canContinue:true,savedLocation:'비상계단'});
  assert.match(fresh,/게임 시작 메뉴/);assert.match(fresh,/새 게임/);assert.match(fresh,/환경 설정/);
  assert.doesNotMatch(fresh,/이어하기|role="status"|disabled/);
  assert.match(saved,/이어하기/);assert.match(saved,/비상계단 · 저장된 기록/);
});
test('boot failure replaces indefinite loading with a persistent alert and retry action',()=>{
  const html=render({error:'연결을 확인해 주세요.'});
  assert.match(html,/role="alert">연결을 확인해 주세요\./);
  assert.match(html,/다시 불러오기/);
  assert.doesNotMatch(html,/role="status"|새 게임/);
});
test('settings view retains its controls and a return action without exposing game start',()=>{
  const html=render({ready:true,showSettings:true,settingsPanel:createElement('label',null,'전체 음량',createElement('input',{type:'range','aria-label':'전체 음량'}))});
  assert.match(html,/시작 화면으로/);assert.match(html,/aria-label="전체 음량"/);
  assert.doesNotMatch(html,/게임 시작 메뉴|새 게임|role="status"/);
});
