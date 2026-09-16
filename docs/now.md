# NOW — 현재 상태와 다음 작업

## 사용자 확정과 실제 확인 (2026-09-17)
- 승인 범위: PRODUCT의 로컬 개인용 15화면 전체. React+TypeScript, 승인 HTML의 DOM/CSS 보존. README/쉽게 보는 안내는 추후 ELI5 방식으로 별도 작업.
- 검증 후 총괄의 origin/develop push 허용. main push/merge, 배포, 실제 자료 삭제, 자동 시작 등록, Slack 실제 전송은 별도 승인.
- 최신 정정: Google CLI 검색 성공 이력은 없음. 사용자는 PowerShell에서 agy 실행 후 로그인했다고 알림. 기존 인계서의 검색 3건 성공은 확인된 사실로 사용하지 않는다.
- 호스트 Docker 29.6.2 엔진 정상. Codex 0.154.0-alpha.6.2, ChatGPT 로그인 및 사용자 config gpt-6-astra/medium 확인. agy/gemini는 현재 PATH에서 찾지 못해 조사 중.

## 이번 구현과 실행 증거
- 원격 이력 없음 확인. 로컬 main 기준 c53518c 보존 후 develop 생성. origin은 https://github.com/BapEgg/job-callender.git. main은 push하지 않음.
- React 19.3.0 / TypeScript 7.0.2 / Vite 8.3.0. 원본을 그대로 JSX로 이식하기 쉬운 최소 프런트 빌드. API/PostgreSQL/host runner 경계는 PRODUCT 유지.
- 공통 셸+home/jobs/write/a1 구현. 원본 CSS 내용 완전 동일, SVG 실제 JSX. 필터/관심/문항/편집/분량/화면 이동 입력 유지/미연결 안내가 React 상태로 동작.
- 현재 앱은 격리 fixture 개발 화면. DB 영구 저장·실제 계정·AI/Slack 성공이 아님. 새로고침하면 fixture로 초기화됨.
- 원본 SHA256 f1e964ee2428e8e5da3505b313661639495a746dd9015767200b4e6bb13f3619 유지.
- Edge/Windows, DPR1, 900px 높이, 1440/1280/768/390px 원본 12세트. tests/visual/baseline에 원본 PNG/metadata/독립 SHA manifest 보존. 실제/차이/보고서는 artifacts/visual (git 제외).
- node node_modules/typescript/bin/tsc --noEmit 및 node node_modules/vite/bin/vite.js build 통과.
- node scripts/visual.mjs 12/12 통과: 원본/실제/차이, viewport, 영역 픽셀 및 정확 geometry 검사.
- 독립 QA: 12개 새 캡처가 통과 actual과 변경 픽셀 0, geometry 일치, pageerror 0. 초기 UI gate PASS. artifacts/qa/final-visual-results.json.
- 독립 상호작용 7그룹 통과: 검색/관심, 화면·문항 입력 보존, 499/500/700/701·emoji, 미연결 생성 입력 보존, focus/Tab/Escape, 390px 넘침. node scripts/test-interactions.mjs로 재현.
- 예외 문구: .page-note 탭 유지 안내, #save-state 탭 유지 상태, .editor-actionbar+p AI 미연결 설명. 정확 문자열 검사와 텍스트 Range만 diff 제외. raw 이미지 및 CSS/geometry 검사 유지.

## 실제 위임과 설정
- product_review: 초기 제품 읽기 전용 검토 후 ui_implementer 역할로 src/**/index.html 단독 작성.
- design_review: 초기 디자인 읽기 전용 검토 후 qa_security 독립 시험. 제품 코드 수정 없음.
- 동시 하위 최대 2명. .codex/agents의 4역할은 공식 standalone TOML, Astra/Medium. TOML 구문 확인. 설치 CLI strict-config는 features/schema 명령에서 미지원이므로 자동 탐색 검증과 혼동하지 않음. 실제 위임은 현재 세션 도구로 실행.

## 단계별 상태 — 최종 범위 유지
| 단계 | 범위 | 상태 |
|---|---|---|
| M0 | 환경/Git/역할/원본 기준/기술 조사 | 초기 완료, Google CLI 조사 중 |
| M1a | 공통 셸+핵심 3화면 React 시각 gate | 구현·비교·독립 QA 통과 |
| M1b | Compose 웹/DB·실제 인증·작업 API·공고→문항→제출본→질문 | 미구현 |
| M2 | 나머지 화면·실제 CRUD·파일·버전·기업자료·전형·일정 | 미구현 |
| M3 | KST 00시/복귀 1회·중복 방지·Slack 두 알림·장애 처리 | 미구현 |
| M4 | 전체 시각/보안/backup·restore/개인용 인수 | 미구현 |
| 이후 | Vercel/외부 DB/타인 공개 | v1 제외 |

## 다음 작업 하나
초기 develop push 후 Compose/API 영속 저장과 나머지 15화면 범위를 이어간다. 실제 사용자 프로필/공고, DB/CLI 연계, 구독 검색 가능성, Webhook, 예약, backup/restore는 아직 미검증.
