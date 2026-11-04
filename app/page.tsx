'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Volume2,Smartphone} from '../lib/icons';
import type {Game,GameView,Settings} from '../lib/game';
import {registerGameTools} from '../lib/webmcp';
import {isMemory,isCinematic,areaFor} from '../lib/story';
import {InvestigationNotebook} from './investigation-notebook';
import {TitleScreen} from './title-screen';
import {EndingScreen} from './ending-screen';
import {GameHud,StaminaMeter} from './game-hud';
import {PauseMenu} from './pause-menu';
import {defaultSettings,bindingLabels,keyLabel,allowedKey,type Binding} from '../lib/preferences';
const initialSettings:Settings=defaultSettings;
export default function Home(){
  const canvas=useRef<HTMLCanvasElement>(null),root=useRef<HTMLElement>(null),game=useRef<Game|null>(null);
  const [view,setView]=useState<GameView|null>(null),[error,setError]=useState(''),[settings,setSettings]=useState(initialSettings),[showSettings,setShowSettings]=useState(false),[ready,setReady]=useState(false),[showNotes,setShowNotes]=useState(false),[binding,setBinding]=useState<Binding|null>(null),[bindingError,setBindingError]=useState('');
  const [bootPhase,setBootPhase]=useState('게임 자료를 불러오는 중');
  useEffect(()=>{
    let dead=false;let instance:Game|null=null;let unregister=()=>{};
    import('../lib/game').then(async({createGame,prepareVisuals})=>{if(dead)return;setBootPhase('공간의 질감을 준비하는 중');await prepareVisuals('initial');if(dead||!canvas.current)return;setBootPhase('공간과 조명을 준비하는 중');try{instance=createGame(canvas.current,setView,setError);game.current=instance;setSettings(instance.getSettings());unregister=registerGameTools(instance);await instance.ready;if(!dead)setReady(true);}catch(e){console.error(e);if(!dead)setError('화면을 열 수 없습니다. 하드웨어 가속을 지원하는 최신 브라우저에서 다시 열어주세요.');}}).catch(()=>{if(!dead)setError('게임을 불러오지 못했습니다. 연결을 확인하고 다시 불러와 주세요.');});
    return()=>{dead=true;unregister();instance?.dispose();game.current=null;};
  },[]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{const state=game.current?.snapshot();if(e.code==='KeyJ'&&!e.repeat&&state?.started&&state.story.stage!=='ended'){e.preventDefault();if(state.paused&&showNotes){setShowNotes(false);game.current?.pause(false);}else{setShowNotes(true);game.current?.pause(true);}}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[showNotes]);
  const beginHold=(e:React.PointerEvent<HTMLButtonElement>)=>{if(view?.holdAction){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.hold(true);}};
  const endHold=()=>game.current?.hold(false);
  function change<K extends keyof Settings>(key:K,value:Settings[K]){const next={...settings,[key]:value};setSettings(next);game.current?.configure(next);}
  const began=!!view?.started,ended=view?.story.stage==='ended',dying=view?.story.stage==='dying',memory=!!view&&isCinematic(view.story.stage),hidden=!!view?.story.hidden,paused=!!view?.paused;
  const currentObjective=view?.mission||'';
  const fullscreen=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void root.current?.requestFullscreen().catch(()=>{});};
  const controlsHelp=<section className="pause-controls" role="group" aria-label="조작 안내">
    <dl>{[
      ['이동',[settings.bindings.forward,settings.bindings.left,settings.bindings.back,settings.bindings.right].map(keyLabel).join(' ')],
      ['달리기',keyLabel(settings.bindings.run)],['확인 · 숨기',keyLabel(settings.bindings.interact)],
      ['스마트폰 플래시',keyLabel(settings.bindings.torch)],['몸 낮추기',keyLabel(settings.bindings.crouch)],['조사 수첩','J'],['일시정지','ESC'],
    ].map(([label,keys])=><div key={label}><dt>{label}</dt><dd><kbd>{keys}</kbd></dd></div>)}</dl>
    <p>마우스 또는 화면 드래그로 둘러봅니다. 터치 화면에서는 이동 버튼과 「달리기 ↑」를 사용하세요.</p>
  </section>;
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
      <div className="binding-grid">{(Object.keys(bindingLabels) as Binding[]).filter(key=>key!=='breath').map(key=><button key={key} className={binding===key?'listening':''} onClick={()=>{setBinding(key);setBindingError('');}} onBlur={()=>setBinding(null)} onKeyDown={e=>{
        if(binding!==key)return;e.preventDefault();e.stopPropagation();
        if(e.code==='Escape'){setBinding(null);return;}
        if(!allowedKey(e.code)||Object.entries(settings.bindings).some(([k,v])=>k!==key&&v===e.code)){setBindingError('이미 사용 중이거나 예약된 키입니다. 다른 키를 입력하세요.');return;}
        change('bindings',{...settings.bindings,[key]:e.code});setBinding(null);setBindingError('');
      }}><span>{bindingLabels[key]}</span><kbd>{binding===key?'입력…':keyLabel(settings.bindings[key])}</kbd></button>)}</div>
      {bindingError&&<output className="binding-error">{bindingError}</output>}
    </details>
    <p className="settings-local">설정과 구간 진행은 이 브라우저에 저장됩니다.</p>
  </div>;

  return <main className={`game-shell ${began?'is-playing':''} ${hidden?'is-hidden':''} ${!settings.filmGrain?'no-grain':''} ${settings.reducedMotion?'reduce-motion':''}`} style={{'--subtitle-scale':settings.subtitleScale} as CSSProperties} ref={root}>
    <canvas ref={canvas} className="world" style={{filter:view?.breathBlur?`blur(${view.breathBlur.toFixed(2)}px)`:undefined,transition:paused?'none':'filter .12s linear'}} aria-label="정전된 아파트를 탐색하는 1인칭 공포게임 화면"/>
    {view?.loading&&<section className="space-loading" aria-label="다음 공간 준비" aria-busy={!view.loadingError}><div><p role={view.loadingError?'alert':'status'}>{view.loadingError||'문 너머의 공간을 준비하고 있습니다…'}</p><span>준비하는 동안 시간과 추격이 멈춥니다.</span>{view.loadingError&&<button autoFocus onClick={()=>game.current?.retryLoading()}>다시 시도</button>}</div></section>}
    <div className="vignette"/><div className="film-grain"/><div className="lens-edge"/>
    {!began&&<TitleScreen ready={ready} phase={bootPhase} error={!ready?error:''} canContinue={!!view?.canContinue} savedLocation={view?.savedLocation} showSettings={showSettings} settingsPanel={settingsPanel} onStart={()=>game.current?.start()} onContinue={()=>game.current?.continueGame()} onSettings={()=>setShowSettings(!showSettings)} onRetry={()=>window.location.reload()}/>}
    {began&&!ended&&!dying&&!memory&&<>
      <GameHud view={view!} obscured={!!view&&(view.story.stage==='tv'||view.story.stage==='wake_ring'||view.memoryFade>0)}/>
      {!paused&&view?.chapterCard&&<div className="chapter-card"><span>제 {view.chapterNumber} 장 · {view.floor}</span><p>{view.chapter}</p></div>}
      <output className="save-notice" aria-live="polite">{view?.saveNotice}</output><div className={`crosshair ${view?.prompt?'active':''}`}/>{hidden&&view&&areaFor(view.story)==='apartment'&&<div className="closet-slats" aria-hidden="true"/>}{!!view?.threat&&<div className="threat-haze" style={{opacity:view.threat*.45}}/>}
      {!paused&&<>{view?.whisper&&<output className="ghost-whisper">{view.whisper}</output>}<div className="play-bottom">{view?.prompt&&<button data-game-interaction className={`interaction ${view.holdAction?'hold-interaction':''}`} onPointerDown={beginHold} onPointerUp={endHold} onPointerCancel={endHold} onLostPointerCapture={endHold} onClick={()=>{if(!view.holdAction)game.current?.interact();}}><kbd>{view.interactKey}</kbd><span>{view.prompt}</span>{view.holdAction&&<progress className="hold-meter" aria-label={view.holdAction==='car_board'?'운전석 탑승':'문 벌리기'} max={1} value={view.holdProgress}/>}</button>}
        <output className="subtitle" aria-live="polite">{view?.message&&<p>{view.message}</p>}</output>
        {view&&<StaminaMeter value={view.stamina} exhausted={view.exhausted}/>}</div><footer className="play-footer"><span><kbd>J</kbd> 수첩</span><span><Smartphone size={14}/>{!view?.hasFlashlight?'스마트폰 없음':view?.flashlight?'켜짐':'꺼짐'}{view?.crouched?' · 몸을 낮춤':''}</span></footer>
        <div className="touch-controls"><div className="dpad"><button aria-label="앞으로 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyW",true);}} onPointerUp={()=>game.current?.key("KeyW",false)} onPointerCancel={()=>game.current?.key("KeyW",false)} onLostPointerCapture={()=>game.current?.key("KeyW",false)}>↑</button><div><button aria-label="왼쪽 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyA",true);}} onPointerUp={()=>game.current?.key("KeyA",false)} onPointerCancel={()=>game.current?.key("KeyA",false)} onLostPointerCapture={()=>game.current?.key("KeyA",false)}>←</button><button aria-label="뒤로 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyS",true);}} onPointerUp={()=>game.current?.key("KeyS",false)} onPointerCancel={()=>game.current?.key("KeyS",false)} onLostPointerCapture={()=>game.current?.key("KeyS",false)}>↓</button><button aria-label="오른쪽 이동" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyD",true);}} onPointerUp={()=>game.current?.key("KeyD",false)} onPointerCancel={()=>game.current?.key("KeyD",false)} onLostPointerCapture={()=>game.current?.key("KeyD",false)}>→</button></div><button className="touch-run" aria-label="앞으로 달리기" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);game.current?.key("KeyW",true);game.current?.key("ShiftLeft",true);}} onPointerUp={()=>{game.current?.key("KeyW",false);game.current?.key("ShiftLeft",false);}} onPointerCancel={()=>{game.current?.key("KeyW",false);game.current?.key("ShiftLeft",false);}} onLostPointerCapture={()=>{game.current?.key("KeyW",false);game.current?.key("ShiftLeft",false);}}>달리기 ↑</button></div><div className="touch-actions"><button aria-label="몸 낮추기" aria-pressed={view?.crouched} onClick={()=>game.current?.crouch()}>{view?.crouched?'일어서기':'몸 낮추기'}</button><button aria-label="스마트폰 플래시 전환" onClick={()=>game.current?.torch()}><Smartphone size={19}/></button><button data-game-interaction onPointerDown={beginHold} onPointerUp={endHold} onPointerCancel={endHold} onLostPointerCapture={endHold} onClick={()=>{if(!view?.holdAction)game.current?.interact();}}>{view?.holdAction==='car_board'?'길게 눌러 탑승':view?.holdAction?'길게 누르기':'확인'}</button></div></div>
      </>}
    </>}
    {began&&memory&&<section className="memory-screen" aria-label={view&&isMemory(view.story.stage)?"사흘 전의 기억":"마지막 귀가"}>
      <div className="memory-black" style={{opacity:view?.memoryFade||0}}/>
      <div className="memory-top"><span>{view?.memoryLabel}</span><div>{view&&isMemory(view.story.stage)&&<button disabled={paused} onClick={()=>game.current?.skipMemory()}>기억 건너뛰기</button>}</div></div>
      <output className="memory-caption" aria-live="polite"><span key={`${view?.story.stage}:${view?.memoryText}`}>{view?.memoryText}</span></output>
    </section>}
    {began&&view&&(view.story.stage==='stairs_ground'||areaFor(view.story)==='annex'&&view.memoryFade>0)&&<div className="time-jump" style={{opacity:view.memoryFade}}><p>{view.memoryLabel}<span>{view.memoryText}</span></p></div>}
    {began&&view?.story.stage==='wake_ring'&&<div className="time-jump" aria-hidden="true" style={{opacity:view.memoryFade}}><p>사흘 뒤<span>28층 2803호 · 03:17</span></p></div>}
    {began&&!ended&&!dying&&<button className="menu-trigger" aria-label="일시정지 메뉴 열기" onClick={()=>game.current?.pause(true)}>메뉴 <kbd>ESC</kbd></button>}
    {began&&paused&&!ended&&view&&<PauseMenu location={view.location} floor={view.floor} clock={view.clock} objective={currentObjective} onFullscreen={fullscreen} showNotes={showNotes} onContinue={()=>game.current?.pause(false)} onRestart={()=>game.current?.start()} onSettings={()=>setShowNotes(false)} onNotes={()=>setShowNotes(true)} settingsPanel={settingsPanel} controlsHelp={controlsHelp} notebook={<InvestigationNotebook story={view.story} onClose={()=>game.current?.pause(false)}/>}/>}
    {dying&&<div className="death-vignette" aria-hidden="true"><div style={{opacity:Math.max(0,((view?.deathProgress||0)-.42)/.18)}}/></div>}
    {dying&&(view?.deathProgress||0)>.4&&!paused&&<button className="skip-death" onClick={()=>game.current?.skipDeath()}>재시도 화면으로</button>}
    {ended&&view&&<EndingScreen ending={view.story.ending} elapsed={view.elapsed} checkpointLabel={view.checkpointLabel} reducedMotion={settings.reducedMotion} onMusic={game.current?.endingMusic} onRestart={()=>game.current?.start(view.story.ending==='caught')}/>}
    {error&&(ready||began)&&<div className="error-note" role="alert"><Volume2 size={18}/><p>{error}</p><button aria-label="알림 닫기" onClick={()=>setError('')}>×</button></div>}
  </main>;
}
