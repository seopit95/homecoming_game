import type {Action,Stage} from './story.ts';

export const archiveCamera={position:[4.16,2.42,-6.28],lookAt:[.2,1.05,1.5]} as const;

export const archiveClips={
 road:{duration:6,markFrom:3.8,markUntil:4.3,title:'A · 정문 도로 / 03:17',hint:'보행 신호와 제동등이 켜지는 시점을 함께 살피자. 원본만 정지하거나 ±1초씩 대조할 수 있다.',question:'충돌 직전, 화면에서 확인한 사실은?',choices:['보행자가 적색 신호에 진입했다','차가 녹색 보행 신호에 진입했다'],answer:1,retry:'보행 신호와 제동등이 함께 보이는 구간을 다시 보자.',finding:'신호는 녹색이었다. 브레이크를 밟은 건 사람을 치기 직전이다. 갑자기 뛰어든 것이 아니었다.'},
 call:{duration:12,markFrom:9.5,markUntil:10.5,title:'B · 양방향 통화 / 03:20',hint:'양쪽 목소리와 통화 종료음을 대조하자. 대답이 끝난 뒤에도 원본을 되돌려 확인할 수 있다.',question:'이 통화를 먼저 끊은 쪽은?',choices:['수신자 · 등록 휴대전화','발신자 · 정문 비상벨'],answer:0,retry:'「잘못 거셨어요」라는 대답 뒤의 종료 표시를 다시 확인하자.',finding:'「잘못 거셨어요.」 내 대답 뒤 수신자 쪽에서 끊었다. 돌아갈 수 있었는데, 내가 끊었다.'},
 gate:{duration:9,markFrom:5.8,markUntil:7.5,title:'C · 입차 원본 / 누락된 9초',hint:'창밖의 사람과 목소리, 차 안의 잠금음을 함께 확인하자.',question:'03:26, 도움을 청하는 목소리 뒤의 행동은?',choices:['문을 열고 도움을 청한 사람을 확인했다','목소리를 듣고도 운전석에서 문을 잠갔다'],answer:1,retry:'잠금음이 날 때 운전석 문과 창문을 다시 보자.',finding:'충돌 아홉 분 뒤에도 한서연은 살아 있었다. 「문 좀 열어 주세요.」 그 목소리를 듣고도 나는 문을 잠갔다. 삭제해 달라고 했던 것은 이 아홉 초였다.'},
} as const;
export type ArchiveSource=keyof typeof archiveClips;
export type ArchiveFrame={source:ArchiveSource|null;time:number;playing:boolean;question?:boolean};
export function archiveReviewing(stage:Stage){return ['archive_arrival','archive_search','archive_edit'].includes(stage);}
export function createArchiveReview(){
 let source:ArchiveSource|null=null,offset=0,started=0,playing=false,question=false;
 function read(now:number):ArchiveFrame{const time=source?Math.min(archiveClips[source].duration,Math.max(0,offset+(playing?now-started:0))):0;return {source,time,playing:playing&&!!source&&time<archiveClips[source].duration,question};}
 function operate(action:Action,now:number):{mark?:Action;message:string}{
  if(action.startsWith('archive_preview_')){const next=action.slice('archive_preview_'.length) as ArchiveSource;if(!(next in archiveClips))return {message:'원본이 선택되지 않았다.'};source=next;offset=0;started=now;playing=true;question=false;return {message:archiveClips[next].hint};}
  if(!source)return {message:'먼저 도로·통화·입차 중 한 원본을 재생하자.'};
  const frame=read(now);offset=frame.time;started=now;
  if(action==='archive_record_forward'||action==='archive_record_back'){offset=Math.max(0,Math.min(archiveClips[source].duration,offset+(action==='archive_record_forward'?1:-1)));playing=false;question=false;return {message:'정지 화면 · 1초씩 앞뒤로 대조할 수 있다.'};}
  if(action==='archive_record_pause'){playing=!frame.playing;question=false;if(playing&&offset===archiveClips[source].duration)offset=0;return {message:playing?'원본 재생':'원본만 일시정지했다. 주변은 계속 움직인다.'};}
  if(action==='archive_record_mark'){
   const clip=archiveClips[source];if(offset<clip.markFrom)return {message:'아직 판단할 장면이 나오지 않았다. '+clip.hint};
   // Comparison uses a supporting frame, even if the player finished the clip.
   // It is an investigation, not a half-second reaction test.
   if(offset>clip.markUntil)offset=(clip.markFrom+clip.markUntil)/2;playing=false;question=true;
   return {message:clip.question+'\n4 · '+clip.choices[0]+'\n5 · '+clip.choices[1]};
  }
  if(action==='archive_record_choice_0'||action==='archive_record_choice_1'){
   if(!question)return {message:'먼저 원본에서 판단할 장면을 표시하자.'};const clip=archiveClips[source];question=false;
   if(Number(action.at(-1))!==clip.answer){offset=Math.max(0,clip.markFrom-2);playing=true;return {message:'방금 원본과 맞지 않는다. '+clip.retry};}
   playing=false;return {mark:`archive_sequence_${source}` as Action,message:clip.finding};
  }
  return {message:''};
 }
 return {read,operate,reset(){source=null;offset=started=0;playing=question=false;}};
}
export type ArchiveReview=ReturnType<typeof createArchiveReview>;
