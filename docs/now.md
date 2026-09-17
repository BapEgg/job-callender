# NOW — 현재 상태와 다음 작업

## 사용자 확정과 경계 (2026-09-17)
- 승인된 개인용 로컬 15화면/React+TypeScript 구현. 원본 HTML 재디자인 금지. README는 추후 ELI5 방식으로 쉽게 보는 별도 안내를 작성할 때 다룬다.
- 검증·비밀정보 검사 후 origin/develop 커밋/push 허용. main 반영/배포, 자료 삭제, OS 자동 시작 등록, 실제 Slack 전송은 별도 승인.
- 사용자 정정: Google 검색 성공 이력 없음. PowerShell agy 실행/로그인까지만 완료. 기존 검색 3건 성공 인계는 철회.
- 실제 사용자 경험은 아직 제공되지 않았다. 시험 계정/문항/공고는 모두 격리 fixture이며 실제 사용자 성과가 아니다.

## 구현과 기술 선택
- React 19.3 / TypeScript 7 / Vite 8.3. 원본 DOM/CSS/SVG를 JSX로 이식. 원본 CSS 내용 동일. iframe/raw HTML 주입 없음.
- Node HTTP + pg + PostgreSQL 18.6. 개인용 편집 상태는 소유자별 JSONB/revision/history로 보존하고 제출본·세션·파일·작업·알림은 별도 테이블로 강제한다. 화면 단위 잦은 저장과 불변 제출본을 작게 구현하기 위한 선택.
- Docker Compose 웹/API/DB. DB 외부 포트 없음, 웹은 loopback 3000. 시험은 별도 compose.test.yaml/DB/첨부 볼륨/3001. 실제 3000 계정은 사용자가 만든다.
- 일반 계정/scrypt/HttpOnly 세션/CSRF·origin 검사/속도 제한/소유자 격리. 최초 실제 계정 하나만 가입 가능.
- 15화면 라우팅, 기본·지원별 프로필, 공고/문항/경험/메모/일정/전형, 문항 분량, 변경 revision 충돌 보존, 확인 후 불변 제출본, 파일 보존, 버전 복원.
- 실제 모드는 빈 데이터부터 시작. 시안 검증은 ?fixture=1에서만 샘플 사용. 실제 개인 데이터는 PostgreSQL에 저장한다.
- AI 작업은 입력 revision 고정, lease/시도 token, 취소, 제한된 재시도, 결과 비교 후 명시 적용. 기존 초안은 적용 전 버전으로 남기고 이전 질문/답변은 추가 생성 시 보존.
- host runner는 임시 격리 cwd에서 CLI 실행. 개발 AGENTS 상속 검사, shell:false, 출력/시간 제한, 최소 환경, 취소 시 하위 프로세스 종료. 전역 CLI 설정 변경 없음.
- 현재 날짜 KST 검색 키, 복귀 시 오늘 1회, 중복 잠금, 검색 실패와 마감 후보 분리. Slack은 갱신 요약과 미제출 D-1/당일만 허용. 실제 전송 꺼짐.
- 백업은 DB+첨부+SHA manifest를 git 제외 backups에 저장. 복원 시험은 새 격리 DB에만 수행.

