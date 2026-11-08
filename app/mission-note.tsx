'use client';
import {useContext,useEffect,useRef} from 'react';
import {LanguageContext,localizeTree} from './localization';
import {MissionCopy} from './game-hud';
import {Notebook} from '../lib/icons';

type Props={mission:string;location:string;clock:string;onClose:()=>void;onNotebook:()=>void};
export function MissionNote({mission,location,clock,onClose,onNotebook}:Props){
 const language=useContext(LanguageContext),dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const panel=dialog.current;if(!panel)return;const previous=panel.ownerDocument.activeElement as HTMLElement|null;panel.showModal();close.current?.focus();return()=>{if(panel.open)panel.close();const target=previous?.isConnected&&previous!==panel.ownerDocument.body?previous:panel.ownerDocument.querySelector<HTMLElement>('.mission-trigger');target?.focus();};},[]);
 function keydown(event:React.KeyboardEvent<HTMLDialogElement>){
  // While reading, no key is allowed to reach the game's movement/pause handler.
  event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();onClose();return;}
  if(event.key!=='Tab')return;
  const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')),first=buttons[0],last=buttons.at(-1),active=event.currentTarget.ownerDocument.activeElement;
  if(event.shiftKey&&active===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&active===last){event.preventDefault();first?.focus();}
 }
 return localizeTree(<dialog ref={dialog} className="mission-note" lang={language} aria-labelledby="mission-note-title" onKeyDown={keydown} onCancel={event=>{event.preventDefault();onClose();}}>
  <article className="mission-paper">
   <div className="mission-paper-fold" aria-hidden="true"/>
   <button ref={close} type="button" className="mission-note-close" aria-label="미션 메모 닫기" title="미션 메모 닫기" onClick={onClose}>×</button>
   <header><span className="mission-note-place">{location} <i aria-hidden="true">/</i> {clock}</span><h2 id="mission-note-title">미션 메모</h2><span className="mission-note-rule" aria-hidden="true"/></header>
   <div className="mission-note-writing">{mission?<MissionCopy text={mission}/>:<p>아직 적힌 미션이 없다.</p>}</div>
   <footer><button type="button" className="mission-note-records" onClick={onNotebook}><Notebook size={18}/><span>조사 수첩</span></button><button type="button" className="mission-note-fold" onClick={onClose}>접어 두기 <span aria-hidden="true">↘</span></button></footer>
   <p className="mission-note-paused">메모를 읽는 동안 시간은 멈춥니다.</p>
  </article>
 </dialog>,language);
}
