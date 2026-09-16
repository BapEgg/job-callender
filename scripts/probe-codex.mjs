import fs from "node:fs/promises";
import { draftOrQuestions } from "../runner/adapters.mjs";
const executable = process.env.JOBPREP_CODEX_EXE;
if (!executable)
  throw Error("Set JOBPREP_CODEX_EXE to the verified installed executable.");
const task = {
  type: "draft",
  input: {
    baseRevision: 0,
    questionId: "fixture-q",
    question: {
      prompt: "검증된 사실만 100자 이내로 설명하세요.",
      min: 1,
      max: 100,
      spaces: true,
      unit: "chars",
      text: "",
    },
    job: { company: "가상 시험 회사", title: "가상 시험 직무" },
    profile: {
      summary:
        "구독 CLI와 프로그램 연결을 검증하는 가상 자료입니다. 실제 사용자 경력이 아닙니다.",
    },
    experiences: [
      {
        id: "fixture-e",
        confirmed: true,
        title: "격리 테스트",
        role: "가상 시험 담당",
        body: "예시 문자열을 입력하고 프로그램이 저장한 값과 같은지 확인했다. 성과 수치나 실제 경력은 없다.",
      },
    ],
  },
};
if(process.argv.includes('--questions')){
  task.type='questions';
  task.input={baseRevision:0,submissionId:'fixture-submission',snapshot:{id:'fixture-submission',version:1,profile:task.input.profile,questions:[{id:'fixture-q',prompt:'확인한 경험',text:'격리 테스트에서 예시 문자열을 입력하고 저장된 값과 같은지 확인했다. 실제 경력이 아닌 가상 시험 자료다.'}]}};
}
const result = await draftOrQuestions(task, executable);
await fs.mkdir("artifacts/automation", { recursive: true });
await fs.writeFile(
  `artifacts/automation/codex-${task.type}-probe.json`,
  JSON.stringify(
    {
      scope: "synthetic data only, not the user career",
      model: "gpt-6-astra",
      reasoning: "medium",
      ...result,
    },
    null,
    2,
  ),
);
console.log(
  result.errorCode
    ? `Codex probe blocked: ${result.errorCode}`
    : `Codex ${task.type} fixture response received. User experience not tested.`,
);
