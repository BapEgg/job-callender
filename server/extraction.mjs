import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const exec = promisify(execFile);
const MAX_TEXT = 50000;
let active = 0;

export async function extractFile(file, filename, run = exec) {
  const base = { text: "", pages: null, sha256: file.sha256 };
  const reply = (status, message, extra = {}) => ({
    ...base,
    status,
    message,
    ...extra,
  });
  if (active >= 2)
    return reply(
      "failed",
      "다른 자료를 읽고 있습니다. 잠시 후 다시 시도해 주세요.",
    );
  active++;
  try {
    const bytes = await fs.readFile(filename);
    if (
      bytes.length > 1_000_000 ||
      createHash("sha256").update(bytes).digest("hex") !== file.sha256
    )
      return reply(
        "failed",
        "원본 파일 확인에 실패했습니다. 원본을 다시 확인해 주세요.",
      );
    let text;
    if (["text/plain", "text/markdown"].includes(file.mime)) {
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        return reply(
          "needs_text",
          "UTF-8 문서가 아닙니다. 내용을 직접 붙여넣어 주세요.",
        );
      }
    } else if (file.mime === "application/pdf") {
      if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
        return reply(
          "failed",
          "PDF 형식을 읽을 수 없습니다. 원본은 그대로 보관됩니다.",
        );
      const options = {
        timeout: 15000,
        maxBuffer: 1_000_000,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, LC_ALL: "C" },
      };
      const info = (await run("pdfinfo", [filename], options)).stdout;
      const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (!Number.isInteger(pages) || pages < 1 || pages > 50)
        return reply(
          "needs_text",
          "현재 50쪽 이하 PDF를 읽을 수 있습니다. 필요한 내용을 직접 붙여넣어 주세요.",
        );
      base.pages = pages;
      if (/^Encrypted:\s+yes/im.test(info))
        return reply(
          "needs_text",
          "암호화된 PDF입니다. 열람 가능한 내용을 직접 붙여넣어 주세요.",
        );
      text = (
        await run(
          "pdftotext",
          [
            "-enc",
            "UTF-8",
            "-layout",
            "-f",
            "1",
            "-l",
            String(pages),
            filename,
            "-",
          ],
          options,
        )
      ).stdout;
    } else {
      return reply(
        "unsupported",
        "이 형식은 원본 보관만 지원합니다. 내용을 직접 붙여넣어 주세요.",
      );
    }
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\f/g, "\n\n")
      .replace(/[\u0000-\u0008\u000b\u000e-\u001f]/g, "")
      .trim();
    if (!text)
      return reply(
        "needs_text",
        "읽을 수 있는 글자가 없습니다. 스캔·이미지 PDF는 내용을 직접 붙여넣어 주세요.",
      );
    if (text.length > MAX_TEXT)
      return reply(
        "needs_text",
        "추출 내용이 5만 자를 넘습니다. 필요한 부분을 직접 붙여넣어 주세요.",
      );
    return reply(
      "ready",
      "추출한 내용은 아직 확인 전입니다. 원본과 대조하고 필요한 부분을 수정해 주세요.",
      { text },
    );
  } catch {
    // 도구 stderr에는 문서 내용/경로가 포함될 수 있어 응답·로그로 노출하지 않는다.
    return reply(
      "failed",
      "파일 내용을 읽지 못했습니다. 원본은 보관되어 있으며 내용을 직접 붙여넣을 수 있습니다.",
    );
  } finally {
    active--;
  }
}
