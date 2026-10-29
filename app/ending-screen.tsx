'use client';
import {useEffect,useState} from 'react';
import {RotateCcw} from '../lib/icons';
import {endings} from '../lib/story';
import {wifeLetter} from '../lib/family-story';

const beats=[
  {at:2,id:'report',label:'03:17 · 마지막 충돌',heading:'운전자는 현장에서 사망했다.',text:'아파트 앞 도로. 덤프트럭과 승용차의 정면충돌.\n현장에서 확인된 탑승자는 한 명이었다.'},
  {at:8,id:'absence',label:'경찰 현장 조사 · 조수석',heading:'그 자리는 비어 있었다.',text:'젖은 시트에는 아무도 없었다.\n경찰은 조수석 다시방에서 「여보에게」라고 쓴 봉투를 발견했다.\n아내가 사고 전에 넣어 둔 편지였다.'},
  {at:14,id:'letter',label:'경찰이 회수한 편지 · 아내 한서연',heading:'함께 살아갈 내일을 기다리며.',text:wifeLetter},
] as const;
const creditsAt=40;
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
  return <section className={`epilogue${seconds>=2?' has-scene':''}${complete?' is-complete':''}${reducedMotion?' is-still':''}`} aria-label="귀가 후일담">
    <div className="epilogue-shade" aria-hidden="true"/>
    <header className="epilogue-header"><span>백로아파트 · 귀가 기록</span><time>03 : 17</time></header>
    {!complete?<>
      <div className="epilogue-copy" aria-live="polite" aria-atomic="true">{beat&&<div className="epilogue-beat" key={`${replay}:${beat.id}`}>
        <p className="epilogue-label">{beat.label}</p><h2>{beat.heading}</h2><p>{beat.text}</p>
      </div>}</div>
      <button type="button" className="epilogue-skip" onClick={()=>setSeconds(creditsAt)}>후일담 건너뛰기 <span aria-hidden="true">→</span></button>
    </>:<div className="epilogue-finish">
      <p className="epilogue-label">배드 엔딩 · 남겨진 편지</p>
      <h2 className="epilogue-title">귀가 <small lang="zh-Hant">(歸家)</small><span>03 : 17</span></h2>
      <p className="epilogue-last">아내는 함께 돌아올 내일을 기다렸고,<br/>나는 끝내 혼자 달아나려 했다.</p>
      <p className="epilogue-thanks">끝까지 플레이해 주셔서 감사합니다.</p>
      <div className="epilogue-actions"><button type="button" className="start-button" onClick={onRestart}><span>처음부터 다시</span><RotateCcw size={17}/></button><button type="button" className="epilogue-secondary" onClick={again}>후일담 다시 보기</button></div>
      <details className="epilogue-record"><summary>마지막 기록 · {duration}</summary><p>{endings.crashed}</p></details>
      <details className="epilogue-record"><summary>경찰이 회수한 편지 전문</summary><p>{wifeLetter}</p></details>
      <button type="button" className="epilogue-credits-toggle" aria-expanded={showCredits} onClick={()=>setShowCredits(!showCredits)}>크레딧 {showCredits?'−':'＋'}</button>
      {showCredits&&<div className="epilogue-credits"><p>귀가 (歸家) · 한밤의 귀가 기록</p><dl><div><dt>주요 음향 자료</dt><dd>Kenney · dslrguide · tonsil5<br/>CC0</dd></div><div><dt>여성 흐느낌</dt><dd><a href="https://opengameart.org/content/crying-female-low-tone-voice-over-vocal-sound-for-character" target="_blank" rel="noreferrer">Crying female low tone Voice Over · JeanMyna_VA / Jean Myna</a><br/><a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a> · WAV 변환, 가장자리 페이드, 음량 조정</dd></div><div><dt>주요 환경 질감</dt><dd>Poly Haven · CC0</dd></div><div><dt>후일담 장면</dt><dd>게임 속 차량과 도로의 3D 장면</dd></div></dl><p>그리고 이 밤을 끝까지 걸어온 당신.</p></div>}
    </div>}
    <footer className="epilogue-footer"><span>귀가 (歸家)</span><span>{complete?'기록 종료':'마지막으로 남은 것'}</span></footer>
  </section>;
}
