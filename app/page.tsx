'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Headphones,Pause,Play,RotateCcw,SlidersHorizontal,Volume2,Expand,Flashlight} from '../lib/icons';
import type {Game,GameView,Settings} from '../lib/game';
import {registerGameTools} from '../lib/webmcp';
import {journal,endings,isMemory,type Action} from '../lib/story';
import {defaultSettings,bindingLabels,keyLabel,allowedKey,type Binding} from '../lib/preferences';
const initialSettings:Settings=defaultSettings;
export default function Home(){
  const canvas=useRef<HTMLCanvasElement>(null),root=useRef<HTMLElement>(null),game=useRef<Game|null>(null);
  const [view,setView]=useState<GameView|null>(null),[error,setError]=useState(''),[settings,setSettings]=useState(initialSettings),[showSettings,setShowSettings]=useState(false),[ready,setReady]=useState(false),[showNotes,setShowNotes]=useState(false),[binding,setBinding]=useState<Binding|null>(null),[bindingError,setBindingError]=useState('');
  useEffect(()=>{
    let dead=false;let instance:Game|null=null;let unregister=()=>{};
    import('../lib/game').then(async({createGame,prepareVisuals})=>{await prepareVisuals();if(dead||!canvas.current)return;try{instance=createGame(canvas.current,setView,setError);game.current=instance;setSettings(instance.getSettings());unregister=registerGameTools(instance);setReady(true);}catch(e){console.error(e);setError('화면을 열 수 없습니다. 하드웨어 가속을 지원하는 최신 브라우저에서 다시 열어주세요.');}}).catch(()=>setError('게임을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.'));
    return()=>{dead=true;unregister();instance?.dispose();game.current=null;};
  },[]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{const state=game.current?.snapshot();if(e.code==='KeyJ'&&state?.started&&state.story.stage!=='ended'){e.preventDefault();setShowNotes(true);game.current?.pause(true);}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
  const beginHold=(e:React.PointerEvent<HTMLButtonElement>)=>{if(view?.story.stage==='pry'){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.hold(true);}};
  const endHold=()=>game.current?.hold(false);
  function change<K extends keyof Settings>(key:K,value:Settings[K]){const next={...settings,[key]:value};setSettings(next);game.current?.configure(next);}
  const began=!!view?.started,ended=view?.story.stage==='ended',dying=view?.story.stage==='dying',memory=!!view&&isMemory(view.story.stage),hidden=!!view?.story.hidden,paused=!!view?.paused;
  const minutes=Math.floor((view?.elapsed||0)/60),seconds=Math.floor((view?.elapsed||0)%60);
  const settingsPanel=<div className="settings-panel">
    <details open><summary>소리</summary>{([['volume','전체 음량'],['music','배경 음악'],['effects','환경 · 효과음'],['voice','목소리 · 비명']] as const).map(([key,label])=><label key={key}><span>{label}<b>{Math.round(settings[key]*100)}%</b></span><input aria-label={label} type="range" min="0" max="1" step=".01" value={settings[key]} onChange={e=>change(key,Number(e.target.value))}/></label>)}</details>
    <details><summary>화면 · 자막</summary>
      <label><span>화면 밝기 <b>{Math.round(settings.brightness*100)}%</b></span><input aria-label="화면 밝기" type="range" min=".6" max="2.2" step=".05" value={settings.brightness} onChange={e=>change('brightness',Number(e.target.value))}/></label>
      <label><span>시야각 <b>{settings.fov}°</b></span><input aria-label="시야각" type="range" min="60" max="95" step="1" value={settings.fov} onChange={e=>change('fov',Number(e.target.value))}/></label>
      <label><span>자막 크기 <b>{Math.round(settings.subtitleScale*100)}%</b></span><input aria-label="자막 크기" type="range" min=".85" max="1.5" step=".05" value={settings.subtitleScale} onChange={e=>change('subtitleScale',Number(e.target.value))}/></label>
      {([['hints','목표 안내 표시'],['filmGrain','필름 질감'],['bob','걸을 때 카메라 흔들림'],['reducedMotion','화면 흔들림 · 점멸 줄이기']] as const).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={settings[key]} onChange={e=>change(key,e.target.checked)}/><span>{label}</span></label>)}
    </details>
    <details><summary>조작</summary>
      <label><span>시점 감도 <b>{settings.sensitivity.toFixed(1)}</b></span><input aria-label="시점 감도" type="range" min=".3" max="2" step=".1" value={settings.sensitivity} onChange={e=>change('sensitivity',Number(e.target.value))}/></label>
      <p className="muted">키를 누른 뒤 새 키를 입력하세요. ESC는 취소, J는 기록입니다.</p>
      <div className="binding-grid">{(Object.keys(bindingLabels) as Binding[]).map(key=><button key={key} className={binding===key?'listening':''} onClick={()=>{setBinding(key);setBindingError('');}} onBlur={()=>setBinding(null)} onKeyDown={e=>{
        if(binding!==key)return;e.preventDefault();e.stopPropagation();
        if(e.code==='Escape'){setBinding(null);return;}
        if(!allowedKey(e.code)||Object.entries(settings.bindings).some(([k,v])=>k!==key&&v===e.code)){setBindingError('이미 사용 중이거나 예약된 키입니다. 다른 키를 입력하세요.');return;}
        change('bindings',{...settings.bindings,[key]:e.code});setBinding(null);setBindingError('');
      }}><span>{bindingLabels[key]}</span><kbd>{binding===key?'입력…':keyLabel(settings.bindings[key])}</kbd></button>)}</div>
      {bindingError&&<p role="status" className="binding-error">{bindingError}</p>}
    </details>
    <p className="settings-local">설정과 구간 진행은 이 브라우저에 저장됩니다.</p>
  </div>;

  return <main className={`game-shell ${began?'is-playing':''} ${hidden?'is-hidden':''} ${!settings.filmGrain?'no-grain':''} ${settings.reducedMotion?'reduce-motion':''}`} style={{'--subtitle-scale':settings.subtitleScale} as CSSProperties} ref={root}>
    <canvas ref={canvas} className="world" aria-label="정전된 아파트를 탐색하는 1인칭 공포게임 화면"/>
    <div className="vignette"/><div className="film-grain"/><div className="lens-edge"/>
    {!began&&<section className="title-screen" aria-label="게임 시작 화면">
      <div className="topline"><span className="edition">白鷺ハイツ · 야간 기록</span><span className="address">2803호<span/>03:17</span></div>
      <div className="title-content"><p className="overline"><i/>돌아온 것은, 누구인가.</p><h1>귀가<span>帰宅 ─ シラサギハイツ</span></h1>
        <div className="story-intro"><p>비 오는 새벽 3시 17분.<br/>시라사기 하이츠, 28층 2803호.<br/>사흘 전, 나는 사람을 죽이고 달아났다.</p><p>집에 돌아와 잠들면 잊을 줄 알았다.<br/>그날 밤, 혼자 돌아온 게 아니었다.</p></div>
        {view?.canContinue&&<><button className="start-button continue-button" disabled={!ready} onClick={()=>game.current?.continueGame()}><span>이어서 귀가하기</span><Play size={19}/></button><p className="save-location">{view.savedLocation} · 이 기기에 남은 기록</p></>}
        <button className="start-button" disabled={!ready} onClick={()=>game.current?.start()}><span>{ready?(view?.canContinue?'처음부터 시작':'그날 밤으로'):'집 안을 불러오는 중'}</span><ArrowRight size={21}/></button>
        <div className="start-meta"><span><Headphones size={15}/>헤드폰 권장</span><span>일곱 장의 귀가 기록 · 혼자 플레이</span></div>
        <button className="settings-toggle" aria-expanded={showSettings} onClick={()=>setShowSettings(!showSettings)}><SlidersHorizontal size={15}/>밝기 · 소리 · 시점 설정</button>{showSettings&&settingsPanel}
      </div>
      <div className="title-caption"><span lang="ja">帰 宅 記 録</span><p>28층에서 시작된 밤.<br/>1층은 아직 멀다.</p></div>
      <div className="controls-strip"><span><kbd>{[settings.bindings.forward,settings.bindings.left,settings.bindings.back,settings.bindings.right].map(keyLabel).join(" ")}</kbd> 이동</span><span><kbd>마우스</kbd> 둘러보기</span><span><kbd>{keyLabel(settings.bindings.run)}</kbd> 달리기</span><span><kbd>{keyLabel(settings.bindings.interact)}</kbd> 확인 · 숨기</span><span><kbd>{keyLabel(settings.bindings.torch)}</kbd> 손전등</span><span><kbd>{keyLabel(settings.bindings.crouch)}</kbd> 몸 낮추기</span><span><kbd>ESC</kbd> 일시정지</span><small>화살표 키 / 화면 드래그로도 조작 가능</small></div>
      <div className="touch-intro">화면을 드래그해 둘러보고, 이동 버튼으로 걸으세요. 「달리기 ↑」를 누른 채 이동할 수 있습니다.</div>
    </section>}
    {began&&!ended&&!dying&&!memory&&<>
      <header className="hud"><div><div className="room-label"><i/>{view?.location}<span>{view?.floor}</span></div><p className={(view?.threat||0)>.2?'urgent':''}>{view?.objective}</p></div><div className="hud-tools"><span className="clock">{view?.clock}</span><button className="notes-trigger" aria-label="수집한 기록 보기" onClick={()=>{setShowNotes(true);game.current?.pause(true);}}>기록 {view?.story.notes.length||0}</button><button aria-label="전체 화면" title="전체 화면" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void root.current?.requestFullscreen().catch(()=>{});}}><Expand size={18}/></button><button aria-label="일시정지" title="일시정지" onClick={()=>game.current?.pause(true)}><Pause size={18}/></button></div></header>
      {!paused&&view?.chapterCard&&<div className="chapter-card"><span>제 {view.chapterNumber} 장 · {view.floor}</span><p>{view.chapter}</p></div>}
      <output className="save-notice" aria-live="polite">{view?.saveNotice}</output><div className={`crosshair ${view?.prompt?'active':''}`}/>{hidden&&<div className="closet-slats" aria-hidden="true"/>}{!!view?.threat&&<div className="threat-haze" style={{opacity:view.threat*.45}}/>}
      {!paused&&<>{view?.prompt&&<button className={`interaction ${view.story.stage==='pry'?'hold-interaction':''}`} onPointerDown={beginHold} onPointerUp={endHold} onPointerCancel={endHold} onLostPointerCapture={endHold} onClick={()=>{if(view.story.stage!=='pry')game.current?.interact();}}><kbd>{view.interactKey}</kbd><span>{view.prompt}</span>{view.story.stage==='pry'&&<progress className="hold-meter" aria-label="문 벌리기" max={1} value={view.holdProgress}/>}</button>}
        {view?.whisper&&<output className="ghost-whisper">{view.whisper}</output>}<output className="subtitle" aria-live="polite">{view?.message&&<p>{view.message}</p>}</output>
        <footer className="play-footer"><span><kbd>{[settings.bindings.forward,settings.bindings.left,settings.bindings.back,settings.bindings.right].map(keyLabel).join(" ")}</kbd> 이동 <kbd>{keyLabel(settings.bindings.run)}</kbd> 달리기 <kbd>{keyLabel(settings.bindings.interact)}</kbd> 확인 <kbd>{keyLabel(settings.bindings.torch)}</kbd> 손전등 <kbd>{keyLabel(settings.bindings.crouch)}</kbd> 몸 낮추기 <kbd>J</kbd> 기록</span><span><Flashlight size={14}/>{view?.flashlight?'켜짐':'꺼짐'}{view?.crouched?' · 몸을 낮춤':''}</span></footer>
        <div className="touch-controls"><div className="dpad"><button aria-label="앞으로 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyW",true);}} onPointerUp={()=>game.current?.key("KeyW",false)} onPointerCancel={()=>game.current?.key("KeyW",false)} onLostPointerCapture={()=>game.current?.key("KeyW",false)}>↑</button><div><button aria-label="왼쪽 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyA",true);}} onPointerUp={()=>game.current?.key("KeyA",false)} onPointerCancel={()=>game.current?.key("KeyA",false)} onLostPointerCapture={()=>game.current?.key("KeyA",false)}>←</button><button aria-label="뒤로 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyS",true);}} onPointerUp={()=>game.current?.key("KeyS",false)} onPointerCancel={()=>game.current?.key("KeyS",false)} onLostPointerCapture={()=>game.current?.key("KeyS",false)}>↓</button><button aria-label="오른쪽 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyD",true);}} onPointerUp={()=>game.current?.key("KeyD",false)} onPointerCancel={()=>game.current?.key("KeyD",false)} onLostPointerCapture={()=>game.current?.key("KeyD",false)}>→</button></div><button className="touch-run" aria-label="앞으로 달리기" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyW",true);game.current?.key("ShiftLeft",true);}} onPointerUp={()=>{game.current?.key("KeyW",false);game.current?.key("ShiftLeft",false);}} onPointerCancel={()=>{game.current?.key("KeyW",false);game.current?.key("ShiftLeft",false);}} onLostPointerCapture={()=>{game.current?.key("KeyW",false);game.current?.key("ShiftLeft",false);}}>달리기 ↑</button></div><div className="touch-actions"><button aria-label="몸 낮추기" aria-pressed={view?.crouched} onClick={()=>game.current?.crouch()}>{view?.crouched?'일어서기':'몸 낮추기'}</button><button aria-label="손전등 전환" onClick={()=>game.current?.torch()}><Flashlight size={19}/></button><button onPointerDown={beginHold} onPointerUp={endHold} onPointerCancel={endHold} onLostPointerCapture={endHold} onClick={()=>{if(view?.story.stage!=='pry')game.current?.interact();}}>{view?.story.stage==='pry'?'길게 누르기':'확인'}</button></div></div>
      </>}
    </>}
    {began&&memory&&<section className="memory-screen" aria-label="사흘 전의 기억">
      <div className="memory-black" style={{opacity:view?.memoryFade||0}}/>
      <div className="memory-top"><span>{view?.memoryLabel}</span><div><button disabled={paused} onClick={()=>game.current?.skipMemory()}>기억 건너뛰기</button><button aria-label="일시정지" onClick={()=>game.current?.pause(true)}><Pause size={18}/></button></div></div>
      <output className="memory-caption" aria-live="polite">{view?.memoryText}</output>
    </section>}
    {began&&view?.story.stage==='tv'&&<div className="time-jump" aria-hidden="true" style={{opacity:view.memoryFade}}><p>사흘 뒤<span>28층 2803호 · 03:17</span></p></div>}
    {began&&paused&&!ended&&<section className="modal-backdrop" aria-label="일시정지 메뉴"><div className="pause-card"><p className="overline">일시정지</p><h2>일시정지</h2><p className="muted">건물 안의 시간도 멈춰 있습니다.</p><div className="pause-tabs"><button aria-pressed={!showNotes} onClick={()=>setShowNotes(false)}>설정</button><button aria-pressed={showNotes} onClick={()=>setShowNotes(true)}>수집한 기록 · {view?.story.notes.length||0}</button></div>{showNotes?<div className="journal">{view?.story.notes.length?view.story.notes.map(id=>{const note=journal[id as Action];return note?<article key={id}><h3>{note.title}</h3><p>{note.text}</p></article>:null;}):<p className="muted">아직 발견한 기록이 없습니다. 집 안에서 단서를 찾아보세요.</p>}</div>:settingsPanel}<button className="start-button" onClick={()=>game.current?.pause(false)}><span>계속하기</span><Play size={18}/></button><button className="quiet-button" onClick={()=>game.current?.start()}><RotateCcw size={15}/>처음부터 다시</button></div></section>}
    {dying&&<div className="death-vignette" aria-hidden="true"><div style={{opacity:Math.max(0,((view?.deathProgress||0)-.65)/.35)}}/></div>}
    {dying&&(view?.deathProgress||0)>.4&&!paused&&<button className="skip-death" onClick={()=>game.current?.skipDeath()}>재시도 화면으로</button>}
    {ended&&<section className="ending-screen"><div><p className="overline">귀가 기록 / {view?.story.ending==='escaped'?'종료':'미완'}</p><h2>{view?.story.ending==='escaped'?'03:18, 그 자리에 남았다.':'발소리가 멎었다.'}</h2><p className="ending-copy">{view?.story.ending==='escaped'?endings.escaped:endings.caught}</p><p className="end-time">{minutes}분 {seconds}초의 기록</p><button className="start-button" onClick={()=>game.current?.start(view?.story.ending==='caught')}><span>{view?.story.ending==='caught'?view.checkpointLabel:'다시 귀가하기'}</span><RotateCcw size={18}/></button><p className="ending-note">{view?.story.ending==='caught'?'발소리와 시선을 살피세요. 해당 구간부터 다시 시작하며, 읽은 기록은 남습니다.':'〈귀가〉를 플레이해 주셔서 감사합니다.'}</p></div></section>}
    {error&&<div className="error-note" role="alert"><Volume2 size={18}/><p>{error}</p><button aria-label="알림 닫기" onClick={()=>setError('')}>×</button></div>}
  </main>;
}
