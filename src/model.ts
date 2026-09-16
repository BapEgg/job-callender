import { seed } from "./fixtures/seed";
export type Question = (typeof seed.apps)[number]["questions"][number] & {
  softDeleted?: boolean;
};
export type Job = (typeof seed.jobs)[number] & {
  manualURL?: string;
  lastCheckedAt?: string | null;
};
export type Profile = typeof seed.profile;
export type Stage = (typeof seed.apps)[number]["stages"][number] & {
  note?: string;
  softDeleted?: boolean;
};
export type QA = (typeof seed.apps)[number]["qa"][number];
export type Snapshot = (typeof seed.apps)[number]["snapshots"][number] & {
  submissionId?: string;
  sources?: Source[];
  experiences?: (typeof seed.experiences)[number][];
};
export type Application = Omit<
  (typeof seed.apps)[number],
  "todo" | "notes" | "versions" | "snapshots" | "questions" | "stages"
> & {
  questions: Question[];
  stages: Stage[];
  versions: {
    id: string;
    label: string;
    date: string;
    questionId: string;
    text: string;
  }[];
  snapshots: Snapshot[];
  todo: Record<string, boolean>;
  notes: unknown[];
  evidence?: Record<string, boolean>;
  stageQA?: Record<string, QA[]>;
};
export type Note = {
  softDeleted?: boolean;
  id: string;
  title: string;
  content: string;
  type: string;
  url: string;
  appId: string;
  studyKey?: string;
};
export type Source = (typeof seed.sources)[number] & {
  softDeleted?: boolean;
  fileId?: string;
  sha256?: string;
  size?: number;
  deletedAt?: string;
};
export type AppState = Omit<
  typeof seed,
  | "apps"
  | "jobs"
  | "notes"
  | "researchSaved"
  | "feedback"
  | "sources"
  | "experiences"
  | "events"
> & {
  experiences: ((typeof seed.experiences)[number] & {
    softDeleted?: boolean;
  })[];
  events: ((typeof seed.events)[number] & { softDeleted?: boolean })[];
  sources: Source[];
  apps: Application[];
  jobs: Job[];
  notes: Note[];
  researchSaved: string[];
  feedback: { id: string; page: string; type: string; text: string }[];
};
export const emptyState = (): AppState => ({
  ...structuredClone(seed),
  profile: Object.fromEntries(
    Object.keys(seed.profile).map((k) => [k, ""]),
  ) as Profile,
  jobs: [],
  apps: [],
  sources: [],
  experiences: [],
  events: [],
  notes: [],
  saved: [],
  researchSaved: [],
  feedback: [],
  settings: {
    ...seed.settings,
    runner: false,
    slack: false,
    days: [1, 0],
    lastSuccess: "",
    batchDone: false,
    newCount: 0,
  },
  onboardComplete: false,
});
export const fixtureState = (): AppState => structuredClone(seed) as AppState;