## 실행 증거
- 첫 원격 push 완료: develop eb735b3. 로컬 main 기준 c53518c 보존, main 미push. 원격 https://github.com/BapEgg/job-callender/tree/develop.
- 원본 SHA256 f1e964ee2428e8e5da3505b313661639495a746dd9015767200b4e6bb13f3619 유지.
- core3 × 4너비 시각12 PASS, 독립 QA 새캡처12 변경픽셀0/geometry동일/pageerror0. 상호작용7그룹 PASS.
- 전체15 × 1440/1280/768/390, 높이900 시각60 PASS. 원본 PNG+SHA manifest는 tests/visual/full-baseline에 봉인, 실제/차이는 artifacts/visual-all.
- 세 가지 정확 문구 예외만 텍스트 Range 비교 제외: 브라우저저장→탭유지, 저장상태, 모의생성→실제연결미확인 안내. raw PNG와 geometry 검사 유지.
- tsc/build PASS. domain+runner 단위10 PASS. 실제 시험API9그룹 PASS(인증/CSRF/revision/소유권/제출불변/파일/미연결/로그아웃).
- 독립 서버 추가7그룹 PASS(동시claim/취소/시도token/만료/충돌/경로), DB trigger 직접 UPDATE 거부 확인. 격리 backup→새DB restore PASS(계정2/제출1/파일1/history3 당시 기준).
- 실제 UI 가입→빈 홈→공고→지원→문항→입력→reload 보존→외부제출확인→snapshot1 PASS, pageerror0. scripts/test-ui.mjs 재현.
- Codex 호스트 ChatGPT 로그인, 설치0.154.0-alpha.6.2. GPT-6 Astra/Medium 고정 synthetic draft 및 questions JSON 실제 응답 성공. 사용자 실제 경험 기반 생성은 미검증.
- agy 1.2.4 경로 C:/Users/lkhej/AppData/Local/agy/bin/agy.exe. 호스트에서 인증과 search_web 도구 이벤트/SUCCESS 종료 확인. 최종 response가 빈 문자열, structured_output 없음, 검증 가능한 공고0. 인증 실패가 아니라 결과 계약 BLOCKED. SEARCH_VERIFIED=false 유지. 같은 원인 반복 재시도하지 않음.
- 최신 scheduler 독립4/4 + task revision5/5 PASS. 마감 후보의 변경된 원문 URL을 실제 발송 직전 다시 읽도록 수정.
- 최신 전체15 시각60 PASS 후 독립4 재캡처 픽셀/geometry차이0.
- 실제 UI 추가6그룹 PASS: 파일 byte 일치/제외후보존, 초안복원/이전글보존, 전형순서/reload, 프로필 선택가져오기/제출불변, API capability표시.
- 실제 host runner→작업큐→Codex 합성초안94자→명시적 적용→합성제출본→질문3개→DB 저장 PASS, 제출본 불변. scripts/test-cli-flow.mjs (구독 호출하는 명시적 통합시험, 기본 test에 포함하지 않음).
- 독립 실제 UI6/6 PASS: 취소/60초 재시도 제한/409 충돌·이동 시 입력보존/경험선택해제·제외/문항제외. 재시도 경과시간은 시험 DB 해당 행만 61초 이전으로 변경해 검증.
- 질문 생성에서 확정 제출본 버전 선택 지원. 실제3001 제출본2개 생성 후 최신 기본값/과거선택id API전달 검증 PASS(이 UI 시험은 AI 요청을 캡처만 함).
- 실제3000 수동 host runner 현재 연결 draft=true/questions=true/search=false. 실제 계정수0 확인. 자동 시작 등록 아님.

## 실제 위임
- product_review: 초기 제품 검토 후 ui_implementer로 src/**/index.html 단독 작성.
- design_review: 초기 디자인 검토 후 독립 qa_security/CLI 계약 조사. 제품 코드 수정 없음.
- 메인은 서버/DB/runner/통합/Git. 동시 하위 최대2. .codex/agents 역할 TOML 구문 확인; CLI의 자동 역할 로딩을 검증했다고 주장하지 않음.

## 미완료 / 미검증
- Google 실검색→DB→사용자 실제 경험→작성→제출→질문의 전체 인수 경로는 검색 결과 계약과 실제 경험 입력 때문에 미완료.
- 기업/후기/학습자료 자동 검색 및 원문 자동 읽기 성공 미검증. 링크/사용자 본문 등록과 확인 상태를 보존하며 가짜 근거를 채우지 않는다.
- Slack Webhook/실제 전송, Windows 자동 시작 등록/실제 절전복귀는 미검증·미실행. 스케줄러 API fixture 시험과 혼동하지 않는다.
- 자료 파일은 1MB PDF/TXT/MD/DOCX 보관·다운로드 지원. 파일 내용 자동 추출 성공으로 표시하지 않는다.

## 다음 작업 하나
Google CLI의 빈 최종 출력 계약을 해결한 뒤 실제 사용자 경험 한 건으로 검색부터 시작하는 인수를 진행한다. 현재까지 검증된 변경은 develop에 통합하며 main에는 반영하지 않는다.

## 사용자 요청 반영 — 프로필 선택 목록 (2026-09-17)
- 주요 기술/희망 지역/제외·확인 조건에 복수 선택 목록 추가. 최초 설정과 기본 프로필에 공통 적용. 직접 입력과 기존 문자열 저장 계약 유지, 자동 선택 없음.
- 사용자 승인에 따른 해당 입력 영역의 시각 변경이다. 원본 HTML/CSS는 수정하지 않음. 기존 60개 픽셀 비교 결과는 이 변경 이전 기준이며 onboarding/data의 새 선택 목록에는 적용하지 않는다.
- scripts/test-profile-options.mjs: 기술 선택/해제·대소문자 중복 방지·직접입력 보존·지역/조건 선택·390px 넘침·페이지오류 검사 PASS. TypeScript 및 Docker 빌드 통과.
