import {readFile,writeFile,mkdir,readdir,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';

const root=fileURLToPath(new URL('../',import.meta.url));
// Render the existing title component, preserving the title before game JS loads.
async function compiled(relative,imports={}){
 const source=await readFile(path.join(root,relative),'utf8');
 let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const [name,url] of Object.entries({'react/jsx-runtime':import.meta.resolve('react/jsx-runtime'),...imports}))js=js.replaceAll(JSON.stringify(name),JSON.stringify(url)).replaceAll("'"+name+"'",JSON.stringify(url));
 return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64');
}
const icons=await compiled('lib/icons.tsx');
const {TitleScreen}=await import(await compiled('app/title-screen.tsx',{'../lib/icons':icons}));
const title=renderToStaticMarkup(createElement(TitleScreen,{ready:false,phase:'게임 자료를 불러오는 중',error:'',canContinue:false,showSettings:false,settingsPanel:null}));
const hints=JSON.parse(await readFile(path.join(root,'lib/visual-preloads.json'),'utf8'));
const links=hints.map(href=>`<link rel="preload" as="fetch" href=".${href}" crossorigin="anonymous" fetchpriority="low"/>`).join('\n');
const html=(await readFile(path.join(root,'itch/index.template.html'),'utf8')).replace('<!--TITLE_SCREEN-->',title).replace('<!--VISUAL_HINTS-->',links);
await writeFile(path.join(root,'itch/index.html'),html);
await build({configFile:path.join(root,'vite.itch.config.ts')});
const out=path.join(root,'dist/itch');
await writeFile(path.join(out,'README.txt'),'귀가 · 03:17\n무료 브라우저용 1인칭 공포게임.\nWASD 이동 / Shift 달리기 / E 확인 / F 스마트폰 플래시 / J 기록 / ESC 일시정지.\n마우스 또는 화면 드래그로 시점을 움직입니다. 소리는 게임 시작을 누른 뒤 켜집니다.\n내용 안내: 음주운전 사고, 가족의 상실, 공포·추격·비명.\n설정과 진행은 현재 브라우저에 저장됩니다.\n음원/질감 출처는 게임 크레딧과 각 자산 폴더의 LICENSE/sources 문서를 확인해 주세요.\n');
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())await walk(full);else if(e.isFile())files.push({name:path.relative(out,full).split(path.sep).join('/'),bytes:(await stat(full)).size});}}
await walk(out);
const totalBytes=files.reduce((n,f)=>n+f.bytes,0);
if(!files.some(f=>f.name==='index.html')||files.length>1000||totalBytes>500e6||files.some(f=>f.bytes>200e6||f.name.length>240))throw Error('itch.io ZIP entry or size limits exceeded');
const release=path.join(root,'outputs');await mkdir(release,{recursive:true});
const zip=path.join(release,'homecoming-0317-html5.zip');await rm(zip,{force:true});
execFileSync('zip',['-q','-r',zip,'.'],{cwd:out});
const sha256=createHash('sha256').update(await readFile(zip)).digest('hex');
let sourceCommit=null,sourceDirty=null;
try{sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();sourceDirty=!!execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
const manifest={format:'itch.io HTML5 ZIP',sourceCommit,sourceDirty,archive:zip,sha256,archiveBytes:(await stat(zip)).size,extractedBytes:totalBytes,fileCount:files.length,entry:'index.html',files};
await writeFile(path.join(release,'homecoming-0317-html5.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({...manifest,files:undefined},null,2));
