import type {ReactNode} from 'react';
import {ArrowRight,Headphones,SlidersHorizontal} from '../lib/icons';

type Props={
  ready:boolean; phase:string; error:string; canContinue:boolean; savedLocation?:string;
  showSettings:boolean; settingsPanel:ReactNode;
  onStart:()=>void; onContinue:()=>void; onSettings:()=>void; onRetry:()=>void;
};

// Server-rendered with the page: the title does not wait for Three.js or textures.
export function TitleScreen({ready,phase,error,canContinue,savedLocation,showSettings,settingsPanel,onStart,onContinue,onSettings,onRetry}:Props){
  return <section className={`entrance-screen${showSettings?' has-settings':''}`} aria-label="귀가 시작 화면">
    <div className="entrance-scenery" aria-hidden="true"/>
    <header className="entrance-header"><span>백로아파트</span><span>28층 <i/> 2803호</span></header>
    <div className="entrance-content">
      <p className="entrance-kicker">한밤의 귀가 기록</p>
      <h1 className="entrance-title">귀가<span>03 : 17</span></h1>
      <p className="entrance-tagline">분명, 혼자 돌아왔는데.</p>
      <div className="entrance-actions">
        {error?<div className="entrance-failure"><p role="alert">{error}</p><button type="button" className="entrance-option" onClick={onRetry}><span>다시 불러오기</span><ArrowRight size={18}/></button></div>
          :!ready?<div className="entrance-loading" role="status" aria-live="polite"><div className="entrance-loading-line" aria-hidden="true"><i/></div><p>{phase}<span aria-hidden="true"> …</span></p></div>
          :showSettings?<div className="entrance-settings"><button type="button" className="entrance-back" onClick={onSettings}>← 시작 화면으로</button><h2>환경 설정</h2>{settingsPanel}</div>
          :<nav className="entrance-menu" aria-label="게임 시작 메뉴">
            {canContinue&&<div><button type="button" className="entrance-option primary" onClick={onContinue}><span>이어하기</span><ArrowRight size={18}/></button><p className="entrance-save">{savedLocation} · 저장된 기록</p></div>}
            <button type="button" className={`entrance-option${canContinue?'':' primary'}`} onClick={onStart}><span>새 게임</span><ArrowRight size={18}/></button>
            <button type="button" className="entrance-option entrance-config" aria-expanded={false} onClick={onSettings}><span>환경 설정</span><SlidersHorizontal size={16}/></button>
          </nav>}
      </div>
    </div>
    <footer className="entrance-footer"><span><Headphones size={15}/>헤드폰 권장</span><span>1인칭 공포 · 혼자 플레이</span></footer>
  </section>;
}
