# 첫 접속 로딩 측정과 로컬 개선 · 2026-10-29

기준 소스는 `49d66e5` / `codex/reference-ghost`, 공개본은 V135이다. 운영 배포나 원격 소스 push는 하지 않았다.

## 실측

| 대상 | 시작 메뉴 표시까지 3회(초) | 중앙값 |
| --- | --- | --- |
| 운영 V135 | 35.247 / 8.437 / 8.446 | 8.446초 |
| 수정 전 로컬 배포용 빌드 | 4.263 / 4.210 / 4.201 | 4.210초 |
| 수정 후 로컬 배포용 빌드 | 4.356 / 3.989 / 3.969 | 3.989초 |

이 Mac의 로컬 중앙값은 0.222초(5.3%) 감소했다. 그래픽 준비 단계 중앙값은 3.003→2.800초이다. 운영은 수정 전만 측정했으므로 운영 개선 수치로 해석하지 않는다. 초기 운영 35.247초 표본도 제외하지 않았다.

조건: 매회 새 테스트 Chrome 프로세스/프로필, headless Chrome + Metal WebGL, 1280×800, DPR 1. CDP `Network.clearBrowserCache`, `setCacheDisabled(true)`, `setBypassServiceWorker(true)`, 서비스 워커 차단 및 GPU shader disk cache 비활성화. 인위적인 네트워크/CPU 제한은 없다. 모든 주 측정에서 캐시 응답, 요청 실패, 페이지 오류는 0이다. OS/GPU 드라이버 캐시까지 초기화한 실험은 아니며, 광범위한 기기 성능을 보증하지 않는다. 측정 중 다른 테스트/빌드는 실행하지 않았다.

개선 폭이 작아 동일한 수정 후 번들에서 진단을 켠 경우/끈 경우를 교대로 3쌍 추가 측정했다. 양쪽 모두 동일한 요청 가로채기와 응답 전달을 사용했다. 켬은 4.580 / 4.265 / 4.283초, 끔은 4.102 / 4.073 / 4.135초로 세 쌍 모두 단축됐다. 중앙값 차이는 0.181초(4.2%)이다. 이 비교는 전달된 JS가 압축 해제된 테스트 응답이므로 주 측정의 절대 시간/바이트와 섞지 않는다.

## 병목과 변경

초기 요청량은 약 54.09MB이다. 로컬 표본의 구성은 질감 37.90MB, 시설 모델 질감 2.91MB, 음향 9.80MB, JS/CSS 등 3.47MB다. 음향 요청 전체를 시작 메뉴가 기다린다는 의미는 아니다. 모든 실제 맵과 차량 장면의 준비도 시작 전에 유지된다.

CPU 프로파일에서 Three.js `WebGLProgram.onFirstUse`의 진단 경로에 약 666ms의 표본이 모였다. 기존 시작은 `getProgramInfoLog`/`getShaderInfoLog`를 합계 1,080회 읽었다. 이 전체 시간이 제거 가능한 비용은 아니며, GPU 프로그램 준비 자체는 여전히 필요하다.

`lib/game.ts`에서 렌더러 생성 직후 `renderer.debug.checkShaderErrors = process.env.NODE_ENV !== 'production'`를 설정했다. 운영용 번들은 이 값을 `false`로 치환하며 실제 GPU 로그 읽기는 0회가 됐다. 개발/테스트에서는 진단을 유지한다. 사전 셰이더 준비, 맵 캐시, 질감, 모델, 음향, 입력, 저장, 이야기와 게임 타이밍은 변경하지 않았다. 운영 셰이더 진단 로그가 생략되는 점은 이 변경의 의도된 제한이다.

가장 큰 4.55MB 질감의 무손실 WebP 변환도 시험했으나 6.10MB로 커져 채택하지 않았다. 초기 다운로드량을 줄였다고 주장하지 않는다.

## 검증

