import {checkpoint,journal,initialStory,type Stage,type Story} from './story.ts';
export const defaultBindings={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',run:'ShiftLeft',interact:'KeyE',torch:'KeyF',crouch:'KeyC'};
export type Binding=keyof typeof defaultBindings;
export const bindingLabels:Record<Binding,string>={forward:'앞으로',back:'뒤로',left:'왼쪽',right:'오른쪽',run:'달리기',interact:'상호작용',torch:'손전등',crouch:'몸 낮추기'};
export const defaultSettings={volume:.42,music:.65,effects:.85,voice:.85,brightness:1.25,sensitivity:1,bob:false,fov:72,subtitleScale:1,hints:true,reducedMotion:false,filmGrain:true,bindings:defaultBindings};
export type Settings=typeof defaultSettings;
export const SETTINGS_KEY='homecoming.settings.v2',PROGRESS_KEY='homecoming.progress.v2';
export function keyLabel(code:string){return code.replace('Key','').replace('Digit','').replace('Left','').replace('Right','');}
export function allowedKey(code:string){return /^(Key[A-IK-OQ-Z]|Digit[0-9]|ShiftLeft|ShiftRight|ControlLeft|ControlRight)$/.test(code);}
export function normalizeSettings(value:unknown):Settings{
  const v=(value&&typeof value==='object'?value:{}) as Partial<Settings>,s={...defaultSettings,bindings:{...defaultBindings}};
  for(const [key,min,max] of [['volume',0,1],['music',0,1],['effects',0,1],['voice',0,1],['brightness',.6,2.2],['sensitivity',.3,2],['fov',60,95],['subtitleScale',.85,1.5]] as const){const n=v[key];s[key]=typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):s[key];}
  for(const key of ['bob','hints','reducedMotion','filmGrain'] as const)if(typeof v[key]==='boolean')s[key]=v[key];
  const used=new Set<string>();
  for(const key of Object.keys(defaultBindings) as Binding[]){
    const candidate=v.bindings?.[key],desired=typeof candidate==='string'&&allowedKey(candidate)?candidate:defaultBindings[key];
    s.bindings[key]=!used.has(desired)?desired:!used.has(defaultBindings[key])?defaultBindings[key]:Object.values(defaultBindings).find(code=>!used.has(code))!;
    used.add(s.bindings[key]);
  }
  return s;
}
export function readSettings(storage:Pick<Storage,'getItem'>):Settings{try{return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY)||'null'));}catch{return normalizeSettings(null);}}
export function writeSettings(storage:Pick<Storage,'setItem'>,settings:Settings){try{storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeSettings(settings)));return true;}catch{return false;}}
const saveStages:Stage[]=['light_switch','power','radio','lift_call','lift_button','lift_exit','stairs_loop','resident_arrival','resident_entry','office_record','parking_gate','parking_alarm','car_escape','road_exit'];
export type Progress={version:2;stage:Stage;notes:string[];elapsed:number};
export function progressStage(stage:Stage):Stage{if(['wake_ring','light_switch','find_torch'].includes(stage))return 'light_switch';if(['drive','impact','flee','sleep','tv','power','phone','shoes'].includes(stage))return 'power';return checkpoint({...initialStory(),stage}).stage;}
export function readProgress(storage:Pick<Storage,'getItem'>):Progress|null{
  try{const s=JSON.parse(storage.getItem(PROGRESS_KEY)||'null');if(!s||s.version!==2||!saveStages.includes(s.stage)||!Array.isArray(s.notes)||!Number.isFinite(s.elapsed)||s.elapsed<0)return null;return {version:2,stage:s.stage==='road_exit'?'car_escape':s.stage,notes:[...new Set<string>(s.notes.filter((n:unknown)=>typeof n==='string'&&n in journal))],elapsed:Math.min(s.elapsed,86400)};}catch{return null;}
}
export function writeProgress(storage:Pick<Storage,'setItem'>,story:Pick<Story,'stage'|'notes'>,elapsed:number){if(story.stage==='ended'||story.stage==='dying')return false;try{storage.setItem(PROGRESS_KEY,JSON.stringify({version:2,stage:progressStage(story.stage),notes:story.notes,elapsed}));return true;}catch{return false;}}
