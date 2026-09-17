# NOW — 현재 상태와 다음 작업

## 사용자 확정과 경계 (2026-09-17)
- 승인된 개인용 로컬 15화면/React+TypeScript 구현. 원본 HTML 재디자인 금지. README는 추후 ELI5 방식으로 쉽게 보는 별도 안내를 작성할 때 다룬다.
- 검증·비밀정보 검사 후 origin/develop 커밋/push 허용. main 반영/배포, 자료 삭제, OS 자동 시작 등록, 실제 Slack 전송은 별도 승인.
- 사용자 정정: Google 검색 성공 이력 없음. PowerShell agy 실행/로그인까지만 완료. 기존 검색 3건 성공 인계는 철회.
- 실제 사용자 경험은 아직 제공되지 않았다. 시험 계정/문항/공고는 모두 격리 fixture이며 실제 사용자 성과가 아니다.

## 구현과 기술 선택
- React 19.3 / TypeScript 7 / Vite 8.3. 원본 DOM/CSS/SVG를 JSX로 이식. 원본 CSS 내용 동일. iframe/raw HTML 주입 없음.
- Node HTTP + pg + PostgreSQL 18.6. 개인용 편집 상태는 소유자별 JSONB/revision/history로 보존하고 제출본·세션·파일·작업·알림은 별도 테이블로 강제한다. 화면 단위 잦은 저장과 불변 제출본을 작게 구현하기 위한 선택.
- Docker Compose 웹/API/DB. DB는 DBeaver용 loopback 5433만 허용, 웹은 loopback 3000. 시험은 별도 compose.test.yaml/DB/첨부 볼륨/3001. 실제 3000 계정은 사용자가 만든다.
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
- Slack 연결 시험과 실제 수집 요약 전송은 완료. 실제 D-1·당일 조건의 운영 전송, Windows 자동 시작 등록/실제 절전복귀는 아직 미검증·미실행. 스케줄러 API fixture 시험과 혼동하지 않는다.
- 자료 파일은 1MB PDF/TXT/MD/DOCX 보관·다운로드 지원. 파일 내용 자동 추출 성공으로 표시하지 않는다.

## 다음 작업 하나
PDF 등 원본 내용 추출을 구현하고, 실제 사용자 경험 기반 작성→검토→제출본→질문 흐름을 검증한다. 원티드 자동 검색→원문 검증→DB→Slack의 실제 첫 인수는 아래 2026-09-17 기록처럼 완료했다.

## 사용자 요청 반영 — 프로필 선택 목록 (2026-09-17)
- 주요 기술/희망 지역/제외·확인 조건에 복수 선택 목록 추가. 최초 설정과 기본 프로필에 공통 적용. 직접 입력과 기존 문자열 저장 계약 유지, 자동 선택 없음.
- 사용자 승인에 따른 해당 입력 영역의 시각 변경이다. 원본 HTML/CSS는 수정하지 않음. 기존 60개 픽셀 비교 결과는 이 변경 이전 기준이며 onboarding/data의 새 선택 목록에는 적용하지 않는다.
- scripts/test-profile-options.mjs: 기술 선택/해제·대소문자 중복 방지·직접입력 보존·지역/조건 선택·390px 넘침·페이지오류 검사 PASS. TypeScript 및 Docker 빌드 통과.

