# 여성 성우 흐느낌 · 로컬 검증

사용자 요청에 따라 기존 합성 울음 경로를 여성 성우의 울음 연기 파일로 교체했다. 공개 배포·외부 업로드는 하지 않았다.

원본은 JeanMyna_VA / Jean Myna의 [Crying female low tone Voice Over | Vocal sound for character](https://opengameart.org/content/crying-female-low-tone-voice-over-vocal-sound-for-character). 공식 작가 게시물은 RAW 여성 Voice Over로 소개하며 CC BY3.0과 작가 크레딧을 명시한다. [CC BY3.0](https://creativecommons.org/licenses/by/3.0/)은 상업적 재배포·편집을 허용한다. 작품명·작가·원본·라이선스 링크·변경 내역을 `public/audio/ghost-v136/LICENSE.txt`, `sources.json`, `docs/assets.md`, 실제 게임 후일담 크레딧에 남겼다. 무단 스크래핑·로그인 우회·음성 합성은 하지 않았다.

- 새 경로 `/audio/ghost-v136/female-sob.wav`:24kHz mono PCM16,5.566917초,267,256바이트. 기존 브라우저 캐시가 `/audio/cry.wav`를 재사용하지 않는다.
- 원본 전체 연기를 유지하고 리샘플링·5ms/15ms 가장자리 페이드·약−0.10dB gain만 적용했다. 이전 파일과 RMS는−22.9529dBFS로 일치하며 출력 sample peak−4.5686dBFS, 클리핑0이다. peak는 기존 파일보다 높지만 디지털 범위 안이며 기존 gain/mix 경로를 보존한다.
- 재생 속도1과 벽이 없을 때6kHz 필터로 실연의 호흡을 유지했다. 차폐650Hz,거리/가림에 따른 level,스테레오 pan,기존 .64×level과 voice/master 음량,230ms/22% 방 반향은 유지했다. `game.ts`의 울음 발생 조건과 반복 간격은 바꾸지 않았다. 무한 루프 파일이 아니라 기존 사건/순찰 호출에 한 번씩 재생하는 방식이다.

증거 폴더: `/Users/kds_mac/Documents/Codex/2026-10-29/task-2/`.

- `female-sob-red.txt`:새 경로 검사가 변경 전 실패. `female-sob-tests.txt`:9/9, 자연 속도·재생 중 교체/정리·차폐·pan·음량·일시정지·기존 HRTF/거리·독립된 녹음 경로 검사 통과.
- `female-sob-types.txt`:TypeScript 성공. `female-sob-build.txt`:Sites 로컬 빌드 성공.
- `female-sob-browser-result.json`:실제 게임의 기존 radio→listen 트리거를 데스크톱1280×800 및 터치 모바일390×844 Chrome에서 실행했다. 양쪽 모두 새 경로를 디코드하고 재생,속도1,loop=false,AudioContext running,같은 거리gain/pan/벽필터650Hz를 확인했다. 분석 노드의 출력 RMS 최대값 약0.0186/0.0184로0이 아니며 일시정지·재개도 통과했다. 이전 cry.wav 요청 없음,페이지/HTTP오류0. 이는 실제 iOS/Safari 기기 검증이 아니다.
- 추가 읽기 전용 검토에서 원본 작가/라이선스·편집 내역 표기와 출력 해시가 일치함을 확인했다.

직접 청취의 제한: 이 실행 환경의 모델은 오디오 입력을 지원하지 않아 `audio-sob-research/qa-listen.ogg`를 직접 듣는 시도는 수행되지 않았다. 따라서 주관적인 자연스러움과 녹음 현장 진위까지 독립적으로 확인했다고 주장하지 않는다. 성우가 공개한 원본의 설명/작가 정보/메타데이터는 일치하며, 디코드된 실제 파형과 게임 출력 신호를 검증했다. 합성 대체음을 실제 녹음이라고 부른 변경은 없다.
