import ui from './locales/ui.json' with {type:'json'};
import story from './locales/story.json' with {type:'json'};
import game from './locales/game.json' with {type:'json'};
import world from './locales/world.json' with {type:'json'};

export const languages=[{code:'en',name:'English'},{code:'ko',name:'한국어'},{code:'ja',name:'日本語'},{code:'zh-CN',name:'简体中文'}] as const;
export type Language=typeof languages[number]['code'];
type Translations=Record<Exclude<Language,'ko'>,string>;
export const catalog:Record<string,Translations>={...world,...game,...story,...ui};
export function normalizeLanguage(value:unknown):Language{return languages.some(item=>item.code===value)?value as Language:'en';}
const hangul=/[가-힣]/;
const cache=new Map<string,string>();
const fragments:Record<string,Translations>={...catalog};
for(const [source,values] of Object.entries(catalog)){
 const lines=source.split('\n');
 if(lines.length>1&&Object.values(values).every(text=>text.split('\n').length===lines.length))lines.forEach((line,i)=>{if(line.trim()&&!fragments[line])fragments[line]={en:values.en.split('\n')[i],ja:values.ja.split('\n')[i],'zh-CN':values['zh-CN'].split('\n')[i]};});
}
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates=Object.entries(fragments).filter(([source])=>/\{\d+\}/.test(source)&&source.replace(/\{\d+\}/g,'').trim()).map(([source,values])=>({values,ids:[...source.matchAll(/\{(\d+)\}/g)].map(m=>m[1]),pattern:new RegExp('^'+source.split(/\{\d+\}/).map(escape).join('(.*?)')+'$','s')}));
const parts=Object.keys(fragments).filter(source=>hangul.test(source)&&!source.includes('{')).sort((a,b)=>b.length-a.length);
const partPattern=new RegExp(parts.map(escape).join('|'),'g');
/** Translate only presentation text. Story IDs, saves, timings and game state stay unchanged. */
export function translate(text:string,language:Language='en'):string{
 if(language==='ko'||!text||!hangul.test(text))return text;
 const key=language+'\0'+text,known=cache.get(key);if(known!==undefined)return known;
 const source=text.trim(),spacing=(value:string)=>text.slice(0,text.indexOf(source))+value+text.slice(text.indexOf(source)+source.length);
 let result:string|undefined=fragments[source]?.[language];
 if(result===undefined)for(const template of templates){const match=source.match(template.pattern);if(match){result=template.values[language].replace(/\{(\d+)\}/g,(_whole,id)=>match[template.ids.indexOf(id)+1]===source?source:translate(match[template.ids.indexOf(id)+1]??'',language));break;}}
 if(result===undefined)result=source.replace(partPattern,part=>fragments[part][language]);
 result=spacing(result);if(cache.size>4096)cache.clear();cache.set(key,result);return result;
}