## 사용자 확인 후 실제 운영 검증 (2026-09-17)
- DBeaver용 loopback 127.0.0.1:5433→DB5432 연결. jobprep DB/user로 TCP 인증 접속 성공. 자세한 저장 위치/읽기 SQL은 docs/data-storage.md.
- PDF는 job-callender_attachments 볼륨(/data/files), 메타데이터 files, 원본 연결 sources, 메모·외부AI답변 notes(JSONB). DB 재연결 중 idle pg connection 오류로 웹이 종료되는 현상을 발견하여 pool error 처리 추가; 격리 DB restart 후 web health200 검증.
- UI: 직무 선택/직접입력 저장, 목록 접기·선택개수, 조건 그룹화. 실제 설정의 개인 실행기는 PC에서 CLI를 실행하는 프로그램으로 설명. 시연 버튼은 실제 검색 요청/연결 재조회/작업기록으로 교체. 1440/390 및 실제3001 UI·저장 검증 PASS.
- 사용자 제공 Webhook을 git 제외 .env에 저장. 명시적으로 표시된 Slack 연결 시험 1회 전송, HTTP 성공+응답 ok 및 DB sent 기록 확인. 호스트에서 Slack 활성화, 매일 갱신요약/미제출 D-1·당일 두 종류 정책 유지. API 상태는 하드코드 미검증 대신 실제 마지막 발송 결과.
- 사용자의 정확한 추가 승인 후 Google 전역 settings에 read_url(echomarketing.career.greetinghr.com), read_url(www.wanted.co.kr) 두 규칙만 추가. 전체경로/하위도메인 지속허용 범위를 명시해 승인받았고 원본을 원파일 옆 private backup, 나머지 설정 보존 확인.
- AGY의 짧은 timeout/출력 문제는 bounded search+low effort+5m+stream-json으로 조사. 지정 URL 읽기 성공. 마지막 진단에서는 검색 후보1건/원문읽기1건의 권한 거부가 없었으나 JavaScript 원문·모집상태 검증 불가여서 search capability는 아직 false.
- 실제원문 https://www.wanted.co.kr/wd/215128 : UI 상시채용과 실제 JobPosting validThrough 2024-04-15 충돌. AGY 응답을 별도 HTTP200 JSON-LD 추출로 대조 완료. 원문 최소정보 1건을 마감 공고로 실제 DB에 보존(신규 모집0건). 자동검색 성공/오늘 갱신성공으로 기록하지 않음. 실제 요약 알림은 마감 확인 문구와 원문 링크를 포함해 큐 등록 후 host runner가 전송, DB sent 확인.
- 단위11, API9, 프로필·설정 UI, DB 재연결 검증 통과. 실제 사용자자료 삭제·자동시작 등록·main변경 없음.

## 수집 품질에 대한 사용자 지적과 수정
- 2024년 공고를 실제 일반목록에 넣어 흐름검증한 것은 현재구직용 결과와 검증자료 분리가 미흡한 처리였다. 테스트 더미가 아니라 실제 과거공고였으며 최신공고 확보 성공이 아니다.
- 해당 정확한 imported URL의 collectionState를 diagnostic으로 바꾸고 new=false. 상태이력과 자료는 보존하되 일반 홈/공고 목록에는 노출하지 않는다. 이미 전송한 마감 확인 요약은 취소하지 않았다.
- 검색을 특정 공고 제목으로 고정하지 않았다. 사용자 조건은 신입·서울경기·기술 선호이며 role은 사용자 선택값이다.
- 자동수집 서버/adapter 양쪽에 당일확인+currentStatus=open+접수근거+마감미경과+충돌없음 검증 추가. 기존 '상시채용' 표시와 과거명시기한이 충돌하면 실패. 자동검색은 여전히 false이며 실제모집 공고 확보 인수 미완료.
- 단위12 PASS. 아직 자동수집 운영준비완료가 아니므로 그처럼 보고하지 않는다.

## DB 한국어 설명 (2026-09-17)
- db/002-korean-comments.sql에 public 스키마, 테이블10개, 컬럼52개의 짧은 한국어 COMMENT 추가. 실제 jobprep DB 적용 후 PostgreSQL 설명 카탈로그에서 누락0 확인.
- JSON 자료 묶음도 profile/jobs/apps/sources/experiences/notes/events/settings 의미와 파일 실제 저장 위치를 설명. 행 데이터/테이블 구조 변경 없음.
- 서버 시작 시 초기 스키마 다음에 설명 SQL도 읽도록 반영. DBeaver 연결 새로고침 후 속성/컬럼의 설명에서 확인.

