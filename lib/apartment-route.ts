import type {Action,Stage,Story} from './story.ts';

const records=['archive_road','archive_call','archive_gate'] as const;
const labels=['사진 배송봉투','상담 회신','영상보존 통지'];
const readyFoyer=(s:Pick<Story,'notes'>):Stage=>['annex_map','annex_badge'].every(id=>s.notes.includes(id))?'annex_exit_ready':s.notes.some(id=>id==='annex_map'||id==='annex_badge')?'annex_unlock':'annex_arrival';
const note=(s:Story,id:string,stage:Stage=s.stage):Story=>({...s,stage,notes:[...new Set([...s.notes,id])]});
export function apartmentRouteTransition(s:Story,a:Action):Story|undefined{
 if(s.stage==='lift_exit'&&a==='leave_lift')return {...s,stage:'lift_climb'};
 if(s.stage==='lift_climb')return a==='climbed'?{...s,stage:'corridor_run'}:s;
 if(['stairs_loop','stairs_descent','stairs_reverse','stairs_clue'].includes(s.stage)&&a==='up')return {...s,stage:'stairs_passage'};
 if(s.stage==='stairs_passage'&&a==='stair_exit')return {...s,stage:'transfer_gallery'};
 if(s.stage.startsWith('transfer_')){
  const route:Record<string,[Action,Stage]>={transfer_gallery:['call','transfer_wait'],transfer_wait:['arrived','transfer_enter'],transfer_enter:['enter','transfer_boarding'],transfer_boarding:['sealed','transfer_panel'],transfer_panel:['panel','transfer_ride'],transfer_ride:['stopped','transfer_exit'],transfer_exit:['ground_arrived','annex_arrival']};
  const step=route[s.stage];return step&&a===step[0]?{...s,stage:step[1]}:s;
 }
 if(s.stage==='stairs_ground')return a==='ground_arrived'?{...s,stage:'annex_arrival'}:s;
 if(s.stage.startsWith('annex_')){
  if(a==='annex_map'||a==='annex_badge'){if(s.notes.includes(a))return s;const next=note(s,a);return {...next,stage:readyFoyer(next)};}
  if(a==='annex_front_exit')return note(s,a);
  if(a==='annex_exit')return readyFoyer(s)==='annex_exit_ready'?{...s,stage:'annex_departure'}:s;
  if(a==='archive_enter'&&s.stage==='annex_departure')return {...s,stage:'archive_arrival'};
  return s;
 }
 if(s.stage.startsWith('archive_')){
  if(records.includes(a as typeof records[number])&&['archive_arrival','archive_search','archive_edit'].includes(s.stage)){
   if(s.notes.includes(a))return s;const next=note(s,a);return {...next,stage:records.every(id=>next.notes.includes(id))?'archive_reveal':'archive_search'};
  }
  if(a==='archive_ledger')return note(s,a,s.stage==='archive_arrival'?'archive_search':s.stage);
  if(a==='archive_play'&&s.stage==='archive_reveal')return note(s,a,'archive_playback');
  if(a==='archive_finish'&&s.stage==='archive_playback')return {...s,stage:'archive_escape',notes:[...new Set([...s.notes,...records.map(id=>id.replace('archive_','archive_sequence_'))])]};
  if(a==='archive_exit'&&s.stage==='archive_escape')return {...s,stage:'archive_departure'};
  if(a==='plant_enter'&&s.stage==='archive_departure')return {...s,stage:'plant_exit_ready'};
  return s;
 }
 if(s.stage.startsWith('plant_')){
  if(a==='plant_exit')return note(s,'basement_route','plant_departure');
  if(a==='parking_enter'&&s.stage==='plant_departure')return {...s,stage:'parking_alarm'};
  return s;
 }
 return undefined;
}
export function apartmentRouteObjective(s:Story):string|undefined{
 if(s.stage==='stairs_ground')return '비상계단을 따라 1층까지 계속 내려간다.';
 if(s.stage.startsWith('annex_'))return s.stage==='annex_departure'?"관리사무소 안으로 들어간다.\nCCTV에는 내가 돌아온 시각이 남아 있다.":!s.notes.includes('annex_map')?"안내판에서 주차장으로 가는 길을 찾는다.\n정문은 열리지 않는다.":!s.notes.includes('annex_badge')?"경비실 책상에서 관리용 열쇠를 챙긴다.\n당직자의 자리는 비어 있다.":"열쇠로 「관리사무소」 문을 연다.\n불 꺼진 사무실에 내 기록이 남아 있다.";
 if(['archive_arrival','archive_search','archive_edit'].includes(s.stage)){
  const count=records.filter(id=>s.notes.includes(id)).length,missing=labels.filter((_,i)=>!s.notes.includes(records[i]));
  return `보관대의 2803호 우편을 읽는다. ${count}/3\n${missing.join(' · ')} — 내가 받지 않은 우편.`;
 }
 if(s.stage==='archive_reveal')return "CCTV의 「누락 영상 재생」을 누른다.\n지우려 했던 아홉 초가 남아 있다.";
 if(s.stage==='archive_playback')return "CCTV 누락 영상을 끝까지 확인한다.\n문을 잠갔던 아홉 초. 아직 살아 있었다.";
 if(s.stage==='archive_escape')return "「B1 주차장」 방화문을 열어 내려간다.\n문밖의 긁는 소리가 가까워진다.";
 if(s.stage==='archive_departure')return '뒤돌아보지 말고 지하계단으로!';
 if(s.stage==='plant_exit_ready')return "노란 「B1 주차장」 표지를 따라 내려간다.\n계단 아래에서 찬 공기가 올라온다.";
 if(s.stage==='plant_departure')return '방화문 너머가 주차장이다. 내 차로 가야 한다.';
 return undefined;
}
export function normalizeApartmentRoute(s:Story):Story{
 const stage=s.stage;
 if(stage==='stairs_ground')return {...s,stage:'transfer_panel'};
 if(stage==='stairs_reverse'||stage==='stairs_clue'||stage==='stairs_passage')return {...s,stage:'stairs_loop'};
 if(stage.startsWith('parking'))return {...s,stage:'parking_alarm',notes:[...new Set([...s.notes.filter(id=>!['alarm','car_passenger','car_search'].includes(id)),'home_car_key','basement_route'])]};
 if(stage.startsWith('resident')||stage.startsWith('office')||stage.startsWith('service_')||stage.startsWith('court_'))return {...s,stage:readyFoyer(s),circuit:[],officeSupply:false};
 if(stage.startsWith('annex_'))return {...s,stage:stage==='annex_departure'?stage:readyFoyer(s),circuit:[]};
 if(stage.startsWith('archive_')&&!['archive_playback','archive_escape','archive_departure'].includes(stage))return {...s,stage:records.every(id=>s.notes.includes(id))?'archive_reveal':s.notes.some(id=>records.includes(id as typeof records[number]))?'archive_search':'archive_arrival',circuit:[]};
 if(stage.startsWith('plant_'))return {...s,stage:stage==='plant_departure'?stage:'plant_exit_ready',circuit:[]};
 return s;
}
