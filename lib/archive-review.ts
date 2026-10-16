import type {Action} from './story.ts';

export const archiveCamera={position:[12.95,2.54,-23.65],lookAt:[9,1.1,-19]} as const;

export const archiveClips={
 road:{duration:6,markFrom:3.8,markUntil:4.3,title:'A · 정문 도로 / 03:17',hint:'녹색 신호 아래 제동등이 처음 켜지는 순간을 찾자. 정지 후 ±1초로 대조할 수 있다.',finding:'신호는 녹색이었다. 브레이크를 밟은 건 사람을 치기 직전이다. 갑자기 뛰어든 것이 아니었다.'},
 call:{duration:12,markFrom:9.5,markUntil:10.5,title:'B · 양방향 통화 / 03:20',hint:'내 대답 뒤 어느 쪽에서 통화를 끊었는지 확인하자. 소리가 끊기는 순간에 표시한다.',finding:'「잘못 거셨어요.」 내 대답 뒤 수신자 쪽에서 끊었다. 돌아갈 수 있었는데, 내가 끊었다.'},
 gate:{duration:9,markFrom:5.8,markUntil:7.5,title:'C · 입차 원본 / 누락된 9초',hint:'조수석의 손이 보인다. 문을 열어 달라는 말 뒤 잠금음이 들리는 순간을 확인하자.',finding:'창문에 손이 닿았다. 문을 열어 달라는 목소리를 듣고도 나는 잠금 버튼을 눌렀다.'},
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
  if(action==='archive_record_mark'){const clip=archiveClips[source];return offset>=clip.markFrom&&offset<=clip.markUntil?{mark:`archive_sequence_${source}` as Action,message:clip.finding}:{message:(offset>clip.markUntil?'결정적인 순간이 지나갔다. 되감아서 확인하자.\n':'')+clip.hint};}
  return {message:''};
 }
 return {read,operate,reset(){source=null;offset=started=0;playing=false;}};
}
export type ArchiveReview=ReturnType<typeof createArchiveReview>;
