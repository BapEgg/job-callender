export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: unknown,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "응답을 읽지 못했습니다." }));
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error || data.message || "요청을 처리하지 못했습니다.",
      data,
    );
  return data;
}