## 다음 작업 순서 — 최신 기준
1. 현재 모집 중인 실제 공고 확보: 검색→원문 모집상태/기한 확인→DB→Slack 요약. JS 본문 접근/소스 충돌 처리 포함. 자동 수집 활성화 전 필수.
2. PDF 등 원본 내용 추출과 실제 사용자 경험 기반 작성→검토→제출본→질문 전체 흐름 검증. 현재 파일 보관 및 합성 경험 생성 시험과 구분.
3. 운영 검증: PC 재시작/절전복귀의 당일1회 갱신, 한도/장애 대기, 실제 조건의 마감 알림. OS 자동 시작 등록은 별도 승인 필요.
4. 최종 인수 정리와 요청한 ELI5 방식의 한눈에 보는 안내. main 반영/배포는 별도 승인.

## 현재 모집 공고 수집 및 원문 검증 보강 (2026-09-17)
- 원티드 공개 서버개발 신입 목록에서 드림어스컴퍼니 `콘텐츠 플랫폼 백엔드 개발(신입)` https://www.wanted.co.kr/wd/373760 발견. 원문 status=active/hidden=false/close_time 없음, 신입·서울 강남·정규직 및 Java 확인. 게시일 2026-07-15, 마감일 미기재이므로 unknown 유지. 오늘 게시된 공고로 표현하지 않음.
- 실제 사용자 DB에 일반 공고 1건 추가(revision4), 기존 자료/history 보존. 기존 승인 Slack 갱신 요약 큐 처리 후 sent 확인. 같은 링크 재실행 duplicate=true, 추가 저장·추가 알림 없음. 증거 artifacts/automation/verified-open-link.json(마지막 재실행 결과).
- 발견 경로는 개발 담당의 공개 목록 직접 확인이다. Google CLI 자동 발견 성공으로 기록하지 않으며 batchDone/lastSuccess/search capability를 올리지 않았다. 앱 브라우저는 로그인 화면이라 로그인 후 공고 목록 표시 자체는 사용자 확인 필요; 실제 DB 저장과 알림은 직접 검증.
- runner/posting-source.mjs: 원문의 최소 메타데이터만 추출. AI의 모집중 주장과 별도로 상태/비공개/마감/신입/지역/고용조건 검증. 기한의 timezone은 KST로 변환, 상충 날짜·시각 거부. 정확한 HTTPS Wanted 공고 경로만 읽고 redirect 거부, 15초/3MB 제한. 미지원 직무·경력·제외조건은 검토 필요로 거부한다. 원문 전체는 DB에 보관하지 않음.
- searchJobs가 AI 결과 뒤 원문 검증을 통과한 후보만 반환하도록 연결. 현재 자동 원문 검증 지원은 Wanted만이며 다른 출처는 실패 처리한다. scripts/collect-verified-link.mjs는 직접 발견한 링크용 검증/명시 적용 도구로 자동검색과 구분.
- 독립 검토에서 실제 AGY stream의 nested result 형식, 날짜 offset, 고용조건 및 같은 날짜의 시각 충돌 결함을 발견해 수정. 단위14개 통과. 검토 증거 artifacts/qa/posting-source-review.md 및 posting-source-recheck.json. 실제 Google CLI 추가 호출은 1회 제한 내 수행 후 중단.
- 이번 Google CLI 후보 탐색은 검색 결과가 Google grounding redirect URL로 제공되어 원문 URL 확보 실패 및 INTERNAL500으로 BLOCKED. 전역 권한 확대/유료API 대체/반복 재시도 없음. 웹 검색의 이전 후보5건도 원문에서는 전부 마감/비공개여서 저장 안 함.
- 잔여: Google 후보 URL 확보·전체 자동수집 인수, 자동 merge에서 같은 URL의 회사/제목 변경 시 중복 가능성(기존 코드, 실제 재현 미실행), 관련 자료 검색. 실행 중 runner는 search=false이며 새 검증 코드는 다음 시작부터 로드된다.

