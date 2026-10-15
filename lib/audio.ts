import type {ArchiveFrame} from './archive-review.ts';
export type RecordedClip='fire-bell'|'player-breath'|'passenger-line'|'male-surprise'|'female-collision-scream'|'collision-impact'|'phone-ring'|'radio-tuning-broadcast'|'archive-guard'|'archive-denial'|'archive-plea'|'archive-lock';
const archiveCues={road:[['collision-impact',4.2]],call:[['archive-guard',.2],['archive-denial',8]],gate:[['archive-plea',.8],['archive-lock',5.8]]} as const;
export type GhostLine='where'|'here'|'found'|'come'|'cry'|'scream'|'memory'|'no';
// Local voice clips and procedural effects share a bounded master volume.
export class HorrorAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  musicBus:GainNode|null=null;effectsBus:GainNode|null=null;voiceBus:GainNode|null=null;
  levels={music:.65,effects:.85,voice:.85};
  noise: AudioBuffer | null = null;
  tv: GainNode | null = null;
  voices:Partial<Record<GhostLine,AudioBuffer>>={};
  voiceSource:AudioBufferSourceNode|null=null;
  voiceNodes:AudioNode[]=[];
  recordingSource:AudioBufferSourceNode|null=null;recordingGain:GainNode|null=null;recordingPan:StereoPannerNode|null=null;recordingNodes:AudioNode[]=[];recordingLevel=-1;
  cleanupTimer:ReturnType<typeof setTimeout>|undefined;
  haunt:GainNode|null=null;
  chase:GainNode|null=null;chasePulse:OscillatorNode|null=null;chaseFilter:BiquadFilterNode|null=null;chaseLevel=-1;
  chaseScore:AudioBufferSourceNode|null=null;
  weather:GainNode|null=null;
  driveBus:GainNode|null=null;driveTone:OscillatorNode|null=null;tyres:GainNode|null=null;
  driveSpeed=-2;
  roadSounds=new Set<AudioBufferSourceNode>();
  hauntLevel=-1;
  clips:Partial<Record<RecordedClip,AudioBuffer>>={};
  archiveSounds=new Set<AudioBufferSourceNode>();
  archivePosition:{source:ArchiveFrame['source'];time:number;contextTime:number}|null=null;
  archiveGain:GainNode|null=null;archivePan:StereoPannerNode|null=null;
  deviceLoops=new Map<string,{source:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode;level:number}>();
  deviceWanted={phone:0,radio:0,alarm:0};
  exertion:GainNode|null=null;exertionSource:AudioBufferSourceNode|null=null;exertionWanted=0;exertionLevel=-1;
  volume = .42;
  start() {
    this.prepare();void this.context!.resume();this.setVolume(this.volume);
  }
  prepare() {
    if(this.context)return;
    // Opening the device can block for over 100 ms. Do it while the game loads,
    // with both suspension and a silent master until the player's start gesture.
    const ctx=this.context=new AudioContext();void ctx.suspend();
    this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);
    this.musicBus=ctx.createGain();this.effectsBus=ctx.createGain();this.voiceBus=ctx.createGain();for(const bus of [this.musicBus,this.effectsBus,this.voiceBus])bus.connect(this.master);this.mix(this.levels);
    const noise=this.noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const data=noise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    this.weather=ctx.createGain();this.weather.connect(this.effectsBus!);
    this.haunt=ctx.createGain();this.haunt.gain.value=0;this.haunt.connect(this.musicBus!);
    // Detuned low strings and a slow breathing pulse fade in with the apparition.
    for(const [hz,level] of [[54.5,.1],[57.1,.07],[109,.045],[116.5,.035],[233,.025],[247,.02]]){
      const tone=ctx.createOscillator(),gain=ctx.createGain(),pulse=ctx.createOscillator(),depth=ctx.createGain();
      tone.type=hz<100?'triangle':'sine';tone.frequency.value=hz;gain.gain.value=level;pulse.frequency.value=.14+hz/1800;depth.gain.value=level*.45;
      pulse.connect(depth);depth.connect(gain.gain);tone.connect(gain);gain.connect(this.haunt);tone.start();pulse.start();
    }
    const wind=ctx.createBufferSource(),windFilter=ctx.createBiquadFilter(),windGain=ctx.createGain();wind.buffer=noise;wind.loop=true;windFilter.type='bandpass';windFilter.frequency.value=420;windFilter.Q.value=3;windGain.gain.value=.13;wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(this.haunt);wind.start();
    // Original chase score: a quickening bass pulse beneath dissonant, bowed-like harmonics.
    this.chase=ctx.createGain();this.chase.gain.value=0;this.chase.connect(this.musicBus!);
    this.chaseFilter=ctx.createBiquadFilter();this.chaseFilter.type='lowpass';this.chaseFilter.frequency.value=900;this.chaseFilter.connect(this.chase);
    const gate=ctx.createGain(),depth=ctx.createGain(),fallback=ctx.createGain();gate.gain.value=.55;depth.gain.value=.5;gate.connect(fallback);fallback.connect(this.chaseFilter);
    this.chasePulse=ctx.createOscillator();this.chasePulse.type='triangle';this.chasePulse.frequency.value=2.2;this.chasePulse.connect(depth);depth.connect(gate.gain);this.chasePulse.start();
    for(const [hz,level] of [[55,.12],[82.4,.06],[110.9,.065],[164.8,.035],[233.1,.018]]){
      const tone=ctx.createOscillator(),gain=ctx.createGain();tone.type=hz>150?'sawtooth':'triangle';tone.frequency.value=hz;gain.gain.value=level;tone.connect(gain);gain.connect(gate);tone.start();
    }
    // Baked original score: wide bowed/brass clusters, low-string ostinato and drums.
    // Decoding happens once; pursuit only moves the existing gain/filter controls.
    void fetch('/audio/chase-score.wav').then(r=>{if(!r.ok)throw new Error('Score unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(buffer=>{
      if(this.context!==ctx)return;
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;
      source.connect(gain);gain.connect(this.chaseFilter!);gain.gain.setTargetAtTime(.95,ctx.currentTime,.7);fallback.gain.setTargetAtTime(.17,ctx.currentTime,.7);source.start();this.chaseScore=source;
    }).catch(()=>{});
    // Distant rain and ventilation stay quiet underneath positional sounds.
    for(const [hz,level] of [[650,.07],[2300,.018]]){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noise;src.loop=true;filter.type='lowpass';filter.frequency.value=hz;gain.gain.value=level;src.connect(filter);filter.connect(gain);gain.connect(this.weather);src.start();}
    const tvSource=ctx.createBufferSource(),tvFilter=ctx.createBiquadFilter();this.tv=ctx.createGain();this.tv.gain.value=0;tvSource.buffer=noise;tvSource.loop=true;tvFilter.type='bandpass';tvFilter.frequency.value=950;tvFilter.Q.value=1.1;tvSource.connect(tvFilter);tvFilter.connect(this.tv);this.tv.connect(this.effectsBus!);tvSource.start();
    this.driveBus=ctx.createGain();this.driveBus.gain.value=0;this.driveBus.connect(this.effectsBus!);
    this.driveTone=ctx.createOscillator();this.driveTone.type='triangle';this.driveTone.frequency.value=48;
    const engineFilter=ctx.createBiquadFilter(),engineGain=ctx.createGain();engineFilter.type='lowpass';engineFilter.frequency.value=220;engineGain.gain.value=.13;
    this.driveTone.connect(engineFilter);engineFilter.connect(engineGain);engineGain.connect(this.driveBus);this.driveTone.start();
    const road=ctx.createBufferSource(),roadFilter=ctx.createBiquadFilter();road.buffer=noise;road.loop=true;roadFilter.type='lowpass';roadFilter.frequency.value=1200;
    this.tyres=ctx.createGain();this.tyres.gain.value=0;road.connect(roadFilter);roadFilter.connect(this.tyres);this.tyres.connect(this.driveBus);road.start();
    for(const hz of [43,57.4,86.3]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=hz;g.gain.value=.015;o.connect(g);g.connect(this.musicBus!);o.start();}
    const lock=this.clips['archive-lock']=ctx.createBuffer(1,Math.round(ctx.sampleRate*.1),ctx.sampleRate),lockData=lock.getChannelData(0);
    for(let i=0;i<lockData.length;i++){const t=i/ctx.sampleRate;lockData[i]=Math.sin(t*2300)*Math.exp(-t*90)*.4;}
    for(const clip of ['fire-bell','player-breath','passenger-line','male-surprise','female-collision-scream','collision-impact','phone-ring','radio-tuning-broadcast','archive-guard','archive-denial','archive-plea'] as RecordedClip[])void fetch(`/audio/overhaul/${clip}.${clip.startsWith('archive-')?'mp3':'wav'}`).then(r=>{if(!r.ok)throw new Error('Clip unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(buffer=>{if(this.context===ctx){this.clips[clip]=buffer;this.setExertion(this.exertionWanted);this.setDevice('phone',this.deviceWanted.phone);this.setDevice('radio',this.deviceWanted.radio);this.setDevice('alarm',this.deviceWanted.alarm);}}).catch(()=>{});
    for(const line of ['where','here','found','come','cry','scream','memory','no'] as GhostLine[])void fetch(`/audio/${line}.wav`).then(r=>{if(!r.ok)throw new Error('Voice unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(buffer=>{if(this.context===ctx)this.voices[line]=buffer;}).catch(()=>{});
  }
  recorded(clip:RecordedClip,level=1,pan=0){
    const ctx=this.context,buffer=this.clips[clip];if(!ctx||!buffer||ctx.state!=='running')return;
    const source=ctx.createBufferSource(),gain=ctx.createGain(),p=ctx.createStereoPanner();source.buffer=buffer;gain.gain.value=level*.9;p.pan.value=pan;
    source.connect(gain);gain.connect(p);p.connect(clip==='passenger-line'||clip==='male-surprise'||clip==='female-collision-scream'?this.voiceBus!:this.effectsBus!);
    this.roadSounds.add(source);source.onended=()=>{this.roadSounds.delete(source);source.disconnect();gain.disconnect();p.disconnect();};source.start();
  }
  stopArchiveRecord(){
    const ctx=this.context;if(this.archiveGain&&ctx)this.archiveGain.gain.setTargetAtTime(0,ctx.currentTime,.003);
    for(const source of this.archiveSounds){try{source.stop(ctx?ctx.currentTime+.015:0);}catch{}}
    this.archiveSounds.clear();this.archivePosition=null;this.archiveGain=null;this.archivePan=null;
  }
  setArchiveRecord(frame:ArchiveFrame|null,level=1,pan=0){
    const ctx=this.context;
    if(!frame?.source||!frame.playing){if(this.archivePosition)this.stopArchiveRecord();return;}
    // A player-requested global pause suspends the same audio clock; keep its nodes.
    if(!ctx||ctx.state!=='running'||!this.voiceBus)return;
    const old=this.archivePosition;
    if(old&&old.source===frame.source&&Math.abs(frame.time-old.time-(ctx.currentTime-old.contextTime))<.18){
      this.archiveGain?.gain.setTargetAtTime(Math.max(0,level)*.75,ctx.currentTime,.04);if(this.archivePan)this.archivePan.pan.value=pan;return;
    }
    const cues=archiveCues[frame.source];this.stopArchiveRecord();if(cues.some(([clip])=>!this.clips[clip]))return;
    this.archivePosition={source:frame.source,time:frame.time,contextTime:ctx.currentTime};
    const high=ctx.createBiquadFilter(),low=ctx.createBiquadFilter(),gain=this.archiveGain=ctx.createGain(),p=this.archivePan=ctx.createStereoPanner();
    high.type='highpass';high.frequency.value=240;low.type='lowpass';low.frequency.value=3100;gain.gain.value=Math.max(0,level)*.75;p.pan.value=pan;
    high.connect(low);low.connect(gain);gain.connect(p);p.connect(this.voiceBus);
    const nodes=[high,low,gain,p];let remaining=0;
    for(const [clip,at] of cues){
      const buffer=this.clips[clip]!;if(frame.time>=at+buffer.duration)continue;
      const source=ctx.createBufferSource();source.buffer=buffer;source.connect(high);this.archiveSounds.add(source);remaining++;
      source.onended=()=>{this.archiveSounds.delete(source);source.disconnect();if(--remaining===0)nodes.forEach(node=>node.disconnect());};
      source.start(ctx.currentTime+Math.max(0,at-frame.time),Math.max(0,frame.time-at));
    }
    if(!remaining)nodes.forEach(node=>node.disconnect());
  }
  setExertion(level:number){
    this.exertionWanted=Math.max(0,Math.min(1,level));
    const ctx=this.context,buffer=this.clips['player-breath'];if(!ctx||!buffer)return;
    if(!this.exertion){
      this.exertion=ctx.createGain();this.exertion.gain.value=0;this.exertion.connect(this.effectsBus!);
      const source=this.exertionSource=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.exertion);source.start();
    }
    if(Math.abs(this.exertionLevel-this.exertionWanted)<.015)return;
    this.exertionLevel=this.exertionWanted;this.exertion.gain.setTargetAtTime(this.exertionWanted*.8,ctx.currentTime,.25);
  }
  setDevice(device:'phone'|'radio'|'alarm',level:number,pan=0){
    this.deviceWanted[device]=level;
    const ctx=this.context,old=this.deviceLoops.get(device);if(!ctx)return;
    if(level<=0){if(old){old.source.stop();old.source.disconnect();old.gain.disconnect();old.pan.disconnect();this.deviceLoops.delete(device);}return;}
    if(old){if(Math.abs(old.level-level)>.015){old.level=level;old.gain.gain.setTargetAtTime(level*.55,ctx.currentTime,.15);}old.pan.pan.value=pan;return;}
    const buffer=this.clips[device==='phone'?'phone-ring':device==='alarm'?'fire-bell':'radio-tuning-broadcast'];if(!buffer)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain(),p=ctx.createStereoPanner();source.buffer=buffer;source.loop=true;gain.gain.value=level*.55;p.pan.value=pan;
    source.connect(gain);gain.connect(p);p.connect(this.effectsBus!);source.start();this.deviceLoops.set(device,{source,gain,pan:p,level});
  }
  setHaunt(value:number){
    const level=Math.max(0,Math.min(1,value));if(!this.context||!this.haunt||!this.weather||Math.abs(level-this.hauntLevel)<.02)return;
    this.hauntLevel=level;const t=this.context.currentTime;this.haunt.gain.setTargetAtTime(level,t,.65);this.weather.gain.setTargetAtTime(1-level*.6,t,.9);
  }
  setDrive(speed:number|null){
    if(speed===null){for(const source of this.roadSounds){try{source.stop();}catch{}}this.roadSounds.clear();}
    const value=speed===null?-1:Math.max(0,Math.min(15,speed));
    if(!this.context||!this.driveBus||!this.driveTone||!this.tyres||Math.abs(value-this.driveSpeed)<.08)return;
    this.driveSpeed=value;const t=this.context.currentTime;
    this.driveBus.gain.setTargetAtTime(value<0?0:1,t,.12);
    this.driveTone.frequency.setTargetAtTime(43+Math.max(0,value)*4.7,t,.08);
    this.tyres.gain.setTargetAtTime(.035+Math.max(0,value)*.012,t,.12);
  }
  setChase(value:number){
    const level=Math.max(0,Math.min(1,value));if(!this.context||!this.chase||!this.chasePulse||!this.chaseFilter||Math.abs(level-this.chaseLevel)<.02)return;
    const t=this.context.currentTime,fade=level>this.chaseLevel?.18:1.25;this.chaseLevel=level;
    this.chase.gain.setTargetAtTime(level*.9,t,fade);this.chasePulse.frequency.setTargetAtTime(2.2+level*1.25,t,.45);this.chaseFilter.frequency.setTargetAtTime(650+level*1300,t,.6);
  }
  mix(levels:{music:number;effects:number;voice:number}){this.levels={music:levels.music,effects:levels.effects,voice:levels.voice};if(!this.context)return;for(const [key,bus] of [['music',this.musicBus],['effects',this.effectsBus],['voice',this.voiceBus]] as const)bus?.gain.setTargetAtTime(this.levels[key],this.context.currentTime,.12);}
  recording(){
    this.stopRecording();const ctx=this.context,buffer=this.voices.memory;if(!ctx||!buffer||!this.voiceBus||ctx.state!=='running')return;
    const source=this.recordingSource=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=this.recordingGain=ctx.createGain(),pan=this.recordingPan=ctx.createStereoPanner();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=2800;gain.gain.value=.54;source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.voiceBus);this.recordingNodes=[source,filter,gain,pan];source.onended=()=>this.stopRecording();source.start();
  }
  setRecordingPosition(level:number,pan=0){
    if(!this.context||!this.recordingGain||!this.recordingPan)return;
    const value=Math.max(0,Math.min(1,level));if(Math.abs(value-this.recordingLevel)>.015){this.recordingLevel=value;this.recordingGain.gain.setTargetAtTime(value*.54,this.context.currentTime,.08);}this.recordingPan.pan.value=Math.max(-1,Math.min(1,pan));
  }
  stopRecording(){
    if(this.recordingSource){this.recordingSource.onended=null;try{this.recordingSource.stop();}catch{}this.recordingSource=null;}
    this.recordingNodes.forEach(n=>n.disconnect());this.recordingNodes=[];this.recordingGain=null;this.recordingPan=null;this.recordingLevel=-1;
  }
  footstep(surface:'wood'|'tile'|'metal'|'wet',pan=0,level=1){
    const ctx=this.context;if(!ctx||!this.effectsBus||ctx.state!=='running')return;
    const t=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),p=ctx.createStereoPanner();
    source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=surface==='metal'?1700:surface==='wet'?950:surface==='tile'?650:280;filter.Q.value=surface==='metal'?4:1;
    source.connect(filter);filter.connect(gain);gain.connect(p);p.pan.value=pan;p.connect(this.effectsBus);
    const duration=surface==='wet'?.23:.12;gain.gain.setValueAtTime(.12*level,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.start(t,Math.random());source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();p.disconnect();};this.sound('step',pan,level*.7);
  }
  setVolume(v:number){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v*.48,this.context!.currentTime,.1);}
  setTV(on:boolean){if(this.tv)this.tv.gain.value=on?.12:0;}
  pause(){void this.context?.suspend();}
  resume(){void this.context?.resume();}
  stopVoices(){clearTimeout(this.cleanupTimer);if(this.voiceSource){this.voiceSource.onended=null;try{this.voiceSource.stop();}catch{}this.voiceSource=null;}this.voiceNodes.forEach(n=>n.disconnect());this.voiceNodes=[];}
  voice(line:GhostLine,pan=0,level=1,occluded=false){
    const ctx=this.context,buffer=this.voices[line];if(!ctx||!this.master||ctx.state!=='running')return;
    if(!buffer){this.sound('breath',pan,level);return;}
    this.stopVoices();const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),panner=ctx.createStereoPanner(),delay=ctx.createDelay(.5),echo=ctx.createGain();
    source.buffer=buffer;source.playbackRate.value=line==='scream'||line==='memory'||line==='no'?1:line==='cry'?.94:.86;filter.type='lowpass';filter.frequency.value=occluded?650:line==='scream'||line==='no'?5200:line==='memory'?2800:2400;gain.gain.value=.64*level;panner.pan.value=Math.max(-1,Math.min(1,pan));delay.delayTime.value=.23;echo.gain.value=.22;
    source.connect(filter);filter.connect(gain);gain.connect(panner);gain.connect(delay);delay.connect(echo);echo.connect(panner);panner.connect(this.voiceBus!);
    this.voiceSource=source;this.voiceNodes=[source,filter,gain,panner,delay,echo];source.start();source.onended=()=>{this.cleanupTimer=setTimeout(()=>this.stopVoices(),350);};
  }
  sound(kind:'wet-drop'|'door-creak'|'step'|'knock'|'click'|'phone'|'dread'|'breath'|'drag'|'fall'|'drip'|'slam'|'metal'|'motor'|'chime'|'alarm'|'tap'|'siren'|'wiper'|'vibrate'|'brake'|'crash'|'glass',pan=0,level=1){
    const ctx=this.context;if(!ctx||!this.master||ctx.state!=='running')return;
    const t=ctx.currentTime, g=ctx.createGain(), p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.effectsBus!);
    if(kind==='wet-drop'||kind==='door-creak'){
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),body=ctx.createOscillator(),bodyGain=ctx.createGain(),wet=kind==='wet-drop',duration=wet?.65:1.05;
      source.buffer=this.noise;filter.type=wet?'lowpass':'bandpass';filter.frequency.setValueAtTime(wet?1800:420,t);filter.frequency.exponentialRampToValueAtTime(wet?350:105,t+duration);filter.Q.value=wet?.8:9;
      source.connect(filter);filter.connect(g);body.type=wet?'sine':'triangle';body.frequency.setValueAtTime(wet?125:175,t);body.frequency.exponentialRampToValueAtTime(wet?48:60,t+duration);bodyGain.gain.value=wet?.48:.07;body.connect(bodyGain);bodyGain.connect(g);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level*(wet?.9:.24),t+.012);g.gain.exponentialRampToValueAtTime(wet?.075:.12,t+(wet?.09:.4));
      if(wet){g.gain.linearRampToValueAtTime(.19*level,t+.14);g.gain.exponentialRampToValueAtTime(.025,t+.26);}
      g.gain.exponentialRampToValueAtTime(.0001,t+duration);source.start(t);body.start(t);source.stop(t+duration+.02);body.stop(t+duration+.02);
      source.onended=()=>{source.disconnect();filter.disconnect();body.disconnect();bodyGain.disconnect();g.disconnect();p.disconnect();};return;
    }
    if(kind==='wiper'||kind==='vibrate'||kind==='brake'||kind==='crash'||kind==='glass'){
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=this.noise;source.connect(filter);filter.connect(g);
      this.roadSounds.add(source);p.disconnect();p.connect(this.driveBus??this.effectsBus!);
      const duration=kind==='vibrate'?.55:kind==='wiper'?.38:kind==='brake'?.95:kind==='crash'?.65:1.1;
      filter.type=kind==='crash'?'lowpass':'bandpass';filter.frequency.setValueAtTime(kind==='wiper'?800:kind==='brake'?1750:kind==='crash'?450:kind==='vibrate'?150:4700,t);filter.frequency.exponentialRampToValueAtTime(kind==='crash'?70:kind==='wiper'?420:kind==='vibrate'?105:900,t+duration);filter.Q.value=kind==='brake'?2.8:kind==='vibrate'?5:.8;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((kind==='crash'?.72:kind==='wiper'?.055:kind==='brake'?.16:kind==='vibrate'?.09:.13)*level,t+(kind==='crash'?.008:.06));g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      source.start(t,Math.random());source.stop(t+duration+.03);source.onended=()=>{this.roadSounds.delete(source);source.disconnect();filter.disconnect();g.disconnect();p.disconnect();};return;
    }
    if(kind==='fall'){
      const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),cry=ctx.createOscillator(),cryGain=ctx.createGain();
      src.buffer=this.noise;filter.type='bandpass';filter.frequency.setValueAtTime(1900,t);filter.frequency.exponentialRampToValueAtTime(170,t+1.8);filter.Q.value=1.2;src.connect(filter);filter.connect(g);
      cry.type='triangle';cry.frequency.setValueAtTime(780,t);cry.frequency.exponentialRampToValueAtTime(90,t+1.8);cryGain.gain.value=.17;cry.connect(cryGain);cryGain.connect(g);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.36*level,t+.16);g.gain.exponentialRampToValueAtTime(.0001,t+2.1);src.start(t);cry.start(t);src.stop(t+2.15);cry.stop(t+2.15);
      src.onended=()=>{src.disconnect();filter.disconnect();cry.disconnect();cryGain.disconnect();g.disconnect();p.disconnect();};return;
    }
    if(kind==='breath'||kind==='drag'||kind==='tap'){
      const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter();src.buffer=this.noise;src.connect(filter);filter.type='bandpass';filter.frequency.setValueAtTime(kind==='tap'?3200:kind==='breath'?620:1500,t);filter.frequency.exponentialRampToValueAtTime(kind==='tap'?1400:kind==='breath'?260:540,t+.65);filter.Q.value=kind==='breath'?.7:1.8;filter.connect(g);
      const duration=kind==='tap'?3:kind==='breath'?1.45:.72;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((kind==='breath'?.22:.17)*level,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+duration);src.start(t,Math.random());src.stop(t+duration+.05);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();p.disconnect();};return;
    }
    const o=ctx.createOscillator();o.connect(g);
    const settings={step:[75,.09,.21],knock:[95,.29,.5],click:[380,.055,.14],phone:[730,.2,.075],dread:[49,2.8,.23],drip:[1250,.28,.08],slam:[66,.8,.5],metal:[850,.38,.065],motor:[38,1.6,.08],chime:[880,.65,.1],alarm:[650,1.1,.13],siren:[560,4,.11]}[kind];
    o.type=kind==='metal'?'sawtooth':kind==='alarm'||kind==='click'?'triangle':'sine';o.frequency.setValueAtTime(settings[0],t);o.frequency.exponentialRampToValueAtTime(Math.max(24,settings[0]*.45),t+settings[1]);
    if(kind==='alarm'||kind==='siren')o.frequency.exponentialRampToValueAtTime(950,t+.5);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(settings[2]*level,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+settings[1]);o.start(t);o.stop(t+settings[1]+.05);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
  }
  dispose(){this.stopRecording();this.stopArchiveRecord();this.exertionSource?.stop();this.exertionSource=null;this.exertion=null;this.exertionWanted=0;this.exertionLevel=-1;this.setDevice('phone',0);this.setDevice('radio',0);this.setDevice('alarm',0);this.clips={};this.stopVoices();this.setDrive(null);void this.context?.close();this.context=null;this.master=null;this.noise=null;this.tv=null;this.voices={};this.haunt=null;this.weather=null;this.hauntLevel=-1;this.chase=null;this.chaseScore=null;this.chasePulse=null;this.chaseFilter=null;this.chaseLevel=-1;this.driveBus=null;this.driveTone=null;this.tyres=null;this.driveSpeed=-2;}
}
