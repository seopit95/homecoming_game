"""Same-resolution WebP transfer copies. Requires Pillow; originals and licences remain authoritative."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib, io, json, math

root = Path(__file__).resolve().parents[1]
textures = root / 'public/textures'
out = textures / 'runtime'
out.mkdir(exist_ok=True)
manifest, records = {}, []
candidates = list((textures / 'pbr').glob('*')) + [textures / name for name in ['courtyard-night-sky-2k.jpg', 'environment-v3.webp', 'ghost-surfaces-v4.webp', 'hand-skin.webp']]
for source in sorted(candidates):
    if source.suffix not in ['.jpg', '.webp'] or source.stat().st_size < 300_000 or source.name.startswith('soil-'):
        continue
    image = Image.open(source)
    data_map = '-arm.' in source.name or '-normal.' in source.name
    chosen = None
    # Independent ARM channels stay lossless; normal maps require a tighter error budget.
    choices = [None] if '-arm.' in source.name else ([None, 100] if data_map else [96 if 'skin' in source.name or 'surfaces-v4' in source.name else 92])
    for quality in choices:
        stream = io.BytesIO()
        image.save(stream, format='WEBP', lossless=quality is None, quality=100 if quality is None else quality, method=6, exact=True, icc_profile=image.info.get('icc_profile', b''))
        data = stream.getvalue()
        decoded = Image.open(io.BytesIO(data))
        difference = ImageStat.Stat(ImageChops.difference(image.convert('RGB'), decoded.convert('RGB')))
        mse = sum(value * value for value in difference.rms) / 3
        psnr = 10 * math.log10(255 ** 2 / mse) if mse else 100
        if len(data) >= source.stat().st_size * .8 or psnr < (46 if data_map else 40):
            continue
        assert decoded.size == image.size
        if 'A' in image.getbands():
            assert ImageChops.difference(image.getchannel('A'), decoded.getchannel('A')).getbbox() is None
        if chosen is None or len(data) < len(chosen[0]):
            chosen = data, quality, psnr
    if chosen is None:
        continue
    data, quality, psnr = chosen
    relative = source.relative_to(textures).with_suffix('.webp')
    target = out / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    original = '/textures/' + source.relative_to(textures).as_posix()
    runtime = '/textures/runtime/' + relative.as_posix()
    manifest[original] = runtime
    records.append(dict(source=original, runtime=runtime, sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(), runtimeSHA256=hashlib.sha256(data).hexdigest(), sourceBytes=source.stat().st_size, runtimeBytes=len(data), width=image.width, height=image.height, lossless=quality is None, quality=quality, psnr=round(psnr, 3)))
(root / 'lib/runtime-textures.json').write_text(json.dumps(manifest, indent=2) + '\n')
(out / 'sources.json').write_text(json.dumps(dict(description='Transfer derivatives of the existing licensed game textures; unchanged resolution and alpha. Original source files and credits remain in place. ARM channels are lossless. Normal maps are lossless or PSNR>=46dB. Colour copies use PSNR>=40dB. Ghost face, printed text and phone cutout are unchanged.', encoder='Pillow 13.0.0 / libwebp', assets=records), indent=2) + '\n')
print(json.dumps(dict(files=len(records), before=sum(r['sourceBytes'] for r in records), after=sum(r['runtimeBytes'] for r in records))))
