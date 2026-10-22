'use client';
import {useEffect,useState} from 'react';
import {RotateCcw} from '../lib/icons';
import {endings} from '../lib/story';

const beats=[
  {at:2,id:'report',label:'03:17 · 마지막 충돌',heading:'운전자는 현장에서 사망했다.',text:'아파트 앞 도로. 덤프트럭과 승용차의 정면충돌.\n현장에서 확인된 탑승자는 한 명이었다.'},
  {at:8,id:'absence',label:'현장 확인 · 조수석',heading:'그 자리는 비어 있었다.',text:'젖은 시트 위에는 아무도 없었다.\n차량 밖으로 빠져나간 흔적도 없었다.'},
  {at:14,id:'recording',label:'회수된 블랙박스 · 마지막 음성',heading:'「이번에도… 혼자 가려고?」',text:'사고 직전, 녹음된 목소리는 둘이었다.'},
] as const;
const creditsAt=21;
type Props={ending:'crashed'|'caught'|null;elapsed:number;checkpointLabel:string;reducedMotion:boolean;onRestart:()=>void};

export function EndingScreen({ending,elapsed,checkpointLabel,reducedMotion,onRestart}:Props){
  const [seconds,setSeconds]=useState(0),[showCredits,setShowCredits]=useState(false),[replay,setReplay]=useState(0);
  const crashed=ending==='crashed',complete=seconds>=creditsAt;
  useEffect(()=>{
    if(!crashed||complete)return;
    let last=performance.now();
    const timer=window.setInterval(()=>{
      const now=performance.now(),delta=(now-last)/1000;last=now;
      if(!document.hidden)setSeconds(value=>Math.min(creditsAt,value+Math.min(.5,delta)));
    },100);
    return()=>window.clearInterval(timer);
  },[crashed,complete,replay]);
  const duration=`${Math.floor(elapsed/60)}분 ${Math.floor(elapsed%60)}초`;
  if(!crashed)return <section className="ending-screen caught-ending" aria-label="재시도 화면"><div>
    <p className="overline">끝나지 않은 밤</p><h2>발소리가 멎었다.</h2><p className="ending-copy">{endings.caught}</p>
    <button type="button" className="start-button" onClick={onRestart}><span>{checkpointLabel}</span><RotateCcw size={18}/></button>
    <p className="ending-note">해당 구간부터 다시 시작합니다. 읽은 기록은 남습니다.</p>
  </div></section>;
  const beat=[...beats].reverse().find(item=>seconds>=item.at);
  function again(){setShowCredits(false);setSeconds(0);setReplay(value=>value+1);}
  return <section className={`epilogue${complete?' is-complete':''}${reducedMotion?' is-still':''}`} aria-label="귀가 후일담">
    {seconds>=2&&<div className="epilogue-still" aria-hidden="true"/>}
    <div className="epilogue-shade" aria-hidden="true"/>
    <header className="epilogue-header"><span>백로아파트 · 귀가 기록</span><time>03 : 17</time></header>
    {!complete?<>
      <div className="epilogue-copy" aria-live="polite" aria-atomic="true">{beat&&<div className="epilogue-beat" key={`${replay}:${beat.id}`}>
        <p className="epilogue-label">{beat.label}</p><h2>{beat.heading}</h2><p>{beat.text}</p>
        {beat.id==='recording'&&<span className="epilogue-wave" aria-hidden="true">{[12,22,10,35,18,42,28,15,36,50,20,33,12,26,44,17,28,12].map((height,i)=><i key={i} style={{height}}/>)}</span>}
      </div>}</div>
      <button type="button" className="epilogue-skip" onClick={()=>setSeconds(creditsAt)}>후일담 건너뛰기 <span aria-hidden="true">→</span></button>
    </>:<div className="epilogue-finish">
      <p className="epilogue-label">배드 엔딩 · 동승자</p>
      <h2 className="epilogue-title">귀가 <small lang="zh-Hant">(歸家)</small><span>03 : 17</span></h2>
      <p className="epilogue-last">한 사람은 돌아오지 못했고,<br/>한 사람은 끝내 내리지 않았다.</p>
      <p className="epilogue-thanks">끝까지 플레이해 주셔서 감사합니다.</p>
      <div className="epilogue-actions"><button type="button" className="start-button" onClick={onRestart}><span>처음부터 다시</span><RotateCcw size={17}/></button><button type="button" className="epilogue-secondary" onClick={again}>후일담 다시 보기</button></div>
      <details className="epilogue-record"><summary>마지막 기록 · {duration}</summary><p>{endings.crashed}</p></details>
      <button type="button" className="epilogue-credits-toggle" aria-expanded={showCredits} onClick={()=>setShowCredits(!showCredits)}>크레딧 {showCredits?'−':'＋'}</button>
      {showCredits&&<div className="epilogue-credits"><p>귀가 (歸家) · 한밤의 귀가 기록</p><dl><div><dt>주요 음향 자료</dt><dd>Kenney · dslrguide · tonsil5<br/>CC0</dd></div><div><dt>주요 환경 질감</dt><dd>Poly Haven · CC0</dd></div><div><dt>후일담 스틸</dt><dd>본 게임을 위해 생성한 원본 이미지</dd></div></dl><p>그리고 이 밤을 끝까지 걸어온 당신.</p></div>}
    </div>}
    <footer className="epilogue-footer"><span>귀가 (歸家)</span><span>{complete?'기록 종료':'마지막으로 남은 것'}</span></footer>
  </section>;
}
