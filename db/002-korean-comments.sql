-- DBeaver 등 DB 도구에서 보이는 한국어 설명. 자료와 테이블 구조는 변경하지 않습니다.
COMMENT ON SCHEMA public IS '준비실 앱의 계정, 구직 자료, 실행 작업, 알림 정보를 보관하는 기본 공간';

COMMENT ON TABLE public.users IS '앱에 로그인하는 사용자 계정';
COMMENT ON COLUMN public.users.id IS '사용자를 구분하는 고유 번호';
COMMENT ON COLUMN public.users.username IS '로그인 아이디';
COMMENT ON COLUMN public.users.password_hash IS '복원할 수 없게 변환한 비밀번호. 원래 비밀번호는 저장하지 않음';
COMMENT ON COLUMN public.users.created_at IS '계정을 만든 시각';

COMMENT ON TABLE public.sessions IS '로그인 상태와 유효기간';
COMMENT ON COLUMN public.sessions.token_hash IS '로그인 확인용 토큰을 변환한 값. 원본 토큰은 저장하지 않음';
COMMENT ON COLUMN public.sessions.user_id IS '로그인한 사용자 번호. users.id와 연결';
COMMENT ON COLUMN public.sessions.expires_at IS '로그인이 만료되는 시각';

COMMENT ON TABLE public.auth_attempts IS '짧은 시간에 로그인을 너무 많이 시도하는 것을 막기 위한 기록';
COMMENT ON COLUMN public.auth_attempts.key IS '접속 주소 또는 아이디를 구분하는 제한 기준';
COMMENT ON COLUMN public.auth_attempts.failures IS '현재 제한 시간 안의 인증 요청 횟수';
COMMENT ON COLUMN public.auth_attempts.window_start IS '인증 요청 횟수를 세기 시작한 시각';

COMMENT ON TABLE public.user_state IS '사용자별 현재 작업 자료. 프로필, 공고, 지원서, 메모 등을 함께 보관';
COMMENT ON COLUMN public.user_state.user_id IS '자료 소유자 번호. users.id와 연결';
COMMENT ON COLUMN public.user_state.revision IS '저장할 때마다 증가하는 버전 번호. 여러 창의 덮어쓰기를 방지';
COMMENT ON COLUMN public.user_state.data IS '현재 자료 묶음(JSON). profile=기본 프로필, jobs=공고, apps=지원별 작업본, sources=원본 자료 연결, experiences=경험, notes=메모·외부 AI 답변, events=일정, settings=설정. 실제 파일 내용은 Docker 첨부 볼륨에 별도 보관';
COMMENT ON COLUMN public.user_state.updated_at IS '자료를 마지막으로 저장한 시각';

COMMENT ON TABLE public.state_history IS '현재 자료를 변경하기 전에 남겨 둔 이전 버전';
COMMENT ON COLUMN public.state_history.user_id IS '자료 소유자 번호. users.id와 연결';
COMMENT ON COLUMN public.state_history.revision IS '이전 자료의 저장 버전 번호';
COMMENT ON COLUMN public.state_history.data IS '변경 전 자료 전체(JSON). 당시 프로필, 공고, 지원서, 메모 등';
COMMENT ON COLUMN public.state_history.created_at IS '이전 버전을 기록한 시각';

COMMENT ON TABLE public.submissions IS '사용자가 외부 제출을 확인한 지원서 기록. 저장 후 수정·삭제할 수 없음';
COMMENT ON COLUMN public.submissions.id IS '제출본 고유 번호';
COMMENT ON COLUMN public.submissions.user_id IS '제출본 소유자 번호. users.id와 연결';
COMMENT ON COLUMN public.submissions.application_id IS '어느 지원 건의 제출본인지 나타내는 번호. user_state.data의 apps 항목과 연결';
COMMENT ON COLUMN public.submissions.version IS '해당 지원 건에서 확정한 제출본 순번';
COMMENT ON COLUMN public.submissions.snapshot IS '확정 당시 답변, 프로필, 공고, 자료 연결, 선택 경험을 복사한 묶음(JSON)';
COMMENT ON COLUMN public.submissions.created_at IS '제출본을 앱에서 확정한 시각. 채용사이트가 제공한 제출 시각은 아님';

