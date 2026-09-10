// All sounds are generated locally; the master gain bounds their combined level.
export class HorrorAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  noise: AudioBuffer | null = null;
  tv: GainNode | null = null;
  volume = .42;
  start() {
    if(this.context){void this.context.resume();return;}
    const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.volume*.48;this.master.connect(ctx.destination);
    const noise=this.noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const data=noise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    // Distant rain and ventilation stay quiet underneath positional sounds.
    for(const [hz,level] of [[650,.07],[2300,.018]]){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noise;src.loop=true;filter.type='lowpass';filter.frequency.value=hz;gain.gain.value=level;src.connect(filter);filter.connect(gain);gain.connect(this.master);src.start();}
    const tvSource=ctx.createBufferSource(),tvFilter=ctx.createBiquadFilter();this.tv=ctx.createGain();this.tv.gain.value=0;tvSource.buffer=noise;tvSource.loop=true;tvFilter.type='bandpass';tvFilter.frequency.value=950;tvFilter.Q.value=1.1;tvSource.connect(tvFilter);tvFilter.connect(this.tv);this.tv.connect(this.master);tvSource.start();
    for(const hz of [43,57.4,86.3]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=hz;g.gain.value=.015;o.connect(g);g.connect(this.master);o.start();}
  }
  setVolume(v:number){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v*.48,this.context!.currentTime,.1);}
  setTV(on:boolean){if(this.tv)this.tv.gain.value=on?.12:0;}
  pause(){void this.context?.suspend();}
  resume(){void this.context?.resume();}
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
  dispose(){void this.context?.close();this.context=null;this.master=null;this.noise=null;this.tv=null;}
}
