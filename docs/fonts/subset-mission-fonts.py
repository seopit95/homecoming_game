import json,pathlib,hashlib
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
root=pathlib.Path('.')
chars={x:set(map(chr,range(32,127))) for x in ('ko','en','ja','zh-CN')}
for p in sorted(root.glob('lib/locales/*.json')):
 for key,values in json.loads(p.read_text()).items():
  chars['ko'].update(key)
  if isinstance(values,dict):
   for lang,text in values.items():
    if lang in chars and isinstance(text,str): chars[lang].update(text)
# Common mission note punctuation is retained even before copy lands in catalogs.
for c in chars.values(): c.update('·–—…←↑→↓▶「」『』〈〉《》“”‘’•※✓×：；，。！？（）【】［］｜')
configs=[('en','caveat','mission-caveat','Mission Caveat'),('ko','nanum','mission-nanum-pen','Mission Pen Script'),('ja','klee','mission-klee-one','Mission Klee One'),('zh-CN','wenkai','mission-wenkai','Mission WenKai')]
all_missing=set()
for lang,src,stem,family in configs[:2]:
 f=TTFont(f'work/mission-fonts/{src}.ttf'); all_missing|={ord(c) for c in chars[lang] if not c.isspace()}-f.getBestCmap().keys()
report=[]
for lang,src,stem,family in configs:
 source=pathlib.Path(f'work/mission-fonts/{src}.ttf'); font=TTFont(source)
 if 'fvar' in font: font=instantiateVariableFont(font,{'wght':400},inplace=True)
 wanted={ord(c) for c in chars[lang] if c not in '\n\r\t'}
 if lang in ('ja','zh-CN'): wanted|=all_missing
 available=set(font.getBestCmap()); selected=wanted&available
 options=subset.Options(); options.flavor='woff2'; options.name_IDs=['*']; options.name_legacy=True; options.name_languages=['*']; options.layout_features=['*']
 sub=subset.Subsetter(options=options); sub.populate(unicodes=selected); sub.subset(font)
 for name in list(font['name'].names):
  replacements={1:family,2:'Regular',3:family+' Regular 2026-11-05',4:family+' Regular',6:family.replace(' ','')+'-Regular',16:family,17:'Regular'}
  if name.nameID in replacements: font['name'].setName(replacements[name.nameID],name.nameID,name.platformID,name.platEncID,name.langID)
 font.flavor='woff2'; target=root/'public/fonts'/f'{stem}.woff2'; font.save(target)
 reopened=TTFont(target); assert selected<=reopened.getBestCmap().keys()
 report.append({'language':lang,'file':str(target),'family':family,'bytes':target.stat().st_size,'glyphCodepoints':len(reopened.getBestCmap()),'missingInOwnFont':''.join(chr(c) for c in sorted(wanted-available)),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
fallback=TTFont('public/fonts/mission-klee-one.woff2').getBestCmap().keys()|TTFont('public/fonts/mission-wenkai.woff2').getBestCmap().keys()
for row in report:
 own=TTFont(row['file']).getBestCmap().keys(); needed={ord(c) for c in chars[row['language']] if not c.isspace()}; row['missingWithHandwrittenFallback']=''.join(chr(c) for c in sorted(needed-own-fallback))
pathlib.Path('docs/fonts/mission-font-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
