# Self-hosted mission note handwriting

Downloaded on 2026-11-05 from the official Google Fonts repository and LXGW upstream. All four fonts are SIL Open Font License 1.1; exact licenses are preserved beside this document and in `public/fonts/` so static distributions include the notices. Original copyright/license name-table entries remain embedded. Modified subsets use distinct family names. No third-party font request is made at runtime.

| Language | Bundled WOFF2 | CSS family | Original source |
| --- | --- | --- | --- |
| English | `mission-caveat.woff2` | `Mission Caveat` | [Caveat variable TTF](https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf), instantiated at weight 400 |
| Korean | `mission-nanum-pen.woff2` | `Mission Pen Script` | [Nanum Pen Script](https://raw.githubusercontent.com/google/fonts/main/ofl/nanumpenscript/NanumPenScript-Regular.ttf) |
| Japanese | `mission-klee-one.woff2` | `Mission Klee One` | [Klee One Regular](https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/KleeOne-Regular.ttf) |
| Simplified Chinese | `mission-wenkai.woff2` | `Mission WenKai` | [LXGW WenKai Regular](https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/fonts/TTF/LXGWWenKai-Regular.ttf) |

Declare each using a local `@font-face` source, weight 400, normal style, and `font-display: swap`. Use the project's base-path helper for font URLs when publishing beneath an itch.io directory.

Suggested font-family stacks:

- English: `"Mission Caveat", "Mission Klee One", "Mission WenKai", cursive`
- Korean: `"Mission Pen Script", "Mission Klee One", "Mission WenKai", cursive`
- Japanese: `"Mission Klee One", "Mission WenKai", cursive`
- Simplified Chinese: `"Mission WenKai", "Mission Klee One", cursive`

Caveat and Nanum Pen Script do not themselves include all punctuation, arrows, or source-title Hanja. The bundled handwritten fallback faces retain those characters. All current Korean source keys and localized values in `lib/locales/*.json`, ASCII, and a small extra punctuation set were checked by Unicode cmap after reopening the generated WOFF2 files. Every required character is covered by its suggested stack. This is a glyph-coverage check, not a visual readability or browser-layout certification. New copy outside the retained character set requires regeneration; these are intentionally not full general-purpose CJK fonts.

`mission-font-manifest.json` records source/output SHA-256 hashes, sizes, cmap counts, and fallback coverage. Original TTF files and the local Python environment are kept only in ignored `work/mission-fonts/`, not shipped. `subset-mission-fonts.py` documents the exact local conversion with fontTools 4.68.0 and Brotli 1.2.1. From repository root, with original files downloaded to the paths above, rerun:

```
work/mission-fonts/venv/bin/python docs/fonts/subset-mission-fonts.py
```

Original license URLs:

- https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/nanumpenscript/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/OFL.txt
- https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/OFL.txt
