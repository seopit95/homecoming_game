'use client';
import type {GameView} from '../lib/game';
import {useEffect,useState} from 'react';

type Props={view:Pick<GameView,'location'|'floor'|'clock'|'objective'|'mission'|'threat'|'elapsed'|'paused'>;obscured?:boolean};
export function GameHud({view,obscured=false}:Props){
 const objective=view.objective?view.mission:'';
 const [notice,setNotice]=useState({text:!obscured&&!view.paused?objective:'',at:view.elapsed});
 // Simulation time freezes with pause and resumes from the saved checkpoint.
 useEffect(()=>{if(objective&&!view.paused&&!obscured)setNotice(previous=>previous.text!==objective||view.elapsed<previous.at?{text:objective,at:view.elapsed}:previous);},[objective,view.elapsed,view.paused,obscured]);
 const announcing=!!objective&&notice.text===objective&&view.elapsed-notice.at<5.5;
 const showNotice=!view.paused&&!obscured&&announcing;
 return <>
  <header className={`hud${showNotice?' has-objective-notice':''}`}>
   <div className="hud-position"><div className="room-label">{view.location}<span>{view.floor}</span></div><time className="clock">{view.clock}</time></div>
   {objective&&<section className={`hud-objective${view.threat>.2?' urgent':''}`} aria-label="현재 목표" aria-hidden={showNotice}><span>해야 할 일</span><MissionCopy text={objective}/>{view.objective!==view.mission&&<small className="hud-context">{view.objective}</small>}</section>}
  </header>
  {showNotice&&<output className="objective-notice" role="status" aria-live="polite" aria-atomic="true" aria-label="새 목표 안내"><span>잊지 마.</span><MissionCopy text={objective}/></output>}
 </>;
}
export function MissionCopy({text}:{text:string}){
 const [action,...echo]=text.split('\n');
 return <p><strong>{action}</strong>{echo.length>0&&<span className="objective-echo">{echo.join('\n')}</span>}</p>;
}
export function StaminaMeter({value,exhausted}:{value:number;exhausted:boolean}){
 if(value>=1&&!exhausted)return null;
 return <div className={`stamina${exhausted?' exhausted':''}`}><span>{exhausted?'숨 고르기':'체력'}</span><progress aria-label="달리기 체력" aria-valuetext={`${Math.round(value*100)}%${exhausted?' · 걸으며 회복 중':''}`} max={1} value={value}/></div>;
}
