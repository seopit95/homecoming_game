import type {Action} from './story.ts';

export const archiveCamera={position:[12.95,2.54,-23.65],lookAt:[9,1.1,-19]} as const;

export const archiveClips={
 road:{duration:6,markFrom:4.5,title:'A · 정문 도로 / 03:17',hint:'신호와 제동등이 함께 보이는 순간을 찾으세요',finding:'녹색 보행 신호. 제동등은 충돌 직전에야 켜졌다.'},
 call:{duration:12,markFrom:9.5,title:'B · 양방향 통화 / 03:20',hint:'어느 쪽에서 통화를 끝냈는지 확인하세요',finding:'현장으로 돌아와 달라는 말에 내가 대답했다. 「잘못 거셨어요.」'},
 gate:{duration:9,markFrom:5.8,title:'C · 입차 원본 / 누락된 9초',hint:'조수석의 손과 잠금 소리를 함께 확인하세요',finding:'문을 열어 달라는 목소리. 잠금 소리 뒤에도 나는 차 안에 있었다.'},
} as const;
export type ArchiveSource=keyof typeof archiveClips;
export type ArchiveFrame={source:ArchiveSource|null;time:number;playing:boolean};
export function createArchiveReview(){
 let source:ArchiveSource|null=null,offset=0,started=0,playing=false;
 function read(now:number):ArchiveFrame{const time=source?Math.min(archiveClips[source].duration,Math.max(0,offset+(playing?now-started:0))):0;return {source,time,playing:playing&&!!source&&time<archiveClips[source].duration};}
 function operate(action:Action,now:number):{mark?:Action;message:string}{
  if(action.startsWith('archive_preview_')){const next=action.slice('archive_preview_'.length) as ArchiveSource;if(!(next in archiveClips))return {message:'원본이 선택되지 않았다.'};source=next;offset=0;started=now;playing=true;return {message:archiveClips[next].hint};}
  if(!source)return {message:'먼저 도로·통화·입차 중 한 원본을 재생하자.'};
  const frame=read(now);offset=frame.time;started=now;
  if(action==='archive_record_forward'||action==='archive_record_back'){offset=Math.max(0,Math.min(archiveClips[source].duration,offset+(action==='archive_record_forward'?1:-1)));playing=false;return {message:'정지 화면 · 1초씩 앞뒤로 대조할 수 있다.'};}
  if(action==='archive_record_pause'){playing=!frame.playing;if(playing&&offset===archiveClips[source].duration)offset=0;return {message:playing?'원본 재생':'원본만 일시정지했다. 주변은 계속 움직인다.'};}
  if(action==='archive_record_mark')return offset>=archiveClips[source].markFrom?{mark:`archive_sequence_${source}` as Action,message:archiveClips[source].finding}:{message:archiveClips[source].hint};
  return {message:''};
 }
 return {read,operate,reset(){source=null;offset=started=0;playing=false;}};
}
export type ArchiveReview=ReturnType<typeof createArchiveReview>;
