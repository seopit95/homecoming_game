# Realism audio assets — 2026-09-23

Ready-to-copy files: `male-pant-loop.wav` and `no.wav`. Both are mono, 44,100 Hz, signed 16-bit PCM WAV. Keep the existing game master/effects volume limits.

## Male recovery breathing

`male-pant-loop.wav`: 5.000 seconds, peak −9.00 dBFS, RMS −30.48 dBFS, zero clipped samples.

Source: **Breathe Running** by **SPAudiobooks**, Freesound sound 843335. The uploader describes a man puffing/panting while running, recorded in a booth with a Blue Yeti. The source page identifies **CC0 1.0**, permitting copying, editing and redistribution, including commercial use.

- Source and license evidence: https://freesound.org/people/SPAudiobooks/sounds/843335/
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Downloaded public HQ MP3 preview: https://cdn.freesound.org/previews/843/843335_16019975-hq.mp3

Production: decoded the preview with macOS `afconvert` to mono PCM; used 10.25–15.45 seconds; applied a gentle smooth 65 Hz high-pass and 11 kHz low-pass response; overlapped the quiet first/last 200 ms using a complementary linear crossfade; peak normalized to −9 dBFS. The resulting loop is exactly 220,500 samples. No TTS or artificial breath synthesis is used. The compressed preview limits source fidelity.

## Ghost refusal

`no.wav`: 3.200 seconds, peak −6.00 dBFS, RMS −21.19 dBFS, zero clipped samples. Intended words: **“안 돼! 안 돼!”**.

Speech was synthesized locally using **MyShell.ai MeloTTS-Korean**, official model **MIT** license, via **gnyong/melotts-kr-onnx**, also MIT. It uses the built-in KR speaker, without voice cloning or a supplied person's reference voice.

- Official model/card: https://huggingface.co/myshell-ai/MeloTTS-Korean
- Official library/license: https://github.com/myshell-ai/MeloTTS/blob/main/LICENSE
- ONNX conversion: https://huggingface.co/gnyong/melotts-kr-onnx
- Fixed ONNX revision: `145bb692add83629213f0d847a282a1ea752c371`
- Model file: `melotts_kr_fp32.onnx`

Speech production: decompose the fixed Hangul syllables “안돼!안돼!” into NFD jamo, prepend/append `_`, use the official model's symbol IDs, blank interleaving, KR language ID 4, KR tone offset 11, speaker 0, zero BERT inputs, `noise_scale=0.60`, `length_scale=0.96`, `noise_scale_w=0.65`, `sdp_ratio=0.20`, ONNX Runtime seed 23. This fixed-line phoneme path is not a general Korean pronunciation frontend. The dry intermediate is retained as `sources/no-dry.wav`.

Trimmed padding, raised pitch/playback speed 7.5%, filtered at 100 Hz/9.5 kHz, applied smooth saturation and short echoes at 71/131/223/337 ms. Added the existing CC0 female scream at a restrained 0.18 pre-normalization mix level near the second phrase's tail. Applied 55 ms edge fades and final peak normalization to −6 dBFS.

Scream layer source: **woman scream.wav** by **starnezio**, **CC0 1.0**, https://freesound.org/people/starnezio/sounds/609973/ . The uploader describes a theatre cast performance and states permission to upload under Creative Commons. Reused the project's `female-collision-scream.wav`, already derived from the source preview (0.10–1.75 seconds). The performer is not identified or imitated.

Limitations: the Korean words are synthetic speech with horror processing and a separate acted scream layer, not a newly recorded Korean actor shouting the line. Emotional naturalness and final intelligibility need listening review in the actual game mix. No subjective listening verification is claimed. This is the provided synthetic approximation of the requested emphatic performance.

## Verification and provenance

Both outputs reopened with Python `wave`, had finite/nonzero signal, exact expected frame counts, one channel and 16-bit sample width. Both decoded successfully again with macOS `afconvert`. Amplitude and SHA-256 checks are in `audio-qa.json`. The pant seam uses a crossfade; its final/first adjacent sample step is approximately 0.00156 full scale (−56.2 dBFS), within the natural sample transitions of the recording. Runtime gain should fade the loop in/out when recovery starts/ends.

Reproduction: `make_audio.py` uses NumPy and the locally installed ONNX Runtime under `.tts-packages`; source/model downloads remain in `sources`. The generated WAV files do not require the model or a network service at runtime. Only the two final WAVs plus this credit/license documentation need to be copied to the game.

Existing-project note: Apple system-voice terms describe personal, non-commercial restrictions, including public sharing restrictions (macOS Tahoe §2F: https://www.apple.com/legal/sla/docs/macOSTahoe.pdf). Existing Yuna/Eddy/Kyoko project assets were outside this task and have not been replaced. Neither new output uses an Apple system voice.

## MeloTTS MIT license notice

Copyright (c) 2024 MyShell.ai

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.