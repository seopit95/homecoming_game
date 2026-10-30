import type {GameView} from '../lib/game';
import {Pause,Expand} from '../lib/icons';

type Props={view:Pick<GameView,'location'|'floor'|'clock'|'objective'|'threat'>;recordCount:number;onPause:()=>void;onNotes:()=>void;onFullscreen:()=>void};
export function GameHud({view,recordCount,onPause,onNotes,onFullscreen}:Props){
 return <header className="hud">
  <div className="hud-position"><div className="room-label">{view.location}<span>{view.floor}</span></div><time className="clock">{view.clock}</time></div>
  <nav className="hud-tools" aria-label="플레이 메뉴"><button className="notes-trigger" aria-label="수집한 기록 보기" onClick={onNotes}>기록 <b>{recordCount}</b></button><button aria-label="전체 화면" title="전체 화면" onClick={onFullscreen}><Expand size={17}/></button><button className="pause-trigger" aria-label="일시정지" title="일시정지 · ESC" onClick={onPause}><Pause size={17}/><span>일시정지</span></button></nav>
  {view.objective&&<p className={`hud-objective${view.threat>.2?' urgent':''}`} role="status" aria-label="현재 목표">{view.objective}</p>}
 </header>;
}
export function StaminaMeter({value,exhausted}:{value:number;exhausted:boolean}){
 if(value>=1&&!exhausted)return null;
 return <div className={`stamina${exhausted?' exhausted':''}`}><span>{exhausted?'숨 고르기':'체력'}</span><progress aria-label="달리기 체력" aria-valuetext={`${Math.round(value*100)}%${exhausted?' · 걸으며 회복 중':''}`} max={1} value={value}/></div>;
}