- 새 운영/개발 진단 설정 검사: 수정 전 운영 검사 RED(기대 false, 실제 true), 수정 후 두 경우 GREEN.
- 시작 준비/셰이더 배치/이탈 중 자원 수명/캐시 재시작 및 V135 실제 첫 승강기·최종 충돌 입력을 포함한 한정 게임 검사: 8/8 통과.
- 실제 제목 TSX의 로딩/메뉴/저장/오류/설정, 기존 다운로드 힌트, 머리카락 초기 요청 검사: 6/6 통과.
- TypeScript `tsc --noEmit --incremental false` 및 Sites `build-site.mjs`: 성공.
- 로컬 배포용 빌드의 실제 WebGL: HTTP 200, 설정 열기/복귀, 새 게임 도입 진입 성공. 진단 켬/끔 모두 페이지·콘솔·HTTP 오류 0, WebGL error 0.
- 같은 초기 난수와 정지된 도입 시점을 사용한 실제 화면 비교: 1280×800의 1,024,000픽셀 모두 동일. 테스트 화면 고정은 제품 코드에 포함하지 않았다.
- 제한 독립 코드 검토: 차단 사항 없음. 제안된 테스트 환경 변수 복원 경로 보완을 반영했다.

이전 전체 `game.test.mjs`를 일괄 실행하면 과거 경로/현재 계단 관련 실패가 있어 전체 합격을 주장하지 않는다. V122 모퉁이 재시작, V120 승강기 이후 계단 진입, V133 네 층 하강의 세 실패는 변경 전 `49d66e5`를 별도 디렉터리에 추출해 똑같이 재현했다. 해당 기존 실패를 고치거나 기대값을 완화하지 않았다. 광범위한 실행은 중단하고 변경 범위 및 현재 V135 검사를 분리했다. 이 작업은 전체 신규 플레이/모든 GPU/모든 계단 동선의 재검증이 아니다.

## 증거와 재현

증거 디렉터리: `/Users/kds_mac/Documents/Codex/2026-10-29/task-2/`.

- `measure-loading.mjs`, `compare-loading.mjs`, `smoke-loading.mjs`: 실제 측정/비교/화면 검증 도구.
- `production-before.json`, `local-before.json`, `local-after.json`, `measurement-summary.json`: 전체 리소스 및 단계별 타이밍.
- `paired-on-{1,2,3}.json`, `paired-off-{1,2,3}.json`: 교대 비교.
- `local-profile-cpu.json`, `local-readbacks-before.json`: CPU 및 진단 읽기 기준값.
- `final-game-checks.txt`, `boot-ui-checks.txt`, `type-check.txt`, `build-check.txt`: 최종 한정 검사.
- `legacy-baseline-check.txt`, `stair-baseline-check.txt`: 변경 전의 기존 실패 재현.
- `smoke-loading.json`, `pixel-comparison.json`, `smoke-diagnostics-{true,false}.png`: 실제 WebGL 및 동일 화면.

Node 24.19.0 및 이미 설치된 Three.js 0.180.0/기존 의존성을 사용했다. 테스트의 기존 Node module mocking 실험/사용 중단 경고와 빌드의 기존 큰 chunk 경고는 남아 있다.

## 운영 반영 상태

운영 배포는 상위 작업의 자동 승인 검토에서 거절된 상태로 전달받았다. 구체적인 거절 사유는 전달받지 못했으며 여기서 재시도하지 않았다. 공개 V135에는 이 수정이 적용되지 않았다.

배포하려면 거절 사유 해결과 새 승인 근거가 먼저 필요하다. 이후 같은 Site ID와 공개 접근 설정을 유지하고, 최신 source credential 및 기존 Sites workflow helper로 이 로컬 커밋을 동기화·빌드·패키징한 다음 `save_site_version` / `deploy_site_version`과 최종 배포 상태를 확인해야 한다. 현재 수정은 로컬 커밋으로만 보관한다.
