export type GhostLine='where'|'here'|'found'|'come'|'cry'|'scream';
// Local voice clips and procedural effects share a bounded master volume.
export class HorrorAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  noise: AudioBuffer | null = null;
  tv: GainNode | null = null;
  voices:Partial<Record<GhostLine,AudioBuffer>>={};
  voiceSource:AudioBufferSourceNode|null=null;
  voiceNodes:AudioNode[]=[];
  cleanupTimer:ReturnType<typeof setTimeout>|undefined;
  haunt:GainNode|null=null;
  weather:GainNode|null=null;
  hauntLevel=-1;
  volume = .42;
  start() {
    if(this.context){void this.context.resume();return;}
    const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.volume*.48;this.master.connect(ctx.destination);
    const noise=this.noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const data=noise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    this.weather=ctx.createGain();this.weather.connect(this.master);
    this.haunt=ctx.createGain();this.haunt.gain.value=0;this.haunt.connect(this.master);
    // Detuned low strings and a slow breathing pulse fade in with the apparition.
    for(const [hz,level] of [[54.5,.1],[57.1,.07],[109,.045],[116.5,.035],[233,.025],[247,.02]]){
      const tone=ctx.createOscillator(),gain=ctx.createGain(),pulse=ctx.createOscillator(),depth=ctx.createGain();
      tone.type=hz<100?'triangle':'sine';tone.frequency.value=hz;gain.gain.value=level;pulse.frequency.value=.14+hz/1800;depth.gain.value=level*.45;
      pulse.connect(depth);depth.connect(gain.gain);tone.connect(gain);gain.connect(this.haunt);tone.start();pulse.start();
    }
    const wind=ctx.createBufferSource(),windFilter=ctx.createBiquadFilter(),windGain=ctx.createGain();wind.buffer=noise;wind.loop=true;windFilter.type='bandpass';windFilter.frequency.value=420;windFilter.Q.value=3;windGain.gain.value=.13;wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(this.haunt);wind.start();
    // Distant rain and ventilation stay quiet underneath positional sounds.
    for(const [hz,level] of [[650,.07],[2300,.018]]){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noise;src.loop=true;filter.type='lowpass';filter.frequency.value=hz;gain.gain.value=level;src.connect(filter);filter.connect(gain);gain.connect(this.weather);src.start();}
    const tvSource=ctx.createBufferSource(),tvFilter=ctx.createBiquadFilter();this.tv=ctx.createGain();this.tv.gain.value=0;tvSource.buffer=noise;tvSource.loop=true;tvFilter.type='bandpass';tvFilter.frequency.value=950;tvFilter.Q.value=1.1;tvSource.connect(tvFilter);tvFilter.connect(this.tv);this.tv.connect(this.master);tvSource.start();
    for(const hz of [43,57.4,86.3]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=hz;g.gain.value=.015;o.connect(g);g.connect(this.master);o.start();}
    for(const line of ['where','here','found','come','cry','scream'] as GhostLine[])void fetch(`/audio/${line}.wav`).then(r=>{if(!r.ok)throw new Error('Voice unavailable');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data)).then(buffer=>{if(this.context===ctx)this.voices[line]=buffer;}).catch(()=>{});
  }
  setHaunt(value:number){
    const level=Math.max(0,Math.min(1,value));if(!this.context||!this.haunt||!this.weather||Math.abs(level-this.hauntLevel)<.02)return;
    this.hauntLevel=level;const t=this.context.currentTime;this.haunt.gain.setTargetAtTime(level,t,.65);this.weather.gain.setTargetAtTime(1-level*.6,t,.9);
  }
  setVolume(v:number){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v*.48,this.context!.currentTime,.1);}
  setTV(on:boolean){if(this.tv)this.tv.gain.value=on?.12:0;}
  pause(){void this.context?.suspend();}
  resume(){void this.context?.resume();}
  stopVoices(){clearTimeout(this.cleanupTimer);if(this.voiceSource){this.voiceSource.onended=null;try{this.voiceSource.stop();}catch{}this.voiceSource=null;}this.voiceNodes.forEach(n=>n.disconnect());this.voiceNodes=[];}
  voice(line:GhostLine,pan=0,level=1){
    const ctx=this.context,buffer=this.voices[line];if(!ctx||!this.master||ctx.state!=='running')return;
    if(!buffer){this.sound('breath',pan,level);return;}
    this.stopVoices();const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),panner=ctx.createStereoPanner(),delay=ctx.createDelay(.5),echo=ctx.createGain();
    source.buffer=buffer;source.playbackRate.value=line==='scream'?1:line==='cry'?.94:.86;filter.type='lowpass';filter.frequency.value=line==='scream'?5200:1900;gain.gain.value=.64*level;panner.pan.value=Math.max(-1,Math.min(1,pan));delay.delayTime.value=.23;echo.gain.value=.22;
    source.connect(filter);filter.connect(gain);gain.connect(panner);gain.connect(delay);delay.connect(echo);echo.connect(panner);panner.connect(this.master);
    this.voiceSource=source;this.voiceNodes=[source,filter,gain,panner,delay,echo];source.start();source.onended=()=>{this.cleanupTimer=setTimeout(()=>this.stopVoices(),350);};
  }
  sound(kind:'step'|'knock'|'click'|'phone'|'dread'|'breath'|'drag'|'drip'|'slam'|'metal'|'motor'|'chime'|'alarm',pan=0,level=1){
    const ctx=this.context;if(!ctx||!this.master||ctx.state!=='running')return;
    const t=ctx.currentTime, g=ctx.createGain(), p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.master);
    if(kind==='breath'||kind==='drag'){
      const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter();src.buffer=this.noise;src.connect(filter);filter.type='bandpass';filter.frequency.setValueAtTime(kind==='breath'?620:1500,t);filter.frequency.exponentialRampToValueAtTime(kind==='breath'?260:540,t+.65);filter.Q.value=kind==='breath'?.7:1.8;filter.connect(g);
      const duration=kind==='breath'?1.45:.72;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime((kind==='breath'?.22:.17)*level,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+duration);src.start(t,Math.random());src.stop(t+duration+.05);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();p.disconnect();};return;
    }
    const o=ctx.createOscillator();o.connect(g);
    const settings={step:[75,.09,.21],knock:[95,.29,.5],click:[380,.055,.14],phone:[730,.2,.075],dread:[49,2.8,.23],drip:[1250,.28,.08],slam:[66,.8,.5],metal:[850,.38,.065],motor:[38,1.6,.08],chime:[880,.65,.1],alarm:[650,1.1,.13]}[kind];
    o.type=kind==='metal'?'sawtooth':kind==='alarm'||kind==='click'?'triangle':'sine';o.frequency.setValueAtTime(settings[0],t);o.frequency.exponentialRampToValueAtTime(Math.max(24,settings[0]*.45),t+settings[1]);
    if(kind==='alarm')o.frequency.exponentialRampToValueAtTime(950,t+.5);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(settings[2]*level,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+settings[1]);o.start(t);o.stop(t+settings[1]+.05);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
  }
  dispose(){this.stopVoices();void this.context?.close();this.context=null;this.master=null;this.noise=null;this.tv=null;this.voices={};this.haunt=null;this.weather=null;this.hauntLevel=-1;}
}
