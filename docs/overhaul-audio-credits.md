# Horror audio asset provenance

All selected source recordings are offered under CC0 1.0 on the linked Freesound source pages. Attribution is optional under CC0; credits are included for provenance.

Downloaded publicly exposed Freesound high-quality MP3 preview assets. Original full-quality WAV/FLAC downloads require an account, so delivered WAVs are decoded/edited from compressed MP3 previews. No login, signup, paid assets, video extraction, TTS, or external generation API was used.

## Ready-to-use clips

- `male-surprise.wav` — 0.67s, 44100 Hz, 1 channel(s), peak -6.0 dBFS. Excerpt 1.35–2.02 seconds, short edge fades, peak normalized to -6 dBFS.
- `female-collision-scream.wav` — 1.65s, 44100 Hz, 1 channel(s), peak -6.0 dBFS. Excerpt 0.10–1.75 seconds, short edge fades, peak normalized to -6 dBFS.
- `phone-ring.wav` — 9.00s, 48000 Hz, 2 channel(s), peak -8.0 dBFS. Excerpt 0.00–9.00 seconds, short edge fades, peak normalized to -8 dBFS.
- `collision-impact.wav` — 2.76s, 44100 Hz, 1 channel(s), peak -4.0 dBFS. Excerpt 0.54–3.30 seconds, short edge fades, peak normalized to -4 dBFS.
- `radio-tuning-broadcast.wav` — 12.00s, 48000 Hz, 1 channel(s), peak -8.0 dBFS. 12 seconds of original tuning/static; original voice excerpt 1.0–6.2 seconds mixed at 2.4 seconds, edge fades and peak normalization. Voice is deliberately unintelligible; this is a staged radio sound, not an actual station broadcast.

## Source credits

- [surprise_gasps.wav](https://freesound.org/people/esperar/sounds/171942/) by **esperar**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Uploader describes a man gasping in surprise for an animated training video. Selected one nonverbal gasp; no Korean words. Performer age is not independently documented.
- [woman scream.wav](https://freesound.org/people/starnezio/sounds/609973/) by **starnezio**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Original theatre cast member recording; source explicitly says the actor granted Creative Commons upload permission. Selected the scream and decay. Performer age is not independently documented.
- [Phone Old Landline Ringing](https://freesound.org/people/robotjay/sounds/275163/) by **robotjay**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Original recording of a circa-1990s Telecom NZ landline, recorded with a Zoom H4n. Selected three approximately 3-second ring cycles for looping.
- [radio_static.wav](https://freesound.org/people/jascha23/sounds/161083/) by **jascha23**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Uploader says static/tuning was synthesized from scratch with SuperCollider; not a station broadcast.
- [Unintelligible Radio Chatter](https://freesound.org/people/unfa/sounds/245660/) by **unfa**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Uploader explicitly identifies the recording as their own voice, processed with Audacity. Intentionally distorted and unintelligible.
- [body impact metal clang cabbage thrown at a bin.wav](https://freesound.org/people/vestibule-door/sounds/669685/) by **vestibule-door**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Foley: cabbage thrown at a metal bin, Zoom H2n recording, edited by uploader; no real collision or injury recording.

## Quality notes

- These are recorded human reactions, not speech synthesis. The male sound is a nonverbal gasp; no Korean spoken line is included.
- Female performance is theatrical terror; shorten playback in the game if a briefer startled yelp is preferred.
- Radio voice is processed original speech, deliberately hard to understand; it does not contain a licensed station broadcast.
- Collision is a foley approximation of a body/metal impact, with a metallic decay, not a literal car-versus-pedestrian recording.
- WAV conversion does not restore detail lost in the MP3 preview source.
- All six source MP3 files decoded successfully with macOS afconvert; all five output WAVs reopened with Python wave, had nonzero signal and duration, and were decoded again by afconvert. Metadata and checksums below. No subjective listening verification is claimed.