COMMENT ON TABLE public.tasks IS '공고 검색, 자소서 작성, 면접 질문 생성의 요청과 실행 결과';
COMMENT ON COLUMN public.tasks.id IS '작업 고유 번호';
COMMENT ON COLUMN public.tasks.user_id IS '작업을 요청한 사용자 번호. users.id와 연결';
COMMENT ON COLUMN public.tasks.type IS '작업 종류: search=공고 검색, draft=초안 작성, questions=질문 생성';
COMMENT ON COLUMN public.tasks.status IS '진행 상태: queued=대기, running=실행 중, succeeded=완료, failed=실패, cancelled=취소';
COMMENT ON COLUMN public.tasks.dedupe_key IS '같은 요청이 중복 실행되지 않도록 구분하는 값';
COMMENT ON COLUMN public.tasks.input IS '요청 당시 고정한 조건과 자료(JSON). 나중에 편집한 내용과 구분';
COMMENT ON COLUMN public.tasks.result IS '검색 또는 생성 결과(JSON). 생성된 글은 사용자 적용 전까지 작업본에 덮어쓰지 않음';
COMMENT ON COLUMN public.tasks.error_code IS '실패 원인을 구분하는 코드';
COMMENT ON COLUMN public.tasks.attempt IS '실행기가 작업을 가져가 실행을 시작한 횟수';
COMMENT ON COLUMN public.tasks.attempt_token IS '이번 실행 회차의 확인 번호. 이전 실행의 늦은 결과를 차단';
COMMENT ON COLUMN public.tasks.lease_until IS '실행기가 이 작업을 맡을 수 있는 기한. 응답이 오면 연장';
COMMENT ON COLUMN public.tasks.created_at IS '작업을 요청한 시각';
COMMENT ON COLUMN public.tasks.finished_at IS '완료, 실패 또는 취소를 기록한 시각';

COMMENT ON TABLE public.runner_status IS '이 PC에서 AI 명령을 실행하는 백그라운드 프로그램의 최근 연결 상태';
COMMENT ON COLUMN public.runner_status.id IS '실행기 상태 행 번호. 개인용이므로 1로 고정';
COMMENT ON COLUMN public.runner_status.seen_at IS '실행기가 마지막으로 연결 신호를 보낸 시각';
COMMENT ON COLUMN public.runner_status.capabilities IS '사용 가능한 기능(JSON). search=검색, draft=작성, questions=질문 생성, slack=알림 활성 상태. true라도 모든 외부 작업의 성공을 보장하지 않음';

COMMENT ON TABLE public.notification_records IS 'Slack 알림의 대기 및 전송 결과. 같은 알림의 중복 전송 방지';
COMMENT ON COLUMN public.notification_records.user_id IS '알림 대상 사용자 번호. users.id와 연결';
COMMENT ON COLUMN public.notification_records.key IS '알림 종류와 대상·날짜 등을 조합한 중복 방지 값';
COMMENT ON COLUMN public.notification_records.status IS 'pending=대기, sent=전송 성공 응답 확인, failed=실패, uncertain=수신 여부 미확인, cancelled=취소';
COMMENT ON COLUMN public.notification_records.payload IS '보낼 알림 내용(JSON). 갱신 요약 또는 미제출 지원의 D-1·당일 마감 안내';
COMMENT ON COLUMN public.notification_records.attempted_at IS '전송을 시도하기 시작한 시각';

COMMENT ON TABLE public.files IS '업로드 파일의 정보. PDF 등의 실제 내용은 Docker 첨부 볼륨에 별도 보관';
COMMENT ON COLUMN public.files.id IS '파일 고유 번호. 첨부 볼륨의 파일 이름 및 다운로드 주소에 사용';
COMMENT ON COLUMN public.files.user_id IS '파일 소유자 번호. users.id와 연결';
COMMENT ON COLUMN public.files.name IS '사용자가 올린 원래 파일 이름';
COMMENT ON COLUMN public.files.mime IS '파일 형식. 예: application/pdf';
COMMENT ON COLUMN public.files.size IS '파일 크기(바이트)';
COMMENT ON COLUMN public.files.sha256 IS '파일 내용이 바뀌었는지 확인하는 지문 값';
COMMENT ON COLUMN public.files.created_at IS '파일을 업로드한 시각';
