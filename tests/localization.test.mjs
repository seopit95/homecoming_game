import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalog,translate,languages,normalizeLanguage} from '../lib/i18n.ts';
import {defaultSettings,normalizeSettings,readSettings,writeSettings,SETTINGS_KEY} from '../lib/preferences.ts';
import {initialStory,objectives,objectiveFor,journal} from '../lib/story.ts';
import {investigation} from '../lib/investigation.ts';
import {wifeLetter} from '../lib/family-story.ts';
import {localizedContext,localizedTexture,setCanvasLanguage} from '../lib/localized-canvas.ts';
const targets=['en','ja','zh-CN'];
function compiled(file,imports={}){let source=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [key,value] of Object.entries({'react':import.meta.resolve('react'),'react/jsx-runtime':import.meta.resolve('react/jsx-runtime'),'../lib/i18n':new URL('../lib/i18n.ts',import.meta.url).href,...imports}))source=source.replaceAll(JSON.stringify(key),JSON.stringify(value)).replaceAll("'"+key+"'",JSON.stringify(value));return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');}
const localization=compiled('../app/localization.tsx'),icons=compiled('../lib/icons.tsx');
const {LanguageContext,localizeTree}=await import(localization);
const {TitleScreen}=await import(compiled('../app/title-screen.tsx',{'./localization':localization,'../lib/icons':icons}));
const hud=compiled('../app/game-hud.tsx',{'./localization':localization});
const {GameHud,MissionCopy}=await import(hud);
const {PauseMenu}=await import(compiled('../app/pause-menu.tsx',{'./localization':localization,'./game-hud':hud,'../lib/icons':icons}));
const {InvestigationNotebook}=await import(compiled('../app/investigation-notebook.tsx',{'./localization':localization,'../lib/icons':icons,'../lib/investigation':new URL('../lib/investigation.ts',import.meta.url).href}));
const render=(language,node)=>renderToStaticMarkup(h(LanguageContext.Provider,{value:language},node));

