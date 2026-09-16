export type RecordedClip='male-surprise'|'female-collision-scream'|'collision-impact'|'phone-ring'|'radio-tuning-broadcast';
export type GhostLine='where'|'here'|'found'|'come'|'cry'|'scream'|'memory';
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
  cleanupTimer:ReturnType<typeof setTimeout>|undefined;
  haunt:GainNode|null=null;
  weather:GainNode|null=null;
  driveBus:GainNode|null=null;driveTone:OscillatorNode|null=null;tyres:GainNode|null=null;
  driveSpeed=-2;
  roadSounds=new Set<AudioBufferSourceNode>();
  hauntLevel=-1;
  clips:Partial<Record<RecordedClip,AudioBuffer>>={};
  deviceLoops=new Map<string,{source:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode}>();
  deviceWanted={phone:0,radio:0};
  volume = .42;
  start() {
    if(this.context){void this.context.resume();return;}
    const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.volume*.48;this.master.connect(ctx.destination);
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
    for(const clip of ['male-surprise','female-collision-scream','collision-impact','phone-ring','radio-tuning-broadcast'] as RecordedClip[])void fetch(`/audio/overhaul/${clip}.wav`).then(r=>{if(!r.ok)throw new Error('Clip unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(buffer=>{if(this.context===ctx){this.clips[clip]=buffer;this.setDevice('phone',this.deviceWanted.phone);this.setDevice('radio',this.deviceWanted.radio);}}).catch(()=>{});
    for(const line of ['where','here','found','come','cry','scream','memory'] as GhostLine[])void fetch(`/audio/${line}.wav`).then(r=>{if(!r.ok)throw new Error('Voice unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(buffer=>{if(this.context===ctx)this.voices[line]=buffer;}).catch(()=>{});
  }
  recorded(clip:RecordedClip,level=1,pan=0){
    const ctx=this.context,buffer=this.clips[clip];if(!ctx||!buffer||ctx.state!=='running')return;
    const source=ctx.createBufferSource(),gain=ctx.createGain(),p=ctx.createStereoPanner();source.buffer=buffer;gain.gain.value=level*.9;p.pan.value=pan;
    source.connect(gain);gain.connect(p);p.connect(clip==='male-surprise'||clip==='female-collision-scream'?this.voiceBus!:this.effectsBus!);
    this.roadSounds.add(source);source.onended=()=>{this.roadSounds.delete(source);source.disconnect();gain.disconnect();p.disconnect();};source.start();
  }
  setDevice(device:'phone'|'radio',level:number,pan=0){
    this.deviceWanted[device]=level;
    const ctx=this.context,old=this.deviceLoops.get(device);if(!ctx)return;
    if(level<=0){if(old){old.source.stop();old.source.disconnect();old.gain.disconnect();old.pan.disconnect();this.deviceLoops.delete(device);}return;}
    if(old){old.gain.gain.setTargetAtTime(level*.55,ctx.currentTime,.15);old.pan.pan.value=pan;return;}
    const buffer=this.clips[device==='phone'?'phone-ring':'radio-tuning-broadcast'];if(!buffer)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain(),p=ctx.createStereoPanner();source.buffer=buffer;source.loop=true;gain.gain.value=level*.55;p.pan.value=pan;
    source.connect(gain);gain.connect(p);p.connect(this.effectsBus!);source.start();this.deviceLoops.set(device,{source,gain,pan:p});
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
  mix(levels:{music:number;effects:number;voice:number}){this.levels={music:levels.music,effects:levels.effects,voice:levels.voice};if(!this.context)return;for(const [key,bus] of [['music',this.musicBus],['effects',this.effectsBus],['voice',this.voiceBus]] as const)bus?.gain.setTargetAtTime(this.levels[key],this.context.currentTime,.12);}
  recording(){this.voice('memory',0,.85);}
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
    source.buffer=buffer;source.playbackRate.value=line==='scream'||line==='memory'?1:line==='cry'?.94:.86;filter.type='lowpass';filter.frequency.value=occluded?650:line==='scream'?5200:line==='memory'?2800:2400;gain.gain.value=.64*level;panner.pan.value=Math.max(-1,Math.min(1,pan));delay.delayTime.value=.23;echo.gain.value=.22;
    source.connect(filter);filter.connect(gain);gain.connect(panner);gain.connect(delay);delay.connect(echo);echo.connect(panner);panner.connect(this.voiceBus!);
    this.voiceSource=source;this.voiceNodes=[source,filter,gain,panner,delay,echo];source.start();source.onended=()=>{this.cleanupTimer=setTimeout(()=>this.stopVoices(),350);};
  }
  sound(kind:'step'|'knock'|'click'|'phone'|'dread'|'breath'|'drag'|'fall'|'drip'|'slam'|'metal'|'motor'|'chime'|'alarm'|'tap'|'siren'|'wiper'|'brake'|'crash'|'glass',pan=0,level=1){
    const ctx=this.context;if(!ctx||!this.master||ctx.state!=='running')return;
    const t=ctx.currentTime, g=ctx.createGain(), p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.effectsBus!);
    if(kind==='wiper'||kind==='brake'||kind==='crash'||kind==='glass'){
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=this.noise;source.connect(filter);filter.connect(g);
      this.roadSounds.add(source);p.disconnect();p.connect(this.driveBus??this.effectsBus!);
      const duration=kind==='wiper'?.38:kind==='brake'?.95:kind==='crash'?.65:1.1;
      filter.type=kind==='crash'?'lowpass':'bandpass';filter.frequency.setValueAtTime(kind==='wiper'?800:kind==='brake'?1750:kind==='crash'?450:4700,t);filter.frequency.exponentialRampToValueAtTime(kind==='crash'?70:kind==='wiper'?420:900,t+duration);filter.Q.value=kind==='brake'?2.8:.8;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((kind==='crash'?.72:kind==='wiper'?.055:kind==='brake'?.16:.13)*level,t+(kind==='crash'?.008:.06));g.gain.exponentialRampToValueAtTime(.0001,t+duration);
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
  dispose(){this.setDevice('phone',0);this.setDevice('radio',0);this.clips={};this.stopVoices();this.setDrive(null);void this.context?.close();this.context=null;this.master=null;this.noise=null;this.tv=null;this.voices={};this.haunt=null;this.weather=null;this.hauntLevel=-1;this.driveBus=null;this.driveTone=null;this.tyres=null;this.driveSpeed=-2;}
}
