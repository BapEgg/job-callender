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
| 메모·외부 AI 답변 | `user_state.data`의 `notes` |
| 프로필·공고·지원별 작업본·경험 | `user_state.data`의 `profile/jobs/apps/experiences` |
| 과거 편집 상태 | `state_history` |
| 사용자가 확정한 제출본 | `submissions.snapshot` (수정·삭제 금지) |
| AI/검색 작업과 결과 | `tasks` |
| 알림 발송 결과 | `notification_records` |

파일은 Windows 프로젝트 폴더에 직접 저장되지 않습니다. Docker Desktop의 Volumes에서 해당 볼륨을 확인하거나 앱의 원본 다운로드를 사용합니다. PDF 보관과 PDF 내용 분석은 별개입니다.

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