test('English is the stable default and only the four requested locale codes are accepted',()=>{
 assert.equal(defaultSettings.language,'en');assert.equal(normalizeSettings({volume:.2}).language,'en');
 assert.deepEqual(languages.map(x=>x.code),['en','ko','ja','zh-CN']);
 for(const value of [null,{},'fr','EN','zh',7])assert.equal(normalizeLanguage(value),'en');
 for(const {code} of languages)assert.equal(normalizeSettings({language:code}).language,code);
});
test('language roundtrips without changing other settings and corrupt or denied storage is safe',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 for(const {code} of languages){const settings=normalizeSettings({language:code,volume:.23,bindings:{interact:'KeyQ'}});assert.equal(writeSettings(storage,settings),true);const read=readSettings(storage);assert.equal(read.language,code);assert.equal(read.volume,.23);assert.equal(read.bindings.interact,'KeyQ');}
 data.set(SETTINGS_KEY,'broken');assert.equal(readSettings(storage).language,'en');
 assert.equal(readSettings({getItem(){throw Error('blocked');}}).language,'en');assert.equal(writeSettings({setItem(){throw Error('blocked');}},defaultSettings),false);
});
test('all authored source entries have complete translations, placeholders and paragraph breaks',()=>{
 const authored=Object.assign({},...['world','game','story','ui'].map(name=>JSON.parse(readFileSync(new URL('../lib/locales/'+name+'.json',import.meta.url),'utf8'))));
 assert.deepEqual(catalog,authored,'all authored locale entries are loaded');
 for(const [source,values] of Object.entries(catalog))for(const language of targets){assert.equal(typeof values[language],'string',source);assert.ok(values[language].trim(),source);assert.doesNotMatch(values[language],/[가-힣]/,source);assert.equal(translate(source,language),values[language],source);assert.deepEqual([...values[language].matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),[...source.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),source);assert.equal(values[language].split('\n').length,source.split('\n').length,source);}
});
test('unknown text, native option labels and multiline placeholders cannot recurse',()=>{
 for(const language of targets)for(const text of ['한국어','시설','알 수 없는 새로운 문장','{0}','未知の文字'])assert.doesNotThrow(()=>translate(text,language));
 const html=renderToStaticMarkup(localizeTree(h('select',null,...languages.map(item=>h('option',{key:item.code,lang:item.code,value:item.code},item.name))),'en'));
 for(const item of languages)assert.ok(html.includes(item.name));
 assert.equal(translate('2803호','en'),'Unit 2803');assert.match(translate('2분 14초','en'),/2m 14s/);
});
test('all story objectives and earned notebook records translate without changing evidence IDs',()=>{
 const notes=Object.keys(journal),original={...initialStory(),notes};
 for(const stage of Object.keys(objectives))for(const earned of [[],notes])for(const language of targets){const text=objectiveFor({...original,stage,notes:earned,circuit:['circuit_b'],officeSupply:true});if(text)assert.doesNotMatch(translate(text,language),/[가-힣]/,stage+': '+text);}
 const notebook=investigation(original);
 function check(value){if(typeof value==='string'&&/[가-힣]/.test(value)){for(const language of targets)assert.doesNotMatch(translate(value,language),/[가-힣]/,value);}else if(Array.isArray(value))value.forEach(check);else if(value&&typeof value==='object')Object.values(value).forEach(check);}
 check(notebook);assert.deepEqual(original.notes,notes);
 for(const language of targets){assert.ok(translate(wifeLetter,language).length>150);assert.equal(translate(wifeLetter,language).split('\n\n').length,wifeLetter.split('\n\n').length);}
});
test('real title, mission, pause and notebook components render all four languages',()=>{
 for(const {code} of languages){
  const title=render(code,h(TitleScreen,{ready:true,phase:'게임 자료를 불러오는 중',error:'',canContinue:true,savedLocation:'28층',showSettings:false,settingsPanel:null}));assert.ok(title.includes(translate('새 게임',code)));assert.ok(title.includes(translate('환경 설정',code)));
  const mission=objectiveFor({...initialStory(),stage:'phone'});const text=render(code,h(MissionCopy,{text:mission}));assert.ok(text.includes('<strong>'));if(code!=='ko')assert.doesNotMatch(text,/[가-힣]/);
  const pause=render(code,h(PauseMenu,{location:'침실',floor:'28F',clock:'03:17',objective:mission,showNotes:false,settingsPanel:h('label',null,'Language',h('select',null,h('option',{value:code},code))),controlsHelp:h('p',null,'조작 안내')}));assert.ok(pause.includes(translate('환경 설정',code)));if(code!=='ko')assert.doesNotMatch(pause,/[가-힣]/);
  const notebook=render(code,h(InvestigationNotebook,{story:{...initialStory(),notes:Object.keys(journal)}}));if(code!=='ko')assert.doesNotMatch(notebook,/[가-힣]/);
 }
});
test('existing canvas labels redraw immediately in each language and texture pixels are invalidated',()=>{
 const previous=globalThis.document;const canvases=[];
 function canvas(){const draws=[],c={width:256,height:128};const ctx={canvas:c,font:'20px sans-serif',fillStyle:'#fff',textAlign:'center',globalAlpha:1,globalCompositeOperation:'source-over',fillRect(){},clearRect(){},drawImage(){},save(){},restore(){},setTransform(){},getTransform(){return {a:1,b:0,c:0,d:1,e:0,f:0};},fillText(...args){draws.push(args);}};c.getContext=()=>ctx;canvases.push({c,ctx,draws});return c;}
 globalThis.document={createElement:canvas};try{
  setCanvasLanguage('en');const c=canvas(),ctx=localizedContext(c),texture=localizedTexture({needsUpdate:false});ctx.fillRect(0,0,256,128);ctx.fillText('수신 전화',128,64,220);
  const draws=canvases[0].draws;assert.equal(draws.at(-1)[0],translate('수신 전화','en'));
  for(const language of ['ja','zh-CN','ko','en']){texture.needsUpdate=false;setCanvasLanguage(language);assert.equal(draws.at(-1)[0],translate('수신 전화',language));assert.equal(texture.needsUpdate,true);assert.equal(draws.at(-1)[3],220);}
  ctx.fillRect(0,0,256,128);ctx.fillText('플래시 켜짐',128,64);setCanvasLanguage('ja');assert.equal(draws.at(-1)[0],translate('플래시 켜짐','ja'));
 }finally{globalThis.document=previous;}
});


test('every authored Korean runtime string remains covered by the catalog',()=>{
 const missing=[];
 for(const directory of ['app','lib'])for(const name of readdirSync(new URL('../'+directory+'/',import.meta.url)).filter(name=>/\.(ts|tsx)$/.test(name))){
  const path=directory+'/'+name,source=readFileSync(new URL('../'+path,import.meta.url),'utf8'),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function check(text){text=text.trim();if(/[가-힣]/.test(text)&&text!=='한국어'&&!catalog[text])missing.push(path+': '+text);}
  function visit(node){if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node))check(node.text);else if(ts.isTemplateExpression(node)){let text=node.head.text;node.templateSpans.forEach((part,i)=>text+='{'+i+'}'+part.literal.text);check(text);}ts.forEachChild(node,visit);}visit(file);
 }
 assert.deepEqual(missing,[]);
});
