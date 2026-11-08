'use client';
import {useContext} from 'react';
import {LanguageContext,localizeTree} from './localization';

import {useEffect,useRef,type ReactNode} from 'react';
import {Play,RotateCcw} from '../lib/icons';

type Props={location:string;floor:string;clock:string;onMission?:()=>void;onFullscreen:()=>void;showNotes:boolean;onContinue:()=>void;onRestart:()=>void;onSettings:()=>void;onNotes:()=>void;settingsPanel:ReactNode;controlsHelp:ReactNode;notebook:ReactNode};
export function PauseMenu({location,floor,clock,onMission,onFullscreen,showNotes,onContinue,onRestart,onSettings,onNotes,settingsPanel,controlsHelp,notebook}:Props){
 const language=useContext(LanguageContext);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const panel=dialog.current;if(!panel)return;const previous=panel.ownerDocument.activeElement as HTMLElement|null;if(!panel.open)panel.showModal();return()=>{if(panel.open)panel.close();if(previous?.isConnected)previous.focus();};},[]);
 function keepFocus(event:React.KeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;
  const panel=event.currentTarget,items=Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex="0"]')).filter(item=>item.getClientRects().length>0),first=items[0],last=items.at(-1),active=panel.ownerDocument.activeElement;
  if(!first||!last)return;
  if(event.shiftKey&&active===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
 }
 return localizeTree(<dialog ref={dialog} className={`system-menu${showNotes?' has-notebook':''}`} aria-modal="true" aria-labelledby="pause-title" onKeyDown={keepFocus} onCancel={event=>{event.preventDefault();onContinue();}}>
  <div className="pause-layout">
   <header className="pause-sidebar">
    <p className="overline">귀가 <span lang="zh-Hant">歸家</span></p><h2 id="pause-title">{showNotes?'조사 수첩':'일시정지'}</h2>
    <p className="pause-location"><span>{location}</span><span>{floor}</span><time>{clock}</time></p>
    <button type="button" className="pause-resume" onClick={onContinue}><span>계속하기</span><Play size={16}/></button>
    <nav className="pause-nav" aria-label="일시정지 탐색">{onMission&&<button type="button" onClick={onMission}>미션 메모</button>}<button type="button" aria-pressed={!showNotes} onClick={onSettings}>환경 설정</button><button type="button" aria-pressed={showNotes} onClick={onNotes}>조사 수첩</button></nav>
    <button type="button" className="pause-restart" onClick={onRestart}><RotateCcw size={14}/><span>처음부터 다시</span></button>
    <p className="pause-key"><kbd>ESC</kbd> 계속하기</p>
   </header>
   <section className={`pause-detail${showNotes?' has-notebook':''}`} aria-label={showNotes?'수집한 기록':'환경 설정'}>
    {showNotes?notebook:<><div className="pause-detail-heading"><h3 className="pause-detail-title">환경 설정</h3><button type="button" onClick={onFullscreen}>전체 화면</button></div>{settingsPanel}<details className="controls-disclosure"><summary>조작 안내</summary>{controlsHelp}</details></>}
   </section>
  </div>
 </dialog>,language);
}
