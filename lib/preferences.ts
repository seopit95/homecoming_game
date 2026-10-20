import {isExpansion,expansionStages} from './expansion-story.ts';
import {checkpoint,journal,initialStory,type Action,type Stage,type Story} from './story.ts';
export const defaultBindings={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',run:'ShiftLeft',interact:'KeyE',torch:'KeyF',crouch:'KeyC',breath:'ControlLeft'};
export type Binding=keyof typeof defaultBindings;
export const bindingLabels:Record<Binding,string>={forward:'앞으로',back:'뒤로',left:'왼쪽',right:'오른쪽',run:'달리기',interact:'상호작용',torch:'손전등',crouch:'몸 낮추기',breath:'숨 참기'};
export const defaultSettings={volume:.42,music:.65,effects:.85,voice:.85,brightness:1.25,sensitivity:1,bob:true,fov:72,subtitleScale:1,hints:true,reducedMotion:false,filmGrain:true,bindings:defaultBindings};
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
const saveStages:Stage[]=[...expansionStages,'light_switch','power','radio','lift_call','lift_button','lift_exit','stairs_loop','resident_arrival','resident_entry','office_record','office_fuse','office_power','office_tape','office_key','office_leave','parking_gate','parking_pump','parking_alarm','car_departure','car_escape','road_exit'];
export type Progress={version:2;stage:Stage;notes:string[];elapsed:number;circuit:Action[];code:string;pursuit:boolean;pursuitWait:number;officeSupply:boolean};
export function progressStage(stage:Stage):Stage{if(isExpansion(stage))return checkpoint({...initialStory(),stage}).stage;if(stage==='service_ride'||stage==='service_open')return 'service_ride';if(['wake_ring','light_switch','find_torch'].includes(stage))return 'light_switch';if(['drive','impact','flee','sleep','tv','power','phone','shoes'].includes(stage))return 'power';return checkpoint({...initialStory(),stage}).stage;}
export function readProgress(storage:Pick<Storage,'getItem'>):Progress|null{
  try{
    const s=JSON.parse(storage.getItem(PROGRESS_KEY)||'null');if(!s||s.version!==2||!saveStages.includes(s.stage)||!Array.isArray(s.notes)||!Number.isFinite(s.elapsed)||s.elapsed<0)return null;
    const pursuit=typeof s.pursuit==='boolean'?s.pursuit:s.stage.startsWith('archive_')&&s.notes.includes('court_confirm')||s.stage.startsWith('plant_')&&s.notes.includes('archive_play');
    const pursuitWait=typeof s.pursuitWait==='number'&&Number.isFinite(s.pursuitWait)?Math.min(600,Math.max(0,s.pursuitWait)):0;
    const circuit:Action[]=s.stage.startsWith('office')?Array.isArray(s.circuit)?[...new Set<Action>(s.circuit.filter((a:unknown)=>['circuit_a','circuit_b','circuit_c'].includes(a as string)))]:[]:Array.isArray(s.circuit)?s.circuit.filter((a:unknown)=>['archive_booth_close','archive_booth_open_out','archive_sequence_road','archive_sequence_call','archive_sequence_gate','plant_circuit_pump','plant_circuit_air','plant_circuit_lights','plant_route_closed','plant_route_drain'].includes(a as string)).slice(0,5):[];
    const notes=[...new Set<string>([...s.notes.filter((n:unknown)=>typeof n==='string'&&n in journal),...circuit.filter(a=>a.startsWith('archive_sequence_'))])];
    if(s.stage.startsWith('office')&&typeof s.officeSupply!=='boolean'&&(notes.some(n=>['security_power','monitor','service_key'].includes(n))||['office_tape','office_key','office_leave'].includes(s.stage))){circuit.splice(0,circuit.length,'circuit_b','circuit_c');for(const id of ['fuse','office_install','security_power'])if(!notes.includes(id))notes.push(id);}
    const officeSupply=typeof s.officeSupply==='boolean'?s.officeSupply:s.stage.startsWith('office')&&notes.includes('security_power');
    return {version:2,pursuit,pursuitWait,officeSupply,stage:s.stage.startsWith('office')?checkpoint({...initialStory(),stage:s.stage,notes,circuit,officeSupply}).stage:s.stage.startsWith('parking')?checkpoint({...initialStory(),stage:s.stage,notes:s.notes}).stage:s.stage==='road_exit'?'car_escape':s.stage,notes,code:typeof s.code==='string'&&/^\d{4}$/.test(s.code)?s.code:'0000',circuit,elapsed:Math.min(s.elapsed,86400)};
  }catch{return null;}
}
export function writeProgress(storage:Pick<Storage,'setItem'>,story:Pick<Story,'stage'|'notes'>&Partial<Pick<Story,'circuit'|'code'|'officeSupply'>>,elapsed:number,pursuit?:boolean,pursuitWait?:number){if(story.stage==='ended'||story.stage==='dying')return false;try{storage.setItem(PROGRESS_KEY,JSON.stringify({version:2,stage:story.stage.startsWith('office')?checkpoint({...initialStory(),...story}).stage:progressStage(story.stage),pursuit,pursuitWait,officeSupply:story.officeSupply??false,notes:story.notes,circuit:story.circuit??[],code:story.code??'0000',elapsed}));return true;}catch{return false;}}
