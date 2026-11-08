'use client';
import {useContext} from 'react';
import {LanguageContext,localizeTree} from './localization';

import {useEffect,useRef} from 'react';
type Props={air:number;holding:boolean;locked:boolean;breathKey:string;onHold:(down:boolean)=>void};
export function BreathControl({air,holding,locked,breathKey,onHold}:Props){
 const language=useContext(LanguageContext);
  const release=useRef(onHold);release.current=onHold;
  useEffect(()=>()=>release.current(false),[]);
  useEffect(()=>{if(locked)release.current(false);},[locked]);
  return localizeTree(<div className={`breath-control${holding?' holding':''}${locked?' recovering':''}`}>
    <span>{holding?'숨을 참는 중':locked?'호흡을 가다듬는 중':<><kbd>{breathKey==='Control'?'Ctrl':breathKey}</kbd> 누르고 숨 참기</>}</span>
    <progress aria-label="남은 숨" max={1} value={air}/>
    <button aria-label="숨 참기" aria-pressed={holding} disabled={locked}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onHold(true);}}
      onPointerUp={()=>onHold(false)} onPointerCancel={()=>onHold(false)} onLostPointerCapture={()=>onHold(false)}>누르고 숨 참기</button>
  </div>,language);
}