## Google 검색 후보 주소 확보 (2026-09-17 후속)
- 검색과 원문 검증을 분리해 실제 AGY search_web 1회 성공(status SUCCESS/권한거부0). 반환 URL 그대로 출력하도록 지시해 후보5건 확보. 전부 Google grounding redirect URL이며 현재 모집 여부는 미검증. 증거 artifacts/automation/candidate-links-probe.json.
- runner/search-candidates.mjs에 실제 nested stream 파싱, 검색 실행 근거 확인, 후보5개 제한·중복 제거, 정확한 Wanted/Google 경로 제한 추가. 후보를 확인된 공고로 반환하지 않는다.
- Google 중간서버는 기존 두 도메인 승인 밖이므로 사용자에게 `/grounding-api-redirect/` 이동주소 읽기 허용 요청 중. 전역 CLI 설정 변경은 요청하지 않음. resolver는 기본 승인false로 네트워크 요청 차단; 승인true여도 1회 수동 redirect 응답의 Location만 읽으며 목적지가 정확한 Wanted 공고 URL이 아니면 거부. 아직 실제 호출·제품 어댑터 연결 안 함.
- 독립 검토에서 tool 오류를 terminal SUCCESS가 가리는 사례를 발견해 오류 이벤트 거부 검사 추가. 단위19개 통과(기존14+신규5). 사용자 답변 전에는 Google 중간주소 네트워크 읽기, 자동수집 활성화, 신규 DB 저장·Slack 전송을 실행하지 않는다. 이번 준비 변경은 로컬 작업본이며 아직 커밋/push하지 않음.

## Google 이동주소 승인 후 자동 수집 인수 완료 (2026-09-17)
- 중간 링크 의미를 설명한 뒤 사용자가 `응`으로 읽기 승인. 정확한 Google grounding-api-redirect 경로에서 Location만 읽고, 최종 Wanted 공고 URL만 원문 검증. 전역 Google CLI 권한은 변경하지 않음. private .env에 JOBPREP_GOOGLE_REDIRECT_APPROVED=true 저장, 예제는 false.
- 기존 검색 후보5건은 이동주소 확보 성공, 전부 SOURCE_NOT_OPEN으로 제외. 최신성 검색 조건(현재 연도/최근90일 검색 기준)을 추가한 실제 어댑터 시험은 한국이에스지데이터의 2026-09-15 공고1건 검증 성공, 나머지4건은 마감/경력 불일치 제외. 이 진단 결과 자체는 DB에 넣지 않음.
- 실제 실행기 재시작 후 오늘 작업큐→Google CLI→이동주소→원문→DB→Slack 전체 성공. task e1c4ac02-6560-43d6-b31a-d4f0317bba47 succeeded, 신규1/변경0, revision5, lastSuccessDate=2026-09-17, Slack sent. 증거 artifacts/automation/automatic-search-db-slack.json.
- 실제 저장 공고: 크레바스에이아이 `[인턴] 서버 개발자`, https://www.wanted.co.kr/wd/377832, 게시2026-09-15, 서울 동대문구, 신입 지원 가능. 마감 미기재→unknown. 사용자의 현재 직무는 빈 값이고 인턴 제외 조건도 없어 포함. 모든 희망 직무/조건 조합의 정확성을 검증한 것은 아님.
- runner/main.mjs가 private SEARCH_VERIFIED/GOOGLE_REDIRECT_APPROVED를 읽고 scripts/start-runner.ps1이 실제 agy 경로 전달. 현재 host runner session20510, search/draft/questions/slack=true. OS 자동 시작 등록은 아님. 오늘 중복키는 유지하여 재시작 시 같은 검색을 재생성하지 않음.
- 단위19개 PASS 및 독립 읽기 검토 PASS. 자동 원문 검증은 Wanted만 지원, 미지원 조건은 검토 필요로 실패 처리. 검색의 최근90일은 검색 힌트이며 신선도 보증이 아님; 모집 상태는 별도 실제 원문 검사. 후보 전부 부적격이면 SEARCH_FAILED로 남기며 가짜 성공0건을 기록하지 않음.
- 남은 품질 보강: 동일 URL 제목 변경 시 기존 자동merge 중복 가능성, 기업/후기/학습자료 검색, 다양한 조건 지원. 최초 실제 자동수집 인수와 장기간 운영 검증은 구분한다.
