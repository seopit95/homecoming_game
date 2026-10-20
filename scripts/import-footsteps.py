"""Build the small PCM bank from a supplied official Kenney Impact Sounds ZIP.
Usage: python3 scripts/import-footsteps.py /path/to/kenney_impact-sounds.zip
Requires macOS afconvert. Original samples and licence are CC0.
"""
import array,hashlib,json,subprocess,sys,tempfile,wave,zipfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1]);pack=zipfile.ZipFile(archive)
out=root/'public/audio/footsteps';out.mkdir(parents=True,exist_ok=True)
bank=array.array('h');index={};sources=[];rate=24000
for family,prefix in [('wood','footstep_wood'),('concrete','footstep_concrete'),('metal','impactMetal_light'),('wet','footstep_snow')]:
 index[family]=[]
 for variant in range(4):
  name=f'Audio/{prefix}_{variant:03}.ogg';original=pack.read(name)
  with tempfile.TemporaryDirectory() as folder:
   source=Path(folder)/'source.ogg';dest=Path(folder)/'decoded.wav';source.write_bytes(original)
   subprocess.run(['afconvert','-f','WAVE','-d',f'LEI16@{rate}','-c','1',str(source),str(dest)],check=True,capture_output=True)
   with wave.open(str(dest)) as sound:
    assert sound.getnchannels()==1 and sound.getsampwidth()==2 and sound.getframerate()==rate
    samples=array.array('h',sound.readframes(sound.getnframes()))
  active=[i for i,x in enumerate(samples) if abs(x)>100];assert active,name
  samples=samples[max(0,active[0]-48):min(len(samples),active[-1]+240)];peak=max(map(abs,samples))
  for i,x in enumerate(samples):
   fade=min(1,i/36,(len(samples)-1-i)/192);samples[i]=round(x/peak*.72*32767*max(0,fade))
  index[family].append({'offset':len(bank)/rate,'duration':len(samples)/rate});bank.extend(samples);bank.extend([0]*240)
  sources.append({'family':family,'source':name,'sourceSha256':hashlib.sha256(original).hexdigest()})
with wave.open(str(out/'bank.wav'),'wb') as sound:sound.setnchannels(1);sound.setsampwidth(2);sound.setframerate(rate);sound.writeframes(bank.tobytes())
(root/'lib/footstep-bank.json').write_text(json.dumps(index,indent=2)+'\n')
(out/'License.txt').write_bytes(pack.read('License.txt'))
(out/'sources.json').write_text(json.dumps({'author':'Kenney','license':'CC0-1.0','page':'https://kenney.nl/assets/impact-sounds','archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bankSha256':hashlib.sha256((out/'bank.wav').read_bytes()).hexdigest(),'processing':'24kHz mono PCM, trimmed, peak-normalized with faded edges; wet layer uses snow/slush foley; metal layer uses light metal impacts','samples':sources},indent=2)+'\n')
print(json.dumps({'samples':len(sources),'bytes':(out/'bank.wav').stat().st_size,'seconds':len(bank)/rate}))
