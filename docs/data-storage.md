# 로컬 데이터 확인

DBeaver에서 **새 연결 → PostgreSQL**을 선택합니다.

| 항목 | 값 |
|---|---|
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `jobprep` |
| Username | `jobprep` |
| Password | 프로젝트 `.env`의 `POSTGRES_PASSWORD` 값 |

Test Connection으로 확인 후 `jobprep → Schemas → public → Tables`를 펼칩니다. 이 포트는 내 PC에서만 접속합니다. 앱 로그인 비밀번호와 DB 비밀번호는 다릅니다.

## 무엇이 어디에 있나요?

| 자료 | 저장 위치 |
|---|---|
| 업로드한 PDF 등 원본 바이트 | Docker `job-callender_attachments` 볼륨. 웹 컨테이너 `/data/files/<파일 UUID>` |
| 파일 이름·크기·해시·소유자 | PostgreSQL `files` |
| 원본 자료의 제목·설명·파일 연결 | `user_state.data`의 `sources` |
| 사용자가 저장한 추출문·원본 해시 | `user_state.data.sources[].extractedText/extractionSha256` |
| 메모·외부 AI 답변 | `user_state.data`의 `notes` |
| 프로필·공고·지원별 작업본·경험 | `user_state.data`의 `profile/jobs/apps/experiences` |
| 과거 편집 상태 | `state_history` |
| 사용자가 확정한 제출본 | `submissions.snapshot` (수정·삭제 금지) |
| AI/검색 작업과 결과 | `tasks` |
| 알림 발송 결과 | `notification_records` |

파일은 Windows 프로젝트 폴더에 직접 저장되지 않습니다. Docker Desktop의 Volumes에서 해당 볼륨을 확인하거나 앱의 원본 다운로드를 사용합니다. PDF 보관과 PDF 내용 분석은 별개입니다.

등록한 원본 자료에서 **내용 추출 → 검토·수정 → 저장 → 내용으로 경험 추가** 순서로 사용합니다. 추출만 한 결과는 미리보기이며 저장을 눌러야 DB에 남습니다. 경험은 `sourceId`로 자료와 연결하고 미확인 상태로 시작합니다. 본인 수행 범위를 확인한 경험만 자기소개서 생성 입력에 포함됩니다.

추출은 Docker 내부 Poppler로 처리하며 파일 내용을 외부 AI에 보내지 않습니다. PDF/TXT/MD, 원본 1MB 이하, PDF 50쪽 이하, 추출문 5만 자까지 지원합니다. 스캔 이미지 OCR·DOCX 추출은 지원하지 않으므로 내용을 직접 붙여넣습니다. 손상·암호화·초과 크기는 원본을 그대로 두고 실패/확인 필요 상태로 안내합니다. PDF 줄 순서·표는 원본과 대조해 수정해야 합니다. 도구 옵션 근거: [Poppler pdftotext 매뉴얼](https://manpages.debian.org/testing/poppler-utils/pdftotext.1.en.html).

DBeaver SQL 편집기에서 다음은 읽기만 수행합니다.

```sql
-- 파일 목록
SELECT id, name, mime, size, sha256, created_at FROM files;
-- 원본 자료 연결
SELECT user_id, jsonb_pretty(data->'sources') AS sources FROM user_state;
-- 메모와 외부 AI 답변
SELECT user_id, jsonb_pretty(data->'notes') AS notes FROM user_state;
-- 검색·작성 작업 현황 (개인 본문은 제외)
SELECT type, status, error_code, created_at, finished_at FROM tasks ORDER BY created_at DESC;
```

앱의 변경 감지/제출본 보호를 유지하려면 편집은 웹 화면에서 합니다. 백업은 `node scripts/backup.mjs`이며 DB와 첨부파일을 함께 보관합니다.

DBeaver 공식 안내: https://dbeaver.com/docs/dbeaver/Database-driver-PostgreSQL/

DB 스키마·테이블·컬럼에 한국어 설명이 들어 있습니다. DBeaver에서 연결을 새로고침(F5)하고 테이블의 속성 → 컬럼 → 설명을 확인하세요. `data`처럼 여러 자료를 묶은 컬럼에는 내부 항목의 뜻도 설명했습니다.
