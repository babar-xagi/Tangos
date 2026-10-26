import { HttpError } from "./errors";
import type { RequestBody } from "./types";

function mediaType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isJsonContentType(contentType: string): boolean {
  const type = mediaType(contentType);
  return type === "application/json" || type.endsWith("+json");
}

function isFormContentType(contentType: string): boolean {
  const type = mediaType(contentType);
  return type === "multipart/form-data" || type === "application/x-www-form-urlencoded";
}

function tooLarge(maxBytes: number): HttpError {
  return HttpError.payloadTooLarge(`Request body exceeds the ${maxBytes} byte limit.`);
}

async function readLimitedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw tooLarge(maxBytes);
    }
  }

  const body = request.body;
  if (body === null) {
    return new Uint8Array();
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw tooLarge(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Creates cached, lazily-read body accessors for one request.
 *
 * - Size limits apply to every reader.
 * - `json` requires a JSON content type.
 * - `formData` requires multipart or URL-encoded form data.
 * - The underlying stream is read at most once.
 */
export function createRequestBody(request: Request, maxBytes: number): RequestBody {
  let cached: Promise<Uint8Array> | undefined;
  let formDataCache: Promise<FormData> | undefined;

  function readBytes(): Promise<Uint8Array> {
    cached ??= readLimitedBody(request, maxBytes);
    return cached;
  }

  async function json<T>(): Promise<T> {
    if (!isJsonContentType(request.headers.get("content-type") ?? "")) {
      throw HttpError.unsupportedMediaType("Expected a JSON content type.");
    }

    const bytes = await readBytes();
    if (bytes.byteLength === 0) {
      throw new HttpError("Request body is empty.", {
        code: "INVALID_JSON",
        status: 400,
      });
    }

    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as T;
    } catch {
      throw new HttpError("Request body is not valid JSON.", {
        code: "INVALID_JSON",
        status: 400,
      });
    }
  }

  async function text(): Promise<string> {
    return new TextDecoder().decode(await readBytes());
  }

  async function formData(): Promise<FormData> {
    const contentType = request.headers.get("content-type") ?? "";
    if (!isFormContentType(contentType)) {
      throw HttpError.unsupportedMediaType(
        "Expected multipart/form-data or application/x-www-form-urlencoded.",
      );
    }

    const pending =
      formDataCache ??
      (async (): Promise<FormData> => {
        const bytes = await readBytes();
        try {
          const data = await new Response(bytes, {
            headers: { "content-type": contentType },
          }).formData();
          return data as unknown as FormData;
        } catch {
          throw new HttpError("Request body is not valid form data.", {
            code: "INVALID_FORM_DATA",
            status: 400,
          });
        }
      })();
    formDataCache = pending;

    return pending;
  }

  async function arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = await readBytes();
    return bytes.slice().buffer;
  }

  return { arrayBuffer, formData, json, text };
}
