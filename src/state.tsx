import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction, ChangeEvent } from "react";
import { seed } from "./fixtures/seed";
import { Icon } from "./icons";
import { api, ApiError } from "./api";
import { emptyState, fixtureState } from "./model";
import type { AppState, Question, Job, Application, Stage } from "./model";
type Action = (
  action: string,
  id?: string,
  value?: string,
  trigger?: HTMLElement,
) => void;
type UIState = Record<string, any>;
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string | number | boolean;
  options?: [string, string][];
};
type Modal = {
  kind: string;
  title: string;
  id?: string;
  text?: string;
  fields?: Field[];
};
type Task = {
  id: string;
  type: string;
  status: string;
  input?: {
    applicationId?: string;
    questionId?: string;
    submissionId?: string;
    baseRevision?: number;
    question?: Question;
  };
  result?: {
    text?: string;
    questions?: Array<{
      title?: string;
      question?: string;
      origin?: string;
      follow?: string;
      study?: string;
    }>;
  };
  error_code?: string;
  created_at?: string;
  finished_at?: string;
};
type State = {
  route: string;
  act: Action;
  saved: string[];
  tab: string;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  experience: string;
  setExperience: Dispatch<SetStateAction<string>>;
  deadline: string;
  setDeadline: Dispatch<SetStateAction<string>>;
  questions: Question[];
  question: Question;
  count: number;
  within: boolean;
  updateQuestion: (value: string) => void;
  evidence: Record<string, boolean>;
  setEvidence: Dispatch<SetStateAction<Record<string, boolean>>>;
  state: AppState;
  ui: UIState;
  form: Record<string, any>;
  onInput: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  fixture: boolean;
  user: { id: string; username: string } | null;
  loaded: boolean;
  saveStatus: string;
  update: (fn: (s: AppState) => void) => void;
  today: string;
};
const Context = createContext<State | null>(null);
export function useFixture() {
  const s = useContext(Context);
  if (!s) throw Error("App provider required");
  return s;
}
export const useApp = useFixture;
const routeNames: Record<string, string> = {
  login: "로그인",
  signup: "회원가입",
  onboarding: "최초 설정",
  home: "홈 · 오늘의 준비",
  jobs: "공고 찾기",
  job: "공고 상세",
  applications: "지원 관리",
  workspace: "지원 준비실",
  write: "자기소개서 편집",
  submission: "제출 기록",
  prep: "전형 준비",
  data: "마이데이터 · 원본",
  experiences: "마이데이터 · 경험",
  calendar: "일정",
  settings: "설정",
};
export { routeNames };
const defaultQuestion: Question = {
  id: "",
  title: "",
  prompt: "문항을 추가해 주세요.",
  min: 0,
  max: 700,
  spaces: true,
  unit: "chars",
  text: "",
};
export function countText(q: Question) {
  const value = q.spaces ? q.text : q.text.replace(/\s/g, "");
  return q.unit === "bytes"
    ? new TextEncoder().encode(value).length
    : Array.from(value).length;
}
const uid = (prefix: string) => prefix + "-" + crypto.randomUUID();
function safeURL(value: string) {
  try {
    const u = new URL(value);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}
export function FixtureProvider({ children }: { children: ReactNode }) {
  const fixture = new URLSearchParams(location.search).get("fixture") === "1";
  const today = fixture
    ? "2026-09-16"
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
  const [state, setState] = useState<AppState>(() =>
    fixture ? fixtureState() : emptyState(),
  );
  const [user, setUser] = useState<{ id: string; username: string } | null>(
      null,
    ),
    [loaded, setLoaded] = useState(fixture),
    [saveStatus, setSaveStatus] = useState(
      fixture ? "탭 안에 유지" : "연결 확인 중",
    );
  const [connections, setConnections] = useState<any>(null);
  const [profileCompare, setProfileCompare] = useState(false);
  const [profileSelection, setProfileSelection] = useState<
    Record<string, boolean>
  >({});
  useEffect(() => {
    if (fixture || !user) {
      setConnections(null);
      return;
    }
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const result = await api("/api/connections");
        if (!stopped) setConnections(result);
      } catch {
        if (!stopped) setConnections(null);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [fixture, user]);
  const [route, setRoute] = useState(
    () => location.hash.slice(1) || (fixture ? "home" : "login"),
  );
  const [ui, setUI] = useState<UIState>({
    route,
    jobsTab: "all",
    jobsSearch: "",
    jobsExp: "all",
    jobsDeadline: "all",
    detailTab: "summary",
    appFilter: "all",
    appView: "list",
    appSearch: "",
    profileTab: "profile",
    questionId: "q1",
    researchTab: "saved",
    prepTab: "questions",
    openQA: "qa1",
    settingsTab: "connection",
    calendarYear: Number(today.slice(0, 4)),
    calendarMonth: Number(today.slice(5, 7)) - 1,
    selectedDate: today,
    calFilter: "all",
    reviewPersona: "hr",
    generating: false,
    batchRunning: false,
    queued: [],
  });
  const [stageDraft, setStageDraft] = useState<Stage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]),
    [taskBusy, setTaskBusy] = useState(false),
    [taskError, setTaskError] = useState(""),
    [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [form, setForm] = useState<Record<string, any>>({}),
    [modal, setModal] = useState<Modal | null>(null),
    [message, setMessage] = useState("");
  const stateRef = useRef(state),
    revision = useRef(0),
    generation = useRef(0),
    dirty = useRef(false),
    blocked = useRef(false),
    saving = useRef<Promise<boolean> | null>(null),
    userRef = useRef(user);
  const appliedSearches = useRef(new Set<string>());
  const trigger = useRef<HTMLElement | null>(null),
    dialog = useRef<HTMLElement | null>(null);
  stateRef.current = state;
  userRef.current = user;
  const app =
    state.apps.find((a) => a.id === route.split("/")[1]) ?? state.apps[0];
  const questions = app?.questions.filter((q) => !q.softDeleted) ?? [],
    question =
      questions.find((q) => q.id === ui.questionId) ??
      questions[0] ??
      defaultQuestion;
  const count = countText(question),
    within = count >= question.min && count <= question.max;
  function update(fn: (s: AppState) => void) {
    setState((before) => {
      const copy = structuredClone(before);
      fn(copy);
      stateRef.current = copy;
      return copy;
    });
    generation.current++;
    dirty.current = true;
    setSaveStatus(fixture ? "탭 안에 유지" : "저장 대기");
  }
  async function saveNow(): Promise<boolean> {
    if (fixture) return true;
    if (saving.current) {
      await saving.current;
      if (dirty.current && !blocked.current) return saveNow();
      return !blocked.current;
    }
    if (!dirty.current) return true;
    if (!userRef.current || blocked.current) return false;
    const base = generation.current;
    const payload = structuredClone(stateRef.current);
    setSaveStatus("저장 중");
    const pending = (async () => {
      try {
        const result = await api<{ revision: number; state: AppState }>(
          "/api/state",
          "PUT",
          { expectedRevision: revision.current, state: payload },
        );
        revision.current = result.revision;
        if (base === generation.current) {
          dirty.current = false;
          setState(result.state);
          stateRef.current = result.state;
          setSaveStatus("서버 저장 완료");
        } else setSaveStatus("저장 대기");
        return true;
      } catch (error) {
        const conflict = error instanceof ApiError && error.status === 409;
        blocked.current = true;
        setSaveStatus(
          conflict ? "버전 충돌 · 입력 유지" : "저장 실패 · 입력 유지",
        );
        setMessage(
          conflict
            ? "다른 창에서 자료가 변경되었습니다. 현재 입력을 유지하고 저장을 중단했습니다. 복사한 뒤 최신 자료와 비교해 주세요."
            : String(error instanceof Error ? error.message : error),
        );
        return false;
      } finally {
        saving.current = null;
      }
    })();
    saving.current = pending;
    return pending;
  }
  useEffect(() => {
    if (fixture) return;
    let live = true;
    (async () => {
      try {
        const result = await api<{ user: typeof user }>("/api/auth/me");
        if (!live) return;
        setUser(result.user);
        userRef.current = result.user;
        if (result.user) {
          const data = await api<{ revision: number; state: AppState }>(
            "/api/state",
          );
          if (!live) return;
          revision.current = data.revision;
          setState(data.state);
          stateRef.current = data.state;
          setSaveStatus("서버 저장 완료");
          if (["login", "signup"].includes(route) || !location.hash)
            navigate("home");
        } else {
          setSaveStatus("로그인 필요");
          if (!["login", "signup"].includes(route)) navigate("login");
        }
      } catch (error) {
        if (live) {
          setSaveStatus("서버 연결 실패");
          setMessage(
            error instanceof Error
              ? error.message
              : "서버에 연결하지 못했습니다.",
          );
        }
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty.current || fixture || !user || blocked.current) return;
    const timer = setTimeout(() => void saveNow(), 650);
    return () => clearTimeout(timer);
  }, [state, user]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!fixture && dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [fixture]);
  useEffect(() => {
    const onHash = () => {
      const next = location.hash.slice(1) || "home";
      setRoute(next);
      setUI((v) => ({ ...v, route: next }));
      setForm({});
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!modal) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current
      ?.querySelector<HTMLElement>("input,textarea,select,button")
      ?.focus();
    return () => {
      document.body.style.overflow = before;
      trigger.current?.focus();
    };
  }, [modal?.kind]);
  function close() {
    setModal(null);
    setForm({});
    setSelectedUpload(null);
  }
  function navigate(value: string) {
    location.hash = value;
    setRoute(value);
    setUI((v) => ({ ...v, route: value }));
    close();
    window.scrollTo(0, 0);
  }
  function inform(text: string) {
    setModal({ kind: "info", title: "연결 상태 안내", text });
  }
  function open(
    kind: string,
    title: string,
    fields: Field[] = [],
    id = "",
    text = "",
  ) {
    setForm(Object.fromEntries(fields.map((f) => [f.name, f.value ?? ""])));
    setModal({ kind, title, fields, id, text });
  }
  const inputValue = (name: string, fallback: any = "") =>
    form[name] ?? fallback;
  function editApp(id: string, fn: (a: Application) => void) {
    update((s) => {
      const target = s.apps.find((a) => a.id === id);
      if (target) fn(target);
    });
  }
  function onInput(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const t = e.target,
      value =
        t instanceof HTMLInputElement && t.type === "checkbox"
          ? t.checked
          : t.value;
    setForm((f) => ({ ...f, [t.id || t.name]: value }));
    const map: Record<string, string> = {
      "app-search": "appSearch",
      "jobs-search": "jobsSearch",
      "jobs-exp": "jobsExp",
      "jobs-deadline": "jobsDeadline",
    };
    if (map[t.id]) setUI((v) => ({ ...v, [map[t.id]]: value }));
    if (t.id === "draft-editor")
      editApp(t.dataset.app || app?.id || "", (a) => {
        const q = a.questions.find((q) => q.id === t.dataset.q);
        if (q) q.text = t.value;
      });
    if (t.dataset.change === "evidence")
      editApp(t.dataset.id || "", (a) => {
        a.evidence = { ...a.evidence, [t.dataset.key || ""]: !!value };
      });
    if (t.dataset.change === "todo")
      editApp(t.dataset.id || "", (a) => {
        a.todo[t.dataset.key || ""] = !!value;
      });
    if (t.dataset.change === "app-status") {
      if (value === "submitted") act("confirm-submit", t.dataset.id);
      else
        editApp(t.dataset.id || "", (a) => {
          a.status = String(value);
        });
    }
    if (t.dataset.change === "stage-status")
      editApp(t.dataset.app || "", (a) => {
        const st = a.stages.find((st) => st.id === t.dataset.id);
        if (st) st.state = String(value);
      });
    if (t.dataset.change === "qa-level" || t.dataset.answer)
      editApp(t.dataset.app || "", (a) => {
        const list = a.stageQA?.[a.activeStage] ?? a.qa;
        const q = list.find((q) => q.id === (t.dataset.id || t.dataset.answer));
        if (q) {
          if (t.dataset.answer) q.answer = t.value;
          else q.level = t.value;
        }
      });
  }
  async function refreshTasks() {
    if (fixture || !userRef.current) return;
    try {
      const result = await api<{ tasks: Task[] }>("/api/tasks");
      setTasks(result.tasks);
      setTaskError("");
      const completedSearches = result.tasks.filter(
        (task) =>
          task.type === "search" &&
          task.status === "succeeded" &&
          !appliedSearches.current.has(task.id),
      );
      if (
        completedSearches.length &&
        !dirty.current &&
        !saving.current &&
        !blocked.current
      ) {
        const base = generation.current;
        const refreshed = await api<{ revision: number; state: AppState }>(
          "/api/state",
        );
        if (base === generation.current && !dirty.current && !saving.current) {
          revision.current = refreshed.revision;
          stateRef.current = refreshed.state;
          setState(refreshed.state);
          completedSearches.forEach((task) =>
            appliedSearches.current.add(task.id),
          );
        }
      }
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "작업 상태 확인 실패",
      );
    }
  }
  useEffect(() => {
    if (fixture || !user) return;
    void refreshTasks();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshTasks();
    }, 3000);
    return () => clearInterval(timer);
  }, [fixture, user]);
  async function taskAction(action: "cancel" | "retry" | "apply", id: string) {
    if (taskBusy) return;
    if (
      action === "apply" &&
      (dirty.current ||
        tasks.find((t) => t.id === id)?.input?.baseRevision !==
          revision.current)
    ) {
      setTaskError(
        "생성 요청 뒤 자료가 변경되었습니다. 현재 초안을 보존합니다. 결과의 필요한 문장을 복사해 직접 반영하거나 다시 생성해 주세요.",
      );
      return;
    }
    setTaskBusy(true);
    const base = generation.current;
    try {
      const result = await api<{ revision: number; state: AppState }>(
        `/api/tasks/${encodeURIComponent(id)}/${action}`,
        "POST",
        action === "apply" ? { expectedRevision: revision.current } : {},
      );
      if (action === "apply") {
        revision.current = result.revision;
        if (generation.current === base) {
          setState(result.state);
          stateRef.current = result.state;
          dirty.current = false;
          setSaveStatus("서버 저장 완료");
        } else {
          setState((current) => {
            const next = structuredClone(current);
            for (const app of next.apps) {
              const serverApp = result.state.apps.find((a) => a.id === app.id);
              if (serverApp) {
                app.versions = serverApp.versions;
                const currentIds = new Set(app.qa.map((q) => q.id));
                app.qa = [
                  ...app.qa,
                  ...serverApp.qa.filter((q) => !currentIds.has(q.id)),
                ];
              }
            }
            stateRef.current = next;
            return next;
          });
          dirty.current = true;
          setSaveStatus("저장 대기");
        }
        setMessage(
          "확인한 생성 결과를 적용했습니다. 제출본은 변경하지 않았습니다.",
        );
        close();
      }
      await refreshTasks();
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "작업 처리 실패");
    } finally {
      setTaskBusy(false);
    }
  }
  async function runTask(
    type: "search" | "draft" | "questions",
    id: string,
    submissionId?: string,
  ) {
    if (fixture) {
      inform(
        "AI · 검색 실행기가 미연결 상태입니다. 실제 요청을 보내거나 예시 결과를 생성하지 않았습니다.",
      );
      return;
    }
    if (!(await saveNow())) return;
    const target = stateRef.current.apps.find((a) => a.id === id);
    if (type === "questions" && !target?.snapshots.length) {
      inform(
        "회사별 질문은 사용자가 확정한 제출본이 필요합니다. 제출 기록에서 실제 제출 내용을 먼저 확정해 주세요.",
      );
      return;
    }
    if (type === "questions" && target) {
      if (!submissionId) {
        open(
          "question-submission",
          "질문 생성에 사용할 제출본 선택",
          [
            {
              name: "submissionId",
              label: "확정 제출본",
              value: target.snapshots.at(-1)!.id,
              options: [...target.snapshots]
                .reverse()
                .map((snapshot) => [
                  snapshot.id,
                  `제출본 v${snapshot.version} · ${snapshot.date}`,
                ]),
            },
          ],
          id,
          "선택한 제출본의 프로필과 답변을 기준으로 질문을 생성합니다. 현재 작업본과 과거 제출본은 변경하지 않습니다.",
        );
        return;
      }
      if (!target.snapshots.some((snapshot) => snapshot.id === submissionId)) {
        inform(
          "선택한 제출본을 찾을 수 없습니다. 제출 기록을 다시 확인해 주세요.",
        );
        return;
      }
    }
    try {
      await api("/api/tasks", "POST", {
        type,
        applicationId: id || undefined,
        questionId: type === "draft" ? question.id : undefined,
        submissionId: type === "questions" ? submissionId : undefined,
      });
      await refreshTasks();
      setModal({ kind: "tasks", title: "AI 작업 진행과 결과" });
      setMessage("작업 요청을 등록했습니다. 결과는 비교 후 직접 적용합니다.");
    } catch (error) {
      inform(error instanceof Error ? error.message : "실행기 연결 실패");
    }
  }
  const act: Action = (action, id = "", value = "", element) => {
    if (element) trigger.current = element;
    if (action === "slack-preview") {
      setModal({ kind: "slack-preview", title: "Slack 메시지 미리보기" });
      return;
    }
    if (action === "export-data") {
      const blob = new Blob([JSON.stringify(stateRef.current, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "준비실_자료_" + today + ".json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "자료 JSON을 내보냈습니다. 원본 첨부파일과 전체 DB 백업은 별도입니다.",
      );
      return;
    }
    if (action === "tasks") {
      setModal({ kind: "tasks", title: "AI 작업 진행과 결과" });
      void refreshTasks();
      return;
    }
    if (action === "task-compare") {
      setTaskError("");
      setModal({ kind: "task-compare", title: "생성 결과 비교", id });
      return;
    }
    if (action === "go") {
      navigate(value);
      return;
    }
    if (action === "close-modal") {
      close();
      return;
    }
    if (action === "skip") {
      document.getElementById("main-content")?.focus();
      return;
    }
    if (action === "screen-map") {
      setModal({ kind: "map", title: "전체 화면 둘러보기" });
      return;
    }
    const tabs: Record<string, string> = {
      "jobs-tab": "jobsTab",
      "detail-tab": "detailTab",
      "app-filter": "appFilter",
      "app-view": "appView",
      "profile-tab": "profileTab",
      "prep-tab": "prepTab",
      "settings-tab": "settingsTab",
      "calendar-filter": "calFilter",
      "select-date": "selectedDate",
    };
    if (tabs[action]) {
      setUI((v) => ({ ...v, [tabs[action]]: value }));
      return;
    }
    if (action === "reset-filters") {
      setUI((v) => ({
        ...v,
        jobsTab: "all",
        jobsSearch: "",
        jobsExp: "all",
        jobsDeadline: "all",
      }));
      return;
    }
    if (action === "bookmark") {
      update((s) => {
        s.saved = s.saved.includes(id)
          ? s.saved.filter((x) => x !== id)
          : [...s.saved, id];
      });
      return;
    }
    if (action === "save-research") {
      update((s) => {
        s.researchSaved = s.researchSaved.includes(id)
          ? s.researchSaved.filter((x) => x !== id)
          : [...s.researchSaved, id];
      });
      return;
    }
    if (action === "select-question") {
      setUI((v) => ({ ...v, questionId: id }));
      return;
    }
    if (action === "review-draft") {
      setUI((v) => ({ ...v, reviewPersona: "hr" }));
      setModal({
        kind: "review",
        title: "검토 관점과 분량 확인",
        id: id || app?.id,
      });
      return;
    }
    if (action === "review-persona") {
      setUI((v) => ({ ...v, reviewPersona: value }));
      return;
    }
    if (
      action === "generate" ||
      action === "generate-questions" ||
      action === "run-batch"
    ) {
      void runTask(
        action === "run-batch"
          ? "search"
          : action === "generate-questions"
            ? "questions"
            : "draft",
        id || app?.id || "",
      );
      return;
    }
    if (action === "copy-draft") {
      navigator.clipboard
        .writeText(question.text)
        .then(() =>
          setMessage(
            "답변을 복사했습니다. 실제 제출과 제출본 확정은 수행하지 않았습니다.",
          ),
        )
        .catch(() =>
          setMessage(
            "복사 권한을 확인하거나 답변을 직접 선택해 복사해 주세요.",
          ),
        );
      return;
    }
    if (action === "demo-login" || action === "demo-signup") {
      if (fixture) {
        navigate(action === "demo-signup" ? "onboarding" : "home");
        return;
      }
      const username = String(form["auth-id"] ?? "").trim(),
        password = String(form["auth-password"] ?? "");
      if (!username || !password) {
        setMessage("아이디와 비밀번호를 입력해 주세요.");
        return;
      }
      void (async () => {
        try {
          const data = await api<{ user: { id: string; username: string } }>(
            "/api/auth/" + (action === "demo-signup" ? "register" : "login"),
            "POST",
            { username, password },
          );
          setForm({});
          setUser(data.user);
          userRef.current = data.user;
          const result = await api<{ revision: number; state: AppState }>(
            "/api/state",
          );
          revision.current = result.revision;
          setState(result.state);
          stateRef.current = result.state;
          blocked.current = false;
          dirty.current = false;
          setSaveStatus("서버 저장 완료");
          navigate(action === "demo-signup" ? "onboarding" : "home");
        } catch (error) {
          setForm((v) => ({ ...v, "auth-password": "" }));
          setMessage(error instanceof Error ? error.message : "로그인 실패");
        }
      })();
      return;
    }
    if (action === "logout") {
      void (async () => {
        if (!(await saveNow())) return;
        await api("/api/auth/logout", "POST");
        setUser(null);
        setState(emptyState());
        navigate("login");
      })();
      return;
    }
    if (action === "save-profile") {
      update((s) => {
        for (const key of Object.keys(
          s.profile,
        ) as (keyof typeof s.profile)[]) {
          const v = form["profile-" + key];
          if (v !== undefined) s.profile[key] = String(v);
        }
      });
      setMessage(
        "기본 프로필 수정은 기존 지원 작업본과 제출본에 자동 반영되지 않습니다.",
      );
      return;
    }
    if (action === "add-job") {
      open(
        "job",
        "외부에서 찾은 공고 등록",
        [
          { name: "url", label: "채용 원문 URL", type: "url" },
          { name: "company", label: "회사 이름" },
          { name: "title", label: "직무 이름" },
          { name: "exp", label: "경력 조건", value: "신입" },
          {
            name: "closeType",
            label: "기한 유형",
            value: "unknown",
            options: [
              ["fixed", "마감일 있음"],
              ["rolling", "상시채용"],
              ["unknown", "기한 미확인"],
            ],
          },
          { name: "deadline", label: "마감 날짜", type: "date" },
          { name: "time", label: "확인한 시간 (선택)", type: "time" },
        ],
        "",
        "링크와 직접 확인한 최소 정보만 등록합니다. 원문을 자동으로 읽은 상태가 아닙니다.",
      );
      return;
    }
    if (action === "source-job" || action === "source-preview") {
      const job = state.jobs.find(
        (j) => j.id === id || id.startsWith(j.id + "-"),
      );
      setModal({
        kind: "source",
        title: "원문 링크",
        text:
          job?.manualURL ||
          (fixture
            ? "https://example.com/jobs/" + id
            : "확인한 원문 URL이 없습니다."),
      });
      return;
    }
    if (action === "start-application" || action === "create-application") {
      const existing = state.apps.find((a) => a.jobId === id);
      if (existing) {
        navigate("workspace/" + existing.id);
        return;
      }
      const job = state.jobs.find((j) => j.id === id);
      if (!job) return;
      const created = uid("app");
      update((s) => {
        s.apps.unshift({
          id: created,
          jobId: id,
          status: "preparing",
          profile: structuredClone(s.profile),
          questions: [],
          versions: [],
          snapshots: [],
          stages: [
            {
              id: uid("stage"),
              name: "서류 준비",
              type: "document",
              state: "진행",
              date: "",
              time: "",
            },
          ],
          qa: [],
          todo: {},
          notes: [],
          goal: "",
          activeStage: "",
          createdAt: today,
          review: "",
        });
        s.apps[0].activeStage = s.apps[0].stages[0].id;
      });
      navigate("workspace/" + created);
      return;
    }
    if (action === "app-profile") {
      setProfileCompare(false);
      setProfileSelection({});
      const a = state.apps.find((a) => a.id === id);
      if (a)
        open(
          "profile",
          "이번 지원에서 사용할 프로필",
          [
            {
              name: "summary",
              label: "지원별 소개",
              type: "textarea",
              value: a.profile.summary,
            },
            { name: "skills", label: "기술", value: a.profile.skills },
            {
              name: "portfolio",
              label: "포트폴리오 URL",
              type: "url",
              value: a.profile.portfolio,
            },
          ],
          id,
          "기본 프로필, 다른 지원 건, 기존 제출본은 바뀌지 않습니다.",
        );
      return;
    }
    if (action === "add-question" || action === "edit-question") {
      const q = action === "edit-question" ? question : defaultQuestion;
      open(
        "question",
        action === "edit-question" ? "문항 수정" : "문항 추가",
        [
          { name: "title", label: "문항 이름", value: q.title },
          {
            name: "prompt",
            label: "문항 원문",
            type: "textarea",
            value: q.prompt === defaultQuestion.prompt ? "" : q.prompt,
          },
          { name: "min", label: "최소 분량", type: "number", value: q.min },
          { name: "max", label: "최대 분량", type: "number", value: q.max },
          {
            name: "unit",
            label: "분량 단위",
            value: q.unit,
            options: [
              ["chars", "글자 (Unicode 코드포인트)"],
              ["bytes", "UTF-8 바이트"],
            ],
          },
          {
            name: "spaces",
            label: "공백 포함",
            type: "checkbox",
            value: q.spaces,
          },
        ],
        id || app?.id || "",
        action === "edit-question" ? q.id : "",
      );
      return;
    }
    if (action === "confirm-submit") {
      open(
        "submit",
        "실제 제출본 확정",
        [
          {
            name: "confirmed",
            label:
              "외부 채용사이트에 실제 제출했으며 현재 문항·프로필을 제출본으로 확정합니다.",
            type: "checkbox",
            value: false,
          },
        ],
        id,
        "현재 지원별 작업본을 복사해 변경할 수 없는 제출 기록으로 보존합니다. 복사나 초안 생성만으로 제출 처리하지 않습니다.",
      );
      return;
    }
    if (
      action === "versions" ||
      action === "snapshots" ||
      action === "view-snapshot"
    ) {
      setModal({
        kind: action === "versions" ? "versions" : "snapshots",
        title: action === "versions" ? "초안 버전 기록" : "제출 기록",
        id: id || app?.id,
      });
      return;
    }
    if (action === "save-version") {
      editApp(id || app.id, (a) =>
        a.versions.push({
          id: uid("version"),
          label: "직접 저장한 초안",
          date: today,
          questionId: question.id,
          text: question.text,
        }),
      );
      return;
    }
    if (action === "restore-version") {
      const a = state.apps.find((a) => a.id === value),
        v = a?.versions.find((v) => v.id === id);
      if (a && v)
        editApp(a.id, (x) => {
          const q = x.questions.find((q) => q.id === v.questionId);
          if (q) {
            x.versions.push({
              id: uid("version"),
              label: "복원 전 초안",
              date: today,
              questionId: q.id,
              text: q.text,
            });
            q.text = v.text;
          }
        });
      close();
      return;
    }
    if (action === "goal") {
      open(
        "goal",
        "개인 지원 목표일",
        [
          {
            name: "goal",
            label: "목표 날짜",
            type: "date",
            value: state.apps.find((a) => a.id === id)?.goal,
          },
        ],
        id,
      );
      return;
    }
    if (action === "edit-experience") {
      const exp = state.experiences.find((e) => e.id === id);
      open(
        "experience",
        "내 경험과 수행 범위",
        [
          { name: "title", label: "경험 이름", value: exp?.title },
          { name: "kind", label: "종류", value: exp?.kind ?? "프로젝트" },
          { name: "role", label: "본인 역할", value: exp?.role },
          {
            name: "body",
            label: "확인한 내용과 한계",
            type: "textarea",
            value: exp?.body,
          },
          { name: "skills", label: "기술", value: exp?.skills },
          {
            name: "confirmed",
            label: "내가 수행한 범위를 확인했습니다.",
            type: "checkbox",
            value: exp?.confirmed ?? false,
          },
        ],
        id,
      );
      return;
    }
    if (action === "confirm-experience") {
      update((s) => {
        const e = s.experiences.find((e) => e.id === id);
        if (e) e.confirmed = !e.confirmed;
      });
      return;
    }
    if (action === "add-source") {
      open(
        "source-edit",
        "원본 자료 등록",
        [
          { name: "title", label: "자료 이름" },
          {
            name: "type",
            label: "자료 종류",
            value: "portfolio",
            options: [
              ["portfolio", "포트폴리오"],
              ["github", "GitHub"],
              ["blog", "블로그"],
              ["other", "기타"],
            ],
          },
          { name: "url", label: "자료 링크", type: "url" },
        ],
        "",
        "PDF/TXT/MD/DOCX 파일은 1MB까지 보관할 수 있습니다. 파일 보관과 내용 읽기·AI 분석은 구분합니다.",
      );
      return;
    }
    if (action === "source-info") {
      const s = state.sources.find((s) => s.id === id);
      if (s)
        setModal({ kind: "source", title: s.title, text: s.url || s.note });
      return;
    }
    if (action === "add-note") {
      open(
        "note",
        "조사자료 · 외부 답변 저장",
        [
          { name: "title", label: "자료 제목" },
          {
            name: "type",
            label: "자료 유형",
            value: "memo",
            options: [
              ["memo", "내 메모"],
              ["source", "공식/외부 자료"],
              ["ai", "외부 AI 답변 · 미확인"],
            ],
          },
          { name: "content", label: "내용", type: "textarea" },
          { name: "url", label: "출처 링크", type: "url" },
        ],
        id,
      );
      return;
    }
    if (action === "note-link") {
      const note = state.notes.find((n) => n.id === id);
      if (note)
        setModal({ kind: "source", title: "저장한 출처 링크", text: note.url });
      return;
    }
    if (action === "study") {
      const q = (app?.stageQA?.[app.activeStage] ?? app?.qa ?? []).find(
        (q) => q.id === id,
      );
      if (!q) return;
      const note = state.notes.find(
        (n) => n.studyKey === q.study && !n.softDeleted,
      );
      open(
        "study",
        "모르는 부분을 학습 기록으로",
        [
          {
            name: "content",
            label: "내가 이해한 내용과 더 확인할 부분",
            type: "textarea",
            value: note?.content ?? "",
          },
          {
            name: "common",
            label: "다른 지원에서도 재사용할 공통 마이데이터로 저장",
            type: "checkbox",
            value: !note?.appId,
          },
        ],
        q.study,
        q.title,
      );
      return;
    }
    if (action === "paste-invitation") {
      open(
        "invitation",
        "받은 전형 안내 붙여넣기",
        [{ name: "invitation", label: "안내 내용", type: "textarea" }],
        id,
        "날짜와 시간 후보를 옮긴 뒤 실제 안내와 비교해 직접 확인해야 합니다. 메일함 자동 읽기는 하지 않습니다.",
      );
      return;
    }
    if (action === "edit-deadline") {
      const job = state.jobs.find((j) => j.id === id);
      if (job)
        open(
          "deadline",
          "저장된 공고 기한 수정",
          [
            {
              name: "closeType",
              label: "기한 유형",
              value: job.closeType,
              options: [
                ["fixed", "마감일 있음"],
                ["rolling", "상시채용"],
                ["unknown", "기한 미확인"],
              ],
            },
            {
              name: "date",
              label: "마감 날짜",
              type: "date",
              value: job.deadline ?? "",
            },
            {
              name: "time",
              label: "확인한 시간 (선택)",
              type: "time",
              value: job.time,
            },
          ],
          id,
          "원문에서 직접 확인한 기한만 수정해 주세요. 날짜 기준 상태와 실제 원문 확인은 별개입니다.",
        );
      return;
    }
    if (action === "select-stage") {
      editApp(value, (a) => {
        a.activeStage = id;
      });
      return;
    }
    if (action === "qa-toggle") {
      setUI((v) => ({ ...v, openQA: v.openQA === id ? "" : id }));
      return;
    }
    if (action === "save-review") {
      editApp(id, (a) => {
        a.review = inputValue("prep-review", a.review);
      });
      return;
    }
    if (action === "manage-stages") {
      const a = state.apps.find((a) => a.id === id);
      setStageDraft(structuredClone(a?.stages ?? []));
      open(
        "stages",
        "회사별 전형 단계 편집",
        [],
        id,
        "이름, 유형, 일정, 순서를 수정할 수 있습니다. 저장하기 전에는 지원 건에 반영되지 않습니다.",
      );
      return;
    }
    if (action.startsWith("calendar-")) {
      setUI((v) => {
        let y = v.calendarYear,
          m = v.calendarMonth;
        if (action === "calendar-today") {
          y = Number(today.slice(0, 4));
          m = Number(today.slice(5, 7)) - 1;
        } else {
          m += action === "calendar-next" ? 1 : -1;
          if (m < 0) {
            m = 11;
            y--;
          }
          if (m > 11) {
            m = 0;
            y++;
          }
        }
        return {
          ...v,
          calendarYear: y,
          calendarMonth: m,
          selectedDate:
            action === "calendar-today"
              ? today
              : `${y}-${String(m + 1).padStart(2, "0")}-01`,
        };
      });
      return;
    }
    if (action === "add-event" || action === "edit-event") {
      const ev = state.events.find((e) => e.id === id);
      open(
        "event",
        "일정 저장",
        [
          { name: "title", label: "일정 이름", value: ev?.title },
          {
            name: "date",
            label: "날짜",
            type: "date",
            value: ev?.date || value || ui.selectedDate,
          },
          { name: "time", label: "시간", type: "time", value: ev?.time },
          {
            name: "type",
            label: "유형",
            value: ev?.type || "personal",
            options: [
              ["personal", "개인 목표"],
              ["stage", "전형 일정"],
              ["reply", "회신"],
            ],
          },
          { name: "note", label: "메모", type: "textarea", value: ev?.note },
        ],
        ev?.id || "",
      );
      return;
    }
    if (action === "event-detail") {
      const ev = state.events.find((e) => e.id === id);
      if (ev) {
        act("edit-event", id);
        return;
      }
      for (const target of state.apps) {
        if (id === "deadline-" + target.id) {
          act("edit-deadline", target.jobId);
          return;
        }
        if (id === "goal-" + target.id) {
          act("goal", target.id);
          return;
        }
        if (
          target.stages.some((st) => id === "stage-" + target.id + "-" + st.id)
        ) {
          act("manage-stages", target.id);
          return;
        }
      }
      inform("해당 일정을 찾지 못했습니다. 현재 등록된 일정을 확인해 주세요.");
      return;
    }
    if (action === "onboard-next") {
      if (state.onboardStep === 1)
        update((s) => {
          s.profile.career = inputValue("on-career", s.profile.career);
          s.profile.region = inputValue("on-region", s.profile.region);
          s.profile.skills = inputValue("on-skills", s.profile.skills);
          s.profile.exclusions = inputValue(
            "on-exclusions",
            s.profile.exclusions,
          );
        });
      if (state.onboardStep >= 4) {
        update((s) => {
          s.onboardComplete = true;
        });
        navigate("home");
      } else
        update((s) => {
          s.onboardStep++;
        });
      return;
    }
    if (action === "onboard-prev") {
      update((s) => {
        s.onboardStep = Math.max(1, s.onboardStep - 1);
      });
      return;
    }
    if (
      action === "switch" ||
      action === "batch-scenario" ||
      action === "reconnect"
    ) {
      inform(
        "연결 상태는 실제 실행기와 서버의 확인 결과만 표시합니다. 스위치로 연결 성공을 만들지 않습니다.",
      );
      return;
    }
    if (
      [
        "delete-source",
        "delete-note",
        "delete-event",
        "delete-experience",
        "delete-question",
      ].includes(action)
    ) {
      setModal({
        kind: action,
        title: "이 자료를 목록에서 제외할까요?",
        id,
        text: "현재 목록에서 숨기고 원본 기록과 과거 제출본은 보존합니다. 이 작업을 진행할지 직접 확인해 주세요.",
      });
      return;
    }
    if (action === "reset-demo") {
      inform(
        "전체 초기화는 제공하지 않습니다. 원본과 과거 제출 기록을 보존합니다.",
      );
      return;
    }
    inform(
      "아직 연결되지 않은 기능입니다. 입력한 내용과 기존 자료는 유지됩니다. 실제 외부 전송은 수행하지 않았습니다.",
    );
  };
  async function applyModal() {
    if (!modal) return;
    const f = form,
      id = modal.id || "";
    if (modal.kind.startsWith("delete-")) {
      update((s) => {
        const kind = modal.kind.slice(7);
        if (kind === "question") {
          const a = s.apps.find((a) => a.id === app?.id);
          const q = a?.questions.find((q) => q.id === id);
          if (q) q.softDeleted = true;
        } else {
          const list =
            kind === "source"
              ? s.sources
              : kind === "experience"
                ? s.experiences
                : kind === "event"
                  ? s.events
                  : s.notes;
          const item = list.find((x) => x.id === id);
          if (item) item.softDeleted = true;
        }
      });
      close();
      return;
    }
    const txt = (key: string) => String(f[key] ?? "").trim();
    if (modal.kind === "question-submission") {
      if (taskBusy) return;
      const selected = txt("submissionId");
      if (!selected) {
        setMessage("질문 생성에 사용할 제출본을 선택해 주세요.");
        return;
      }
      setTaskBusy(true);
      try {
        await runTask("questions", id, selected);
      } finally {
        setTaskBusy(false);
      }
      return;
    }
    if (["job", "source-edit", "note", "profile"].includes(modal.kind)) {
      const url = txt(modal.kind === "profile" ? "portfolio" : "url");
      if (url && !safeURL(url)) {
        setMessage("http 또는 https 원문 URL을 입력해 주세요.");
        return;
      }
    }
    if (modal.kind === "job") {
      if (
        !txt("company") ||
        !txt("title") ||
        !safeURL(txt("url")) ||
        (txt("closeType") === "fixed" && !txt("deadline"))
      ) {
        setMessage("회사·직무·원문 URL과 기간형 마감 날짜를 확인해 주세요.");
        return;
      }
      const created = uid("job");
      update((s) => {
        s.jobs.unshift({
          id: created,
          company: txt("company"),
          title: txt("title"),
          manualURL: txt("url"),
          mark: txt("company").slice(0, 1),
          color: "",
          exp: txt("exp"),
          region: "지역 미확인",
          type: "고용형태 미확인",
          domain: "분류 미확인",
          posted: today,
          deadline: txt("closeType") === "fixed" ? txt("deadline") : null,
          time: txt("closeType") === "fixed" ? txt("time") : "",
          closeType: txt("closeType"),
          new: false,
          skills: [],
          sources: 1,
          eligible: "확인 필요",
          intro:
            "사용자가 직접 확인해 등록한 정보입니다. 원문 읽기와 자동 검증은 수행하지 않았습니다.",
        });
      });
      navigate("job/" + created);
      return;
    }
    if (modal.kind === "question") {
      const min = Number(f.min),
        max = Number(f.max);
      if (
        !txt("prompt") ||
        !Number.isInteger(min) ||
        !Number.isInteger(max) ||
        min < 0 ||
        max < 1 ||
        max < min ||
        max > 100000
      ) {
        setMessage("문항 원문과 최소·최대 분량을 확인해 주세요.");
        return;
      }
      const qid = modal.text || uid("q");
      editApp(id, (a) => {
        const fields = {
          title: txt("title") || txt("prompt").slice(0, 14),
          prompt: txt("prompt"),
          min,
          max,
          unit: txt("unit"),
          spaces: !!f.spaces,
        };
        const old = a.questions.find((q) => q.id === qid);
        if (old) Object.assign(old, fields);
        else a.questions.push({ id: qid, ...fields, text: "" });
      });
      setUI((v) => ({ ...v, questionId: qid }));
    }
    if (modal.kind === "profile")
      editApp(id, (a) => {
        a.profile = {
          ...a.profile,
          summary: txt("summary"),
          skills: txt("skills"),
          portfolio: txt("portfolio"),
        };
      });
    if (modal.kind === "goal")
      editApp(id, (a) => {
        a.goal = txt("goal");
      });
    if (modal.kind === "experience") {
      if (!txt("title")) {
        setMessage("경험 제목을 입력해 주세요.");
        return;
      }
      update((s) => {
        const data = {
          title: txt("title"),
          kind: txt("kind"),
          role: txt("role"),
          body: txt("body"),
          skills: txt("skills"),
          confirmed: !!f.confirmed,
        };
        const old = s.experiences.find((e) => e.id === id);
        if (old) Object.assign(old, data);
        else s.experiences.push({ id: uid("experience"), ...data });
      });
    }
    if (modal.kind === "source-edit") {
      const title = txt("title") || selectedUpload?.name;
      if (!title) {
        setMessage("자료 제목이나 파일을 선택해 주세요.");
        return;
      }
      let stored:
        { id: string; sha256: string; size: number; url: string } | undefined;
      if (selectedUpload) {
        if (
          selectedUpload.size > 1_000_000 ||
          !/[.](pdf|txt|md|docx)$/i.test(selectedUpload.name)
        ) {
          setMessage("PDF/TXT/MD/DOCX 파일을 1MB 이하로 선택해 주세요.");
          return;
        }
        if (fixture) {
          setMessage(
            "시안 모드에서는 파일 내용을 서버에 보내지 않습니다. 실제 계정에서 파일을 등록해 주세요.",
          );
          return;
        }
        try {
          setTaskBusy(true);
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () => reject(Error("파일 읽기 실패"));
            reader.readAsDataURL(selectedUpload);
          });
          const result = await api<{
            file: { id: string; sha256: string; size: number; url: string };
          }>("/api/files", "POST", { name: selectedUpload.name, base64 });
          stored = result.file;
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "파일 보관 실패");
          return;
        } finally {
          setTaskBusy(false);
        }
      }
      update((s) => {
        s.sources.push({
          id: uid("source"),
          title,
          type: txt("type"),
          url: stored?.url || txt("url"),
          status: stored
            ? "파일 보관 완료 · 내용 미확인"
            : txt("url")
              ? "링크만 등록"
              : "이름만 등록",
          note: "사용자가 등록한 원본입니다. 내용 읽기와 분석은 미실행입니다.",
          ...(stored
            ? { fileId: stored.id, sha256: stored.sha256, size: stored.size }
            : {}),
        });
      });
    }
    if (modal.kind === "note") {
      if (!txt("title") || !txt("content")) {
        setMessage("자료 제목과 내용을 입력해 주세요.");
        return;
      }
      update((s) => {
        s.notes.push({
          id: uid("note"),
          title: txt("title"),
          content: txt("content"),
          type: txt("type"),
          url: txt("url"),
          appId: id,
        });
      });
    }
    if (modal.kind === "event") {
      if (!txt("title") || !txt("date")) {
        setMessage("일정 이름과 날짜를 입력해 주세요.");
        return;
      }
      update((s) => {
        const fields = {
          title: txt("title"),
          date: txt("date"),
          time: txt("time"),
          type: txt("type"),
          note: txt("note"),
          appId: txt("appId"),
        };
        const old = s.events.find((e) => e.id === id);
        if (old) Object.assign(old, fields);
        else s.events.push({ id: uid("event"), ...fields });
      });
    }
    if (modal.kind === "stages") {
      if (!stageDraft.filter((st) => !st.softDeleted).length) {
        setMessage("최소 한 개 전형 단계를 입력해 주세요.");
        return;
      }
      editApp(id, (a) => {
        a.stages = structuredClone(stageDraft);
        if (!a.stages.some((st) => st.id === a.activeStage && !st.softDeleted))
          a.activeStage = a.stages.find((st) => !st.softDeleted)!.id;
      });
    }
    if (modal.kind === "study") {
      if (!txt("content")) {
        setMessage("학습 메모를 입력해 주세요.");
        return;
      }
      update((s) => {
        const note = s.notes.find((n) => n.studyKey === id && !n.softDeleted);
        const fields = {
          title: id,
          type: "memo",
          content: txt("content"),
          url: "",
          appId: f.common ? "" : app?.id || "",
          studyKey: id,
        };
        if (note) Object.assign(note, fields);
        else s.notes.push({ id: uid("note"), ...fields });
      });
    }
    if (modal.kind === "deadline") {
      if (txt("closeType") === "fixed" && !txt("date")) {
        setMessage("기간형 공고의 날짜를 입력해 주세요.");
        return;
      }
      update((s) => {
        const j = s.jobs.find((j) => j.id === id);
        if (j) {
          j.closeType = txt("closeType");
          j.deadline = j.closeType === "fixed" ? txt("date") : null;
          j.time = j.closeType === "fixed" ? txt("time") : "";
        }
      });
    }
    if (modal.kind === "invitation") {
      const text = txt("invitation");
      if (!text) {
        setMessage("안내 내용을 입력해 주세요.");
        return;
      }
      const date = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? "",
        time = text.match(/\b([01]\d|2[0-3]):[0-5]\d\b/)?.[0] ?? "";
      open(
        "event",
        "안내의 일정 후보 확인",
        [
          { name: "title", label: "일정 이름", value: "안내 확인" },
          { name: "date", label: "날짜", type: "date", value: date },
          { name: "time", label: "시간", type: "time", value: time },
          {
            name: "type",
            label: "유형",
            value: text.includes("회신") ? "reply" : "stage",
            options: [
              ["personal", "개인 목표"],
              ["stage", "전형 일정"],
              ["reply", "회신"],
            ],
          },
          {
            name: "appId",
            label: "연결할 지원 건",
            value: id,
            options: [
              ["", "연결하지 않음"],
              ...state.apps.map(
                (a) =>
                  [
                    a.id,
                    state.jobs.find((j) => j.id === a.jobId)?.company || a.id,
                  ] as [string, string],
              ),
            ],
          },
          { name: "note", label: "안내 원문", type: "textarea", value: text },
        ],
        "",
        "자동 해석 결과가 아닙니다. 실제 안내의 의미와 회신 기한을 확인한 후 저장해 주세요.",
      );
      return;
    }
    if (modal.kind === "submit") {
      if (!f.confirmed) {
        setMessage("외부 제출 확인에 체크해 주세요.");
        return;
      }
      const target = state.apps.find((a) => a.id === id);
      if (!target?.questions.length) {
        setMessage("제출할 문항과 답변을 먼저 등록해 주세요.");
        return;
      }
      if (fixture) {
        editApp(id, (a) => {
          a.snapshots.push({
            id: uid("submission"),
            version: a.snapshots.length + 1,
            date: today,
            questions: structuredClone(a.questions),
            profile: structuredClone(a.profile),
            file: "별도 첨부 없음",
          });
          a.status = "submitted";
        });
        navigate("submission/" + id);
        return;
      }
      if (!(await saveNow())) return;
      const submissionGeneration = generation.current;
      try {
        const result = await api<{ revision: number; state?: AppState }>(
          `/api/applications/${encodeURIComponent(id)}/submissions`,
          "POST",
          {
            expectedRevision: revision.current,
            confirmedExternalSubmission: true,
          },
        );
        revision.current = result.revision;
        const loadedState = result.state
          ? result
          : await api<{ revision: number; state: AppState }>("/api/state");
        revision.current = loadedState.revision;
        if (loadedState.state) {
          if (generation.current === submissionGeneration) {
            setState(loadedState.state);
            stateRef.current = loadedState.state;
            dirty.current = false;
            setSaveStatus("서버 저장 완료");
          } else {
            const snapshots = loadedState.state.apps.find(
              (a) => a.id === id,
            )?.snapshots;
            setState((current) => {
              const next = structuredClone(current);
              const target = next.apps.find((a) => a.id === id);
              if (target && snapshots) {
                target.snapshots = snapshots;
                target.status = "submitted";
              }
              stateRef.current = next;
              return next;
            });
            dirty.current = true;
            setSaveStatus("저장 대기");
          }
        }
        navigate("submission/" + id);
        return;
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "제출 기록 저장 실패",
        );
        return;
      }
    }
    close();
  }
  const setSearch: Dispatch<SetStateAction<string>> = (v) =>
    setUI((u) => ({
      ...u,
      jobsSearch: typeof v === "function" ? v(u.jobsSearch) : v,
    }));
  const setExperience: Dispatch<SetStateAction<string>> = (v) =>
    setUI((u) => ({
      ...u,
      jobsExp: typeof v === "function" ? v(u.jobsExp) : v,
    }));
  const setDeadline: Dispatch<SetStateAction<string>> = (v) =>
    setUI((u) => ({
      ...u,
      jobsDeadline: typeof v === "function" ? v(u.jobsDeadline) : v,
    }));
  const setEvidence: Dispatch<SetStateAction<Record<string, boolean>>> = (
    v,
  ) => {
    if (app)
      editApp(app.id, (a) => {
        a.evidence = typeof v === "function" ? v(a.evidence ?? {}) : v;
      });
  };
  const updateQuestion = (value: string) => {
    if (app)
      editApp(app.id, (a) => {
        const q = a.questions.find((q) => q.id === question.id);
        if (q) q.text = value;
      });
  };
  const displayState: AppState = {
    ...state,
    sources: state.sources.filter((x) => !x.softDeleted),
    experiences: state.experiences.filter((x) => !x.softDeleted),
    notes: state.notes.filter((x) => !x.softDeleted),
    events: state.events.filter((x) => !x.softDeleted),
    apps: state.apps.map((a) => ({
      ...a,
      questions: a.questions.filter((q) => !q.softDeleted),
      stages: a.stages.filter((st) => !st.softDeleted),
    })),
  };
  const context: State = {
    route,
    act,
    saved: state.saved,
    tab: ui.jobsTab,
    search: ui.jobsSearch,
    setSearch,
    experience: ui.jobsExp,
    setExperience,
    deadline: ui.jobsDeadline,
    setDeadline,
    questions,
    question,
    count,
    within,
    updateQuestion,
    evidence: app?.evidence ?? {},
    setEvidence,
    state: displayState,
    ui: {
      ...ui,
      connections,
      route,
      queued: tasks.filter((t) => ["queued", "running"].includes(t.status)),
      generating: tasks.some(
        (t) =>
          t.type === "draft" &&
          t.input?.applicationId === app?.id &&
          ["queued", "running"].includes(t.status),
      ),
    },
    form,
    onInput,
    fixture,
    user,
    loaded,
    saveStatus,
    update,
    today,
  };
  const modalApp = state.apps.find((a) => a.id === modal?.id);
  const compareTask = tasks.find((t) => t.id === modal?.id);
  const compareQuestion = state.apps
    .find((a) => a.id === compareTask?.input?.applicationId)
    ?.questions.find((q) => q.id === compareTask?.input?.questionId);
  const taskLabels: Record<string, string> = {
    queued: "대기",
    running: "실행 중",
    succeeded: "완료 · 비교 후 적용",
    failed: "실패",
    cancelled: "취소",
  };
  return (
    <Context.Provider value={context}>
      {children}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <section
            className={
              "modal" +
              (["stages", "task-compare", "note"].includes(modal.kind)
                ? " wide"
                : "")
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            ref={dialog}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
              if (e.key === "Tab") {
                const nodes = dialog.current?.querySelectorAll<HTMLElement>(
                  'button,[href],input,select,textarea,[tabindex="0"]',
                );
                if (nodes?.length) {
                  const first = nodes[0],
                    last = nodes[nodes.length - 1];
                  if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                  } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                  }
                }
              }
            }}
          >
            <header className="modal-header">
              <h2 id="modal-title">{modal.title}</h2>
              <button
                className="btn ghost icon-only"
                onClick={close}
                aria-label="창 닫기"
              >
                <Icon name="close" />
              </button>
            </header>
            <div className="modal-body">
              {modal.kind === "map" ? (
                <div className="screen-map">
                  {Object.entries(routeNames).map(([path, name]) => (
                    <button
                      key={path}
                      onClick={() =>
                        navigate(
                          ["job"].includes(path)
                            ? path + "/" + (state.jobs[0]?.id || "missing")
                            : [
                                  "workspace",
                                  "write",
                                  "submission",
                                  "prep",
                                ].includes(path)
                              ? path + "/" + (state.apps[0]?.id || "missing")
                              : path,
                        )
                      }
                    >
                      <strong>{name}</strong>
                    </button>
                  ))}
                </div>
              ) : null}
              {modal.text && modal.kind !== "question" && (
                <p className="fine mb-16">{modal.text}</p>
              )}
              {modal.kind === "source" &&
                modal.text &&
                (safeURL(modal.text) ||
                  /^\/api\/files\/[a-f0-9-]+$/.test(modal.text)) && (
                  <a
                    className="btn small"
                    href={modal.text}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    원문 열기 <Icon name="external" />
                  </a>
                )}
              {modal.fields?.map((f) => (
                <div className="field" key={f.name}>
                  <label htmlFor={"modal-field-" + f.name}>{f.label}</label>
                  {f.options ? (
                    <select
                      id={"modal-field-" + f.name}
                      value={form[f.name] ?? ""}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                    >
                      {f.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      id={"modal-field-" + f.name}
                      rows={5}
                      value={form[f.name] ?? ""}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                    />
                  ) : (
                    <input
                      id={"modal-field-" + f.name}
                      type={f.type || "text"}
                      checked={
                        f.type === "checkbox" ? !!form[f.name] : undefined
                      }
                      value={
                        f.type === "checkbox" ? undefined : (form[f.name] ?? "")
                      }
                      onChange={(e) =>
                        setForm((v) => ({
                          ...v,
                          [f.name]:
                            f.type === "checkbox"
                              ? e.target.checked
                              : e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}

              {modal.kind === "profile" && (
                <>
                  <button
                    className="btn small"
                    onClick={() => setProfileCompare((v) => !v)}
                  >
                    기본 프로필과 비교
                  </button>
                  {profileCompare && (
                    <>
                      <p className="fine mt-12">
                        가져올 항목을 선택하세요. 현재 편집 입력과 비교하며
                        선택한 항목만 바꿉니다. 저장 전에는 지원 작업본에
                        반영되지 않습니다.
                      </p>
                      {(
                        [
                          ["summary", "소개"],
                          ["skills", "기술"],
                          ["portfolio", "포트폴리오 URL"],
                        ] as const
                      ).map(([key, label]) => (
                        <section className="meta-box mt-12" key={key}>
                          <label className="row gap-8">
                            <input
                              type="checkbox"
                              checked={!!profileSelection[key]}
                              onChange={(e) =>
                                setProfileSelection((v) => ({
                                  ...v,
                                  [key]: e.target.checked,
                                }))
                              }
                            />
                            {label} 가져오기
                          </label>
                          <div className="compare-cols mt-12">
                            <div>
                              <h3>이번 지원 입력</h3>
                              <div className="compare-text">
                                {form[key] || "입력 없음"}
                              </div>
                            </div>
                            <div>
                              <h3>기본 프로필</h3>
                              <div className="compare-text">
                                {state.profile[key] || "입력 없음"}
                              </div>
                            </div>
                          </div>
                        </section>
                      ))}
                      <button
                        className="btn primary mt-12"
                        disabled={
                          !Object.values(profileSelection).some(Boolean)
                        }
                        onClick={() => {
                          setForm((v) => ({
                            ...v,
                            ...Object.fromEntries(
                              Object.keys(profileSelection)
                                .filter((k) => profileSelection[k])
                                .map((k) => [
                                  k,
                                  state.profile[
                                    k as "summary" | "skills" | "portfolio"
                                  ],
                                ]),
                            ),
                          }));
                          setProfileCompare(false);
                          setProfileSelection({});
                        }}
                      >
                        선택 항목을 편집 입력으로 가져오기
                      </button>
                    </>
                  )}
                </>
              )}
              {modal.kind === "stages" && (
                <>
                  <div id="stage-draft">
                    {stageDraft
                      .filter((st) => !st.softDeleted)
                      .map((st, i, active) => (
                        <section className="meta-box mb-16" key={st.id}>
                          <div className="row between mb-16">
                            <strong style={{ fontSize: 12 }}>
                              단계 {i + 1}
                            </strong>
                            <div className="row gap-6">
                              <button
                                className="btn ghost icon-only"
                                disabled={i === 0}
                                title="위로 이동"
                                aria-label="위로 이동"
                                onClick={() =>
                                  setStageDraft((all) => {
                                    const items = all.filter(
                                      (x) => !x.softDeleted,
                                    );
                                    [items[i - 1], items[i]] = [
                                      items[i],
                                      items[i - 1],
                                    ];
                                    return [
                                      ...items,
                                      ...all.filter((x) => x.softDeleted),
                                    ];
                                  })
                                }
                              >
                                <Icon name="up" />
                              </button>
                              <button
                                className="btn ghost icon-only"
                                disabled={i === active.length - 1}
                                title="아래로 이동"
                                aria-label="아래로 이동"
                                onClick={() =>
                                  setStageDraft((all) => {
                                    const items = all.filter(
                                      (x) => !x.softDeleted,
                                    );
                                    [items[i + 1], items[i]] = [
                                      items[i],
                                      items[i + 1],
                                    ];
                                    return [
                                      ...items,
                                      ...all.filter((x) => x.softDeleted),
                                    ];
                                  })
                                }
                              >
                                <Icon name="down" />
                              </button>
                              <button
                                className="btn ghost icon-only danger"
                                disabled={active.length === 1}
                                title="단계 제외 (저장 전 적용 안 됨)"
                                aria-label="단계 제외 (저장 전 적용 안 됨)"
                                onClick={() =>
                                  setStageDraft((all) =>
                                    all.map((x) =>
                                      x.id === st.id
                                        ? { ...x, softDeleted: true }
                                        : x,
                                    ),
                                  )
                                }
                              >
                                <Icon name="trash" />
                              </button>
                            </div>
                          </div>
                          <div className="form-grid">
                            <div className="field">
                              <label htmlFor={"st-name-" + st.id}>
                                단계 이름
                              </label>
                              <input
                                id={"st-name-" + st.id}
                                value={st.name}
                                onChange={(e) =>
                                  setStageDraft((all) =>
                                    all.map((x) =>
                                      x.id === st.id
                                        ? { ...x, name: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="field">
                              <label htmlFor={"st-type-" + st.id}>
                                전형 유형
                              </label>
                              <select
                                id={"st-type-" + st.id}
                                value={st.type}
                                onChange={(e) =>
                                  setStageDraft((all) =>
                                    all.map((x) =>
                                      x.id === st.id
                                        ? { ...x, type: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              >
                                {[
                                  ["document", "서류"],
                                  ["coding", "코딩테스트"],
                                  ["task", "과제"],
                                  ["interview", "면접"],
                                  ["hr", "조직적합성"],
                                  ["other", "기타"],
                                ].map(([v, l]) => (
                                  <option key={v} value={v}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="field">
                              <label htmlFor={"st-date-" + st.id}>
                                일정 날짜 (선택)
                              </label>
                              <input
                                id={"st-date-" + st.id}
                                type="date"
                                value={st.date}
                                onChange={(e) =>
                                  setStageDraft((all) =>
                                    all.map((x) =>
                                      x.id === st.id
                                        ? { ...x, date: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="field">
                              <label htmlFor={"st-time-" + st.id}>
                                시간 (선택)
                              </label>
                              <input
                                id={"st-time-" + st.id}
                                type="time"
                                value={st.time}
                                onChange={(e) =>
                                  setStageDraft((all) =>
                                    all.map((x) =>
                                      x.id === st.id
                                        ? { ...x, time: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </div>
                        </section>
                      ))}
                  </div>
                  <button
                    className="btn small"
                    onClick={() =>
                      setStageDraft((all) => [
                        ...all,
                        {
                          id: uid("stage"),
                          name: "새 전형",
                          type: "other",
                          state: "대기",
                          date: "",
                          time: "",
                        },
                      ])
                    }
                  >
                    <Icon name="plus" />
                    단계 추가
                  </button>
                </>
              )}
              {modal.kind === "source-edit" && (
                <div className="field">
                  <label htmlFor="source-file">
                    파일 등록 (PDF/TXT/MD/DOCX · 최대 1MB)
                  </label>
                  <input
                    id="source-file"
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    onChange={(e) =>
                      setSelectedUpload(e.target.files?.[0] ?? null)
                    }
                  />
                  <span id="source-file-name" className="field-help">
                    {selectedUpload
                      ? selectedUpload.name
                      : "파일 내용을 보관하며 원문 분석은 별도입니다."}
                  </span>
                </div>
              )}
              {["tasks", "task-compare"].includes(modal.kind) && taskError && (
                <div className="notice amber" role="alert">
                  {taskError}
                </div>
              )}
              {modal.kind === "tasks" && (
                <>
                  {!tasks.length && (
                    <p className="fine">등록된 AI 작업이 없습니다.</p>
                  )}
                  {tasks.map((task) => (
                    <article className="source-row" key={task.id}>
                      <div className="row between">
                        <h3>
                          {task.type === "draft"
                            ? "자기소개서 초안"
                            : task.type === "questions"
                              ? "제출본 기준 질문"
                              : "공고 검색"}
                        </h3>
                        <Tag tone={task.status === "failed" ? "amber" : ""}>
                          {taskLabels[task.status] || task.status}
                        </Tag>
                      </div>
                      {task.error_code && (
                        <p className="fine">
                          작업을 완료하지 못했습니다. {task.error_code}
                        </p>
                      )}
                      <div className="row mt-12">
                        {["queued", "running"].includes(task.status) && (
                          <button
                            className="btn small"
                            disabled={taskBusy}
                            onClick={() => void taskAction("cancel", task.id)}
                          >
                            취소
                          </button>
                        )}
                        {["failed", "cancelled"].includes(task.status) && (
                          <button
                            className="btn small"
                            disabled={taskBusy}
                            onClick={() => void taskAction("retry", task.id)}
                          >
                            재시도
                          </button>
                        )}
                        {task.status === "succeeded" &&
                          task.type !== "search" && (
                            <button
                              className="btn small"
                              onClick={() => act("task-compare", task.id)}
                            >
                              현재 글과 비교
                            </button>
                          )}
                      </div>
                    </article>
                  ))}
                </>
              )}
              {modal.kind === "task-compare" && compareTask && (
                <>
                  <p className="fine mb-16">
                    요청 후 수정한 내용은 자동으로 덮어쓰지 않습니다. 사실과
                    분량을 확인한 다음 직접 적용해 주세요.
                  </p>
                  <div className="compare-cols">
                    <section>
                      <h3 className="mb-16">현재 작업본</h3>
                      <div className="compare-text">
                        {compareQuestion?.text ||
                          "제출본에 연결된 기존 질문을 유지합니다."}
                      </div>
                    </section>
                    <section>
                      <h3 className="mb-16">생성 결과</h3>
                      <div className="compare-text">
                        {compareTask.result?.text ||
                          compareTask.result?.questions
                            ?.map((q) =>
                              [
                                q.title || q.question,
                                q.origin,
                                q.follow,
                                q.study,
                              ]
                                .filter(Boolean)
                                .join("\n"),
                            )
                            .join("\n\n") ||
                          "결과가 비어 있습니다."}
                      </div>
                    </section>
                  </div>
                  <div className="row mt-16">
                    <button
                      className="btn small"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(
                            compareTask.result?.text ||
                              compareTask.result?.questions
                                ?.map((q) => q.title || q.question)
                                .join("\n") ||
                              "",
                          )
                          .then(() =>
                            setMessage(
                              "생성 결과를 복사했습니다. 제출 처리하지 않았습니다.",
                            ),
                          )
                          .catch(() =>
                            setTaskError("복사 권한을 확인해 주세요."),
                          )
                      }
                    >
                      결과 복사
                    </button>
                    <button
                      className="btn primary"
                      disabled={taskBusy || !compareTask.result}
                      onClick={() => void taskAction("apply", compareTask.id)}
                    >
                      확인한 결과 적용
                    </button>
                  </div>
                </>
              )}

              {modal.kind === "slack-preview" && (
                <>
                  <div className="slack-preview">
                    <span className="bot">준</span>
                    <div className="grow slack-msg">
                      <div className="row wrap gap-6">
                        <strong>준비실</strong>
                        <Tag>앱</Tag>
                        <span className="fine" style={{ fontSize: 10 }}>
                          미리보기 · 발송 없음
                        </span>
                      </div>
                      <p className="mt-8">
                        <strong>공고 갱신 요약</strong>
                      </p>
                      <blockquote>
                        실제 갱신 결과의 신규·변경 건수와 회사·직무·채용 원문
                        링크를 표시합니다.
                      </blockquote>
                      <p className="mt-12">
                        <strong>접수 마감 D-1 · 당일</strong>
                      </p>
                      <blockquote>
                        미제출·미포기 지원 중 현재 유효한 접수 기한만
                        안내합니다. 제출·포기 후 발송을 중단합니다.
                      </blockquote>
                      <p className="fine mt-12">
                        #job-alerts · 생성 완료·D-3·면접·과제·회신 알림은 보내지
                        않습니다.
                      </p>
                    </div>
                  </div>
                  <p className="fine mt-16">
                    Webhook을 사용하거나 실제 메시지를 전송하지 않았습니다. 실제
                    발송 시험은 별도 확인이 필요합니다.
                  </p>
                </>
              )}
              {modal.kind === "review" && (
                <>
                  <div className="segmented">
                    {[
                      ["hr", "채용담당자"],
                      ["senior", "시니어 개발자"],
                      ["tone", "문체 편집"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        className={ui.reviewPersona === v ? "active" : ""}
                        onClick={() => act("review-persona", "", v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="mt-20">
                    <div className="notice">
                      <Icon name="info" />
                      <div>
                        아래는 고정된 검토 기준입니다. 실제 AI 평가나 사실 검증
                        결과가 아닙니다.
                      </div>
                    </div>
                  </div>
                  <div className="review-comment mt-20">
                    <small>
                      {ui.reviewPersona === "hr"
                        ? "채용담당자 관점"
                        : ui.reviewPersona === "senior"
                          ? "시니어 개발자 관점"
                          : "문체 편집 관점"}
                    </small>
                    {ui.reviewPersona === "hr"
                      ? "문항이 요구하는 문제, 행동, 배운 점이 각각 드러나는지 봅니다."
                      : ui.reviewPersona === "senior"
                        ? "왜 그 방식을 선택했는지와 직접 확인한 결과를 구분해 설명하는지 봅니다."
                        : "상투적인 다짐보다 실제 판단과 행동이 중심인지 봅니다."}
                  </div>
                  <div className="review-comment">
                    <small>사용자가 확인할 부분</small>
                    {ui.reviewPersona === "hr"
                      ? "같은 경험을 다른 문항에서 반복하고 있지 않은지 확인해 보세요."
                      : ui.reviewPersona === "senior"
                        ? "선택한 기술이 필요한 이유와 검증 방법을 직접 설명할 수 있는지 확인해 주세요."
                        : "사용하지 않는 표현이나 과장된 수식어를 덜고 본인이 말할 수 있는 문장으로 바꿔보세요."}
                  </div>
                  <hr />
                  <h3>프로그램으로 확인한 분량</h3>
                  <div className="row wrap gap-6 mt-12">
                    <Tag tone={within ? "green" : "amber"}>
                      {count}
                      {question.unit === "bytes" ? " bytes" : "자"}
                    </Tag>
                    <Tag tone="outline">
                      {question.min}–{question.max} 허용 범위
                    </Tag>
                  </div>
                  <p className="fine mt-12">
                    분량 충족은 사실성이나 합격 가능성을 의미하지 않습니다.
                  </p>
                </>
              )}
              {modal.kind === "versions" && (
                <>
                  <p className="fine mb-16">
                    현재 문항: {question.title}. 복원할 때도 현재 글을 이전
                    버전으로 남깁니다.
                  </p>
                  {modalApp?.versions
                    .filter((v) => v.questionId === question.id)
                    .map((v) => (
                      <div className="version-row" key={v.id}>
                        <span className="connection-mark">
                          <Icon name="history" small />
                        </span>
                        <div className="grow">
                          <h3 style={{ fontSize: 12 }}>{v.label}</h3>
                          <p className="fine">
                            {v.date} · {Array.from(v.text).length}자
                          </p>
                        </div>
                        <button
                          className="btn small"
                          onClick={() =>
                            act("restore-version", v.id, modalApp.id)
                          }
                        >
                          복원
                        </button>
                      </div>
                    ))}
                  {!modalApp?.versions.some(
                    (v) => v.questionId === question.id,
                  ) && (
                    <p className="fine">아직 저장된 이전 버전이 없습니다.</p>
                  )}
                  <button
                    className="btn primary mt-16"
                    onClick={() => act("save-version", modal.id)}
                  >
                    <Icon name="plus" />
                    현재 글 버전 저장
                  </button>
                </>
              )}
              {modal.kind === "snapshots" &&
                modalApp?.snapshots.map((s) => (
                  <article className="source-row" key={s.id}>
                    <h3>
                      제출본 v{s.version} · {s.date}
                    </h3>
                    <p className="detail-copy mt-12">{s.profile.summary}</p>
                    {(s.sources || []).map((source) => (
                      <div className="source-actions" key={source.id}>
                        {source.fileId ? (
                          <a
                            href={`/api/files/${encodeURIComponent(source.fileId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {source.title} <Icon name="download" small />
                          </a>
                        ) : (
                          <span className="fine">
                            {source.title} · 링크 등록 자료
                          </span>
                        )}
                      </div>
                    ))}
                    {s.questions.map((q) => (
                      <section key={q.id}>
                        <h3>{q.title}</h3>
                        <p className="detail-copy">{q.text}</p>
                      </section>
                    ))}
                  </article>
                ))}
            </div>
            <footer className="modal-footer">
              <button className="btn" onClick={close}>
                닫기
              </button>
              {modal.kind.startsWith("delete-") && (
                <button
                  className="btn danger"
                  onClick={() => void applyModal()}
                >
                  목록에서 제외
                </button>
              )}
              {modal.kind === "experience" && modal.id && (
                <button
                  className="btn danger"
                  onClick={() => act("delete-experience", modal.id)}
                >
                  목록에서 제외
                </button>
              )}
              {modal.kind === "question" && modal.text && (
                <button
                  className="btn danger"
                  onClick={() => act("delete-question", modal.text)}
                >
                  문항 제외
                </button>
              )}
              {modal.fields && (
                <button
                  className="btn primary"
                  disabled={taskBusy}
                  onClick={() => void applyModal()}
                >
                  {modal.kind === "submit"
                    ? "제출본 확정"
                    : modal.kind === "question-submission"
                      ? "선택한 제출본으로 질문 생성"
                      : "저장"}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
      <div
        id="toasts"
        className="toast-stack"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {message && (
          <div className="toast">
            <Icon name="info" />
            {message}
          </div>
        )}
      </div>
    </Context.Provider>
  );
}
export const AppProvider = FixtureProvider;
export function Tag({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Logo({ job, big = false }: { job: Job; big?: boolean }) {
  return (
    <span
      className={`company-logo ${job.color || ""} ${big ? "big" : ""}`}
      aria-hidden="true"
    >
      {job.mark}
    </span>
  );
}
function daysUntil(date: string) {
  return Math.round(
    (new Date(date + "T12:00:00+09:00").getTime() -
      new Date(
        (new URLSearchParams(location.search).get("fixture") === "1"
          ? "2026-09-16"
          : new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Seoul",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date())) + "T12:00:00+09:00",
      ).getTime()) /
      86400000,
  );
}
function shortDate(date: string | null) {
  return date ? date.slice(5).replace("-", ".") : "미확인";
}
function deadlineInfo(job: Job) {
  if (job.closeType === "rolling") return { label: "상시채용", tone: "green" };
  if (!job.deadline) return { label: "기한 미확인", tone: "" };
  const days = daysUntil(job.deadline);
  const fixture = new URLSearchParams(location.search).get("fixture") === "1";
  const expired =
    days < 0 ||
    (!fixture &&
      !!job.time &&
      Date.now() >= Date.parse(`${job.deadline}T${job.time}:00+09:00`));
  return {
    label: expired
      ? fixture
        ? "접수기간 종료"
        : "기재된 접수기간 종료"
      : days === 0
        ? !fixture && !job.time
          ? "오늘 마감 · 시간 미확인"
          : "오늘 마감"
        : `D-${days}`,
    tone: !expired && days <= 3 ? "amber" : "",
  };
}
function useFilteredJobs() {
  const { state, tab, saved, search, experience, deadline } = useFixture();
  return state.jobs
    .filter(
      (j) =>
        (tab !== "saved" || saved.includes(j.id)) && (tab !== "new" || j.new),
    )
    .filter(
      (j) =>
        !search ||
        [j.company, j.title, ...j.skills, j.domain]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .filter((j) => experience === "all" || j.exp === experience)
    .filter(
      (j) =>
        deadline === "all" ||
        (deadline === "ended"
          ? j.deadline && deadlineInfo(j).label.includes("종료")
          : deadline === "fixed"
            ? j.closeType === "fixed" &&
              j.deadline &&
              !deadlineInfo(j).label.includes("종료")
            : j.closeType === deadline),
    );
}
export function JobTable({
  compact = false,
  jobs,
}: {
  compact?: boolean;
  jobs?: Job[];
}) {
  const { state, fixture, saved, act } = useFixture();
  const rows = jobs ?? state.jobs.filter((j) => j.new).slice(0, 4);
  if (!rows.length)
    return (
      <div className="empty">
        <div className="empty-icon">
          <Icon name="search" />
        </div>
        <h3>
          {fixture
            ? "조건에 맞는 예시 공고가 없습니다."
            : "등록된 조건에 맞는 공고가 없습니다."}
        </h3>
        <p>필터를 바꾸거나 검색어를 지워보세요.</p>
        <button className="btn small" onClick={() => act("reset-filters")}>
          <Icon name="refresh" />
          <span>필터 초기화</span>
        </button>
      </div>
    );
  return (
    <div className="table-wrap">
      <table className={`job-table ${compact ? "compact" : ""}`}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <span className="sr-only">관심 저장</span>
            </th>
            <th>회사 · 직무</th>
            <th>경력 조건</th>
            {!compact && <th>게시일</th>}
            <th>마감</th>
            {!compact && <th>출처</th>}
            <th style={{ width: 45 }}>
              <span className="sr-only">상세 보기</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => {
            const d = deadlineInfo(j),
              isSaved = saved.includes(j.id);
            return (
              <tr key={j.id}>
                <td>
                  <button
                    className={`bookmark ${isSaved ? "saved" : ""}`}
                    data-action="bookmark"
                    data-id={j.id}
                    onClick={() => act("bookmark", j.id)}
                    aria-label={`${j.company} 관심 ${isSaved ? "해제" : "저장"}`}
                    aria-pressed={isSaved}
                  >
                    <Icon name="bookmark" small />
                  </button>
                </td>
                <td>
                  <div className="row gap-12">
                    <Logo job={j} />
                    <div>
                      <div className="company-label">
                        {j.company}
                        {j.new && (
                          <span
                            className="accent"
                            style={{ marginLeft: 7, fontSize: 10 }}
                          >
                            새로 발견
                          </span>
                        )}
                      </div>
                      <button
                        className="job-title-btn"
                        data-action="go"
                        data-val={`job/${j.id}`}
                        onClick={(e) =>
                          act("go", "", `job/${j.id}`, e.currentTarget)
                        }
                      >
                        {j.title}
                      </button>
                      <div
                        className="fine"
                        style={{ fontSize: 10, marginTop: 3 }}
                      >
                        {j.region} · {j.domain}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="nowrap">{j.exp}</span>
                  <div className="fine" style={{ fontSize: 10, marginTop: 3 }}>
                    {j.type}
                  </div>
                </td>
                {!compact && (
                  <td className="muted nowrap">{shortDate(j.posted)}</td>
                )}
                <td>
                  <Tag tone={d.tone}>{d.label}</Tag>
                  <div className="fine" style={{ fontSize: 10, marginTop: 5 }}>
                    {j.deadline
                      ? shortDate(j.deadline) +
                        (j.time ? " " + j.time : " · 시간 미확인")
                      : j.closeType === "rolling"
                        ? "개인 목표일로 준비"
                        : "원문 확인 필요"}
                  </div>
                </td>
                {!compact && (
                  <td>
                    <button
                      className="link-btn"
                      onClick={(e) =>
                        act("source-job", j.id, "", e.currentTarget)
                      }
                    >
                      원문 {j.sources}곳 <Icon name="external" small />
                    </button>
                  </td>
                )}
                <td>
                  <button
                    type="button"
                    className="btn ghost icon-only"
                    title="공고 상세 보기"
                    aria-label="공고 상세 보기"
                    onClick={(e) =>
                      act("go", "", `job/${j.id}`, e.currentTarget)
                    }
                  >
                    <Icon name="chevron" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function JobTabs() {
  const { state, saved, tab, act } = useFixture();
  return (
    <div className="tabs" role="tablist" aria-label="공고 분류">
      {[
        ["all", "전체 공고", state.jobs.length],
        ["new", "새로 발견", state.jobs.filter((j) => j.new).length],
        ["saved", "관심 공고", saved.length],
      ].map(([v, label, count]) => (
        <button
          key={v}
          className={`tab ${tab === v ? "active" : ""}`}
          role="tab"
          aria-selected={tab === v}
          data-action="jobs-tab"
          data-val={v}
          onClick={() => act("jobs-tab", "", String(v))}
        >
          {label}
          <span className="mini-count">{count}</span>
        </button>
      ))}
    </div>
  );
}
export function JobResults() {
  const jobs = useFilteredJobs(),
    { search, fixture } = useFixture();
  return (
    <div id="job-results">
      <div className="row between mb-16">
        <span className="fine">
          <strong>{jobs.length}</strong>개 공고{" "}
          {search ? `· “${search}” 검색` : ""}
        </span>
        <span className="fine">
          {fixture ? "최신 발견순 · 시안 데이터" : "저장된 공고"}
        </span>
      </div>
      <section className="panel">
        <JobTable jobs={jobs} />
        <div className="table-bottom">
          <span>
            {fixture
              ? `예시 ${jobs.length}건 표시 · 원문은 미리보기로 열립니다.`
              : `${jobs.length}건 표시 · 원문 확인 후 지원하세요.`}
          </span>
          <span>1 / 1</span>
        </div>
      </section>
    </div>
  );
}
export function QuestionNav() {
  const { question, questions, act } = useFixture();
  return (
    <nav className="question-nav" aria-label="자기소개서 문항">
      {questions.map((q, i) => (
        <button
          key={q.id}
          data-action="select-question"
          data-id={q.id}
          className={q.id === question.id ? "active" : ""}
          aria-current={q.id === question.id ? "page" : undefined}
          onClick={() => act("select-question", q.id)}
        >
          <div className="q-no">QUESTION {String(i + 1).padStart(2, "0")}</div>
          <div className="q-name">{q.title}</div>
          <div className="q-foot">
            {q.text
              ? countText(q) + (q.unit === "bytes" ? " bytes" : "자")
              : "아직 작성하지 않음"}
          </div>
        </button>
      ))}
      <button
        type="button"
        className="btn ghost small w-full"
        data-action="add-question"
        onClick={(e) => act("add-question", "a1", "", e.currentTarget)}
      >
        <Icon name="plus" />
        <span>문항 추가</span>
      </button>
    </nav>
  );
}
export function EditorQuestion() {
  const { question, questions, act } = useFixture();
  return (
    <div className="editor-question">
      <div className="row between mb-16">
        <span className="eyebrow" style={{ margin: 0 }}>
          QUESTION {String(questions.indexOf(question) + 1).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="btn ghost small"
          data-action="edit-question"
          onClick={(e) => act("edit-question", "a1", "", e.currentTarget)}
        >
          <Icon name="edit" />
          <span>문항 수정</span>
        </button>
      </div>
      <h2>{question.prompt}</h2>
      <div className="row wrap gap-6 mt-12">
        <Tag tone="outline">
          {question.min}–{question.max}
          {question.unit === "bytes" ? " bytes" : "자"}
        </Tag>
        <Tag tone="outline">{question.spaces ? "공백 포함" : "공백 제외"}</Tag>
        <Tag tone="green">초안</Tag>
      </div>
    </div>
  );
}
