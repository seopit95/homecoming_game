'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Headphones,Pause,Play,RotateCcw,SlidersHorizontal,Volume2,Expand,Flashlight} from '../lib/icons';
import type {Game,GameView,Settings} from '../lib/game';
import {registerGameTools} from '../lib/webmcp';
const initialSettings:Settings={volume:.42,brightness:1.1,sensitivity:1,bob:false};
export default function Home(){
  const canvas=useRef<HTMLCanvasElement>(null),root=useRef<HTMLElement>(null),game=useRef<Game|null>(null);
  const [view,setView]=useState<GameView|null>(null),[error,setError]=useState(''),[settings,setSettings]=useState(initialSettings),[showSettings,setShowSettings]=useState(false),[ready,setReady]=useState(false);
  useEffect(()=>{
    let dead=false;let instance:Game|null=null;let unregister=()=>{};
    import('../lib/game').then(({createGame})=>{if(dead||!canvas.current)return;try{instance=createGame(canvas.current,setView,setError);game.current=instance;unregister=registerGameTools(instance);setReady(true);}catch(e){console.error(e);setError('화면을 열 수 없습니다. 하드웨어 가속을 지원하는 최신 브라우저에서 다시 열어주세요.');}}).catch(()=>setError('게임을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.'));
    return()=>{dead=true;unregister();instance?.dispose();game.current=null;};
  },[]);
  function change<K extends keyof Settings>(key:K,value:Settings[K]){const next={...settings,[key]:value};setSettings(next);game.current?.configure(next);}
  const began=!!view?.started,ended=view?.story.stage==='ended',hidden=!!view?.story.hidden,paused=!!view?.paused;
  const minutes=Math.floor((view?.elapsed||0)/60),seconds=Math.floor((view?.elapsed||0)%60);
  const settingsPanel=<div className="settings-panel">
    <label><span>소리 크기 <b>{Math.round(settings.volume*100)}%</b></span><input aria-label="소리 크기" type="range" min="0" max="1" step=".01" value={settings.volume} onChange={e=>change('volume',Number(e.target.value))}/></label>
    <label><span>화면 밝기 <b>{Math.round(settings.brightness*100)}%</b></span><input aria-label="화면 밝기" type="range" min=".6" max="2.2" step=".05" value={settings.brightness} onChange={e=>change('brightness',Number(e.target.value))}/></label>
    <label><span>시점 감도 <b>{settings.sensitivity.toFixed(1)}</b></span><input aria-label="시점 감도" type="range" min=".3" max="2" step=".1" value={settings.sensitivity} onChange={e=>change('sensitivity',Number(e.target.value))}/></label>
    <label className="check"><input type="checkbox" checked={settings.bob} onChange={e=>change('bob',e.target.checked)}/><span>걸을 때 카메라 흔들림</span></label>
  </div>;

  return <main className={`game-shell ${began?'is-playing':''} ${hidden?'is-hidden':''}`} ref={root}>
    <canvas ref={canvas} className="world" aria-label="정전된 아파트를 탐색하는 1인칭 공포게임 화면"/>
    <div className="vignette"/><div className="film-grain"/>
    {!began&&<section className="title-screen" aria-label="게임 시작 화면">
      <div className="topline"><span className="edition">단편 심리 공포</span><span className="address">403호<span/>03:17</span></div>
      <div className="title-content"><p className="overline"><i/>누군가, 먼저 와 있다.</p><h1>귀가<span>歸家</span></h1>
        <div className="story-intro"><p>새벽 3시 17분.<br/>집에 돌아오자, 전기가 나갔다.</p><p>분명 문은 잠갔다.<br/>그런데 현관에 낯선 신발이 있다.</p></div>
        <button className="start-button" disabled={!ready} onClick={()=>game.current?.start()}><span>{ready?'집으로 들어가기':'집 안을 불러오는 중'}</span><ArrowRight size={21}/></button>
        <div className="start-meta"><span><Headphones size={15}/>헤드폰 권장</span><span>약 5분 · 혼자 플레이</span></div>
        <button className="settings-toggle" aria-expanded={showSettings} onClick={()=>setShowSettings(!showSettings)}><SlidersHorizontal size={15}/>밝기 · 소리 · 시점 설정</button>{showSettings&&settingsPanel}
      </div>
      <div className="title-caption"><span>귀가 기록 / 01</span><p>오늘 밤,<br/>집은 조금 낯설다.</p></div>
      <div className="controls-strip"><span><kbd>W A S D</kbd> 이동</span><span><kbd>마우스</kbd> 둘러보기</span><span><kbd>E</kbd> 확인 · 숨기</span><span><kbd>F</kbd> 손전등</span><span><kbd>ESC</kbd> 일시정지</span><small>화살표 키 / 화면 드래그로도 조작 가능</small></div>
      <div className="touch-intro">화면을 드래그해 둘러보고, 화면의 이동 버튼으로 걸으세요.</div>
    </section>}
    {began&&!ended&&<>
      <header className="hud"><div><div className="room-label"><i/>{view?.location}<span>403호</span></div><p className={view?.story.stage==='hide'?'urgent':''}>{view?.objective}</p></div><div className="hud-tools"><span className="clock">03:{view?.story.stage==='escape'?'23':'17'}</span><button aria-label="전체 화면" title="전체 화면" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void root.current?.requestFullscreen().catch(()=>{});}}><Expand size={18}/></button><button aria-label="일시정지" title="일시정지" onClick={()=>game.current?.pause(true)}><Pause size={18}/></button></div></header>
      <div className={`crosshair ${view?.prompt?'active':''}`}/>{hidden&&<div className="closet-slats" aria-hidden="true"/>}{!!view?.threat&&<div className="threat-haze" style={{opacity:view.threat*.45}}/>}
      {!paused&&<>{view?.prompt&&<button className="interaction" onClick={()=>game.current?.interact()}><kbd>E</kbd><span>{view.prompt}</span></button>}
        <output className="subtitle" aria-live="polite">{view?.message&&<p>{view.message}</p>}</output>
        <footer className="play-footer"><span><kbd>WASD</kbd> 이동 <kbd>E</kbd> 확인 <kbd>F</kbd> 손전등 <kbd>ESC</kbd> 멈추기</span><span><Flashlight size={14}/>{view?.flashlight?'켜짐':'꺼짐'}</span></footer>
        <div className="touch-controls"><div className="dpad"><button aria-label="앞으로 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyW",true);}} onPointerUp={()=>game.current?.key("KeyW",false)} onPointerCancel={()=>game.current?.key("KeyW",false)} onLostPointerCapture={()=>game.current?.key("KeyW",false)}>↑</button><div><button aria-label="왼쪽 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyA",true);}} onPointerUp={()=>game.current?.key("KeyA",false)} onPointerCancel={()=>game.current?.key("KeyA",false)} onLostPointerCapture={()=>game.current?.key("KeyA",false)}>←</button><button aria-label="뒤로 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyS",true);}} onPointerUp={()=>game.current?.key("KeyS",false)} onPointerCancel={()=>game.current?.key("KeyS",false)} onLostPointerCapture={()=>game.current?.key("KeyS",false)}>↓</button><button aria-label="오른쪽 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyD",true);}} onPointerUp={()=>game.current?.key("KeyD",false)} onPointerCancel={()=>game.current?.key("KeyD",false)} onLostPointerCapture={()=>game.current?.key("KeyD",false)}>→</button></div></div><div className="touch-actions"><button aria-label="손전등 전환" onClick={()=>game.current?.torch()}><Flashlight size={19}/></button><button onClick={()=>game.current?.interact()}>확인</button></div></div>
      </>}
    </>}
    {began&&paused&&!ended&&<section className="modal-backdrop" aria-label="일시정지 메뉴"><div className="pause-card"><p className="overline">일시정지</p><h2>잠시, 숨을 고르세요.</h2><p className="muted">집 안의 시간도 멈춰 있습니다.</p>{settingsPanel}<button className="start-button" onClick={()=>game.current?.pause(false)}><span>계속하기</span><Play size={18}/></button><button className="quiet-button" onClick={()=>game.current?.start()}><RotateCcw size={15}/>처음부터 다시</button></div></section>}
    {ended&&<section className="ending-screen"><div><p className="overline">귀가 기록 / {view?.story.ending==='escaped'?'종료':'미완'}</p><h2>{view?.story.ending==='escaped'?'밖으로 나왔다.':'문은 잠겨 있었다.'}</h2><p className="ending-copy">{view?.story.ending==='escaped'?'문이 닫히는 순간, 안에서 잠금장치가 돌아갔다.\n\n나는 열쇠를 손에 쥐고 있었다.':'발소리가 멎었다.\n그것은 내 바로 뒤에 있었다.'}</p><p className="end-time">{minutes}분 {seconds}초의 기록</p><button className="start-button" onClick={()=>game.current?.start(view?.story.ending==='caught')}><span>{view?.story.ending==='caught'?'라디오 장면부터 다시':'다시 귀가하기'}</span><RotateCcw size={18}/></button><p className="ending-note">{view?.story.ending==='caught'?'침실 옷장에 숨고, 발소리가 완전히 멎을 때까지 기다리세요.':'〈귀가〉를 플레이해 주셔서 감사합니다.'}</p></div></section>}
    {error&&<div className="error-note" role="alert"><Volume2 size={18}/><p>{error}</p><button aria-label="알림 닫기" onClick={()=>setError('')}>×</button></div>}
  </main>;
}
