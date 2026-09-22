import numpy as np, wave
from pathlib import Path
rate=32000; bpm=126; beat=60/bpm; duration=beat*64; n=int(round(duration*rate));rng=np.random.default_rng(317)
t=np.arange(n)/rate
layers=np.zeros((2,n),dtype=np.float64)
def place(sound,start,pan=0,level=1):
    k=int(start*rate); ids=(np.arange(len(sound))+k)%n
    for ch,g in [(0,np.sqrt((1-pan)/2)),(1,np.sqrt((1+pan)/2))]:np.add.at(layers[ch],ids,sound*g*level)
def note(hz,length,kind='strings'):
    u=np.arange(int(length*rate))/rate
    env=(1-np.exp(-u/(.085 if kind=='strings' else .035)))*np.exp(-u/(length*.36))
    sound=np.zeros(len(u))
    for detune in [-.006,-.002,.003,.007]:
        phase=2*np.pi*hz*(1+detune)*u+.019*np.sin(2*np.pi*5.6*u)
        for h in range(1,10 if kind=='strings' else 7):sound+=np.sin(phase*h)/(h**(1.25 if kind=='strings' else 1.05))
    return sound/5*env
# Low cello ostinato with a displaced semitone: tension rather than a triumphant tune.
for i in range(128):
    hz=[55,55,58.27,55,73.416,55,51.913,55][i%8]
    place(note(hz,beat*.8),i*beat/2,(-.4 if i%2 else .4),.18 if i%4 else .24)
# Broad, detuned bowed strings / muted brass clusters across the stereo field.
for bar in range(16):
    base=[55,51.913,58.27,55][bar%4]
    for voice,(mul,pan) in enumerate([(2,-.8),(2.019,.8),(3,-.4),(4.237,.4)]):
        place(note(base*mul,beat*4.6,'brass'),bar*beat*4,pan,.17 if voice<2 else .07)
# Deep drum hits, rolling toms, metallic scrapes. No real-time synthesis on the game thread.
for i in range(64):
    u=np.arange(int(rate*1.1))/rate
    phase=2*np.pi*(45*u+62*.027*(1-np.exp(-u/.027)))
    drum=np.sin(phase)*np.exp(-u/ .25)+.19*rng.normal(size=len(u))*np.exp(-u/.013)
    if i%4 in [0,2]:place(drum,i*beat,0,.48 if i%4==0 else .34)
    if i%4==3:
        for j in range(3):place(note(88+j*21,beat*.4,'brass'),(i+j/3)*beat,(-.5+j*.5),.15)
    if i%2:
        u=np.arange(int(rate*.16))/rate;noise=rng.normal(size=len(u));noise-=np.convolve(noise,np.ones(25)/25,mode='same');place(noise*np.exp(-u/.035),i*beat+.02,(-.6 if i%4==1 else .6),.034)
# Reverb with decorrelated early reflections, wrapping keeps the exported loop seamless.
wet=layers.copy()
for delay,gain in [(.071,.16),(.139,.12),(.227,.09),(.383,.075),(.617,.065),(.971,.045), (1.337,.025)]:wet+=np.roll(layers[::-1],int(delay*rate),axis=1)*gain
wet=np.tanh(wet*1.5);wet*=.82/max(.82,float(abs(wet).max()))
fade=np.linspace(0,1,160);wet[:,:160]*=fade;wet[:,-160:]*=fade[::-1]
p=Path(__file__).resolve().parents[1]/'public/audio/chase-score.wav'
with wave.open(str(p),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes((wet.T*32767).astype('<i2').tobytes())
print({'seconds':n/rate,'peak':float(abs(wet).max()),'rms':float(np.sqrt(np.mean(wet**2))), 'loop_step':float(abs(wet[:,0]-wet[:,-1]).max()),'bytes':p.stat().st_size})
