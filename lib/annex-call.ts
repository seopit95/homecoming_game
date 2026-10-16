import type {Stage} from './story.ts';

// Old annex_search saves already have restored power. Evidence is optional;
// knowing a number is enough to try it, including after opening the exit.
export function annexCanCall(stage:Stage){return ['annex_search','annex_unlock','annex_exit_ready','annex_departure'].includes(stage);}
const lines={
 home:{kind:'home',answerAt:2.8,duration:4.5,clip:'come',action:'annex_line_home'},
 victim:{kind:'victim',answerAt:2.8,duration:8,clip:'cry',action:'annex_line_victim'},
 office:{kind:'office',answerAt:2.8,duration:10.506122,clip:'archive-guard',action:'annex_line_office'},
 external:{kind:'external',answerAt:0,duration:.8,clip:null,action:null},
 unknown:{kind:'unknown',answerAt:0,duration:2,clip:null,action:null},
} as const;
export function annexCallFor(number:string){return lines[number==='2803'?'home':number==='1704'?'victim':number==='17'||number==='0017'?'office':number==='112'||number==='119'?'external':'unknown'];}
export function annexCallLabel(number:string){return annexCallFor(number).kind==='office'?'당직 내선 17':number+(number.length===4?'호':'');}
