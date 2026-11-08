'use client';
import {translate} from '../lib/i18n';
import {useContext} from 'react';
import {LanguageContext,localizeTree} from './localization';

import type {GameView} from '../lib/game';

type Props={view:Pick<GameView,'location'|'floor'|'clock'|'objective'|'mission'|'threat'|'elapsed'|'paused'>;obscured?:boolean};
export function GameHud({view}:Props){
 const language=useContext(LanguageContext);
 return localizeTree(<header className="hud"><div className="hud-position"><div className="room-label">{view.location}<span>{view.floor}</span></div><time className="clock">{view.clock}</time></div></header>,language);
}
export function MissionCopy({text}:{text:string}){
 const language=useContext(LanguageContext);
 const [action,...echo]=translate(text,language).split('\n');
 return localizeTree(<p><strong>{action}</strong>{echo.length>0&&<span className="objective-echo">{echo.join('\n')}</span>}</p>,language);
}
export function StaminaMeter({value,exhausted}:{value:number;exhausted:boolean}){
 const language=useContext(LanguageContext);
 const amount=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
 if(amount>=1&&!exhausted)return null;
 return localizeTree(<div className={`stamina${exhausted?' exhausted':''}`}><span>{exhausted?'숨 고르기':'달리기 가능'}</span><progress aria-label="달리기 체력" aria-valuetext={`${Math.round(amount*100)}%${exhausted?' · 걸으며 회복 중':' · 달리기 가능'}`} max={1} value={amount}/></div>,language);
}
