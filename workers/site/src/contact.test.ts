// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_MESSAGE_MAX_LENGTH } from "../../../src/lib/contact/rules";
import { type ContactDeps, handleContact } from "./contact";

const SITE = "https://dear-life.example";
const WEBHOOK = "https://discord.example/api/webhooks/1/token";

function contactRequest(body: unknown, init: { origin?: string | null; method?: string; contentType?: string } = {}) {
  const headers = new Headers({ "CF-Connecting-IP": "203.0.113.5" });
  if (init.origin !== null) headers.set("Origin", init.origin ?? SITE);
  headers.set("Content-Type", init.contentType ?? "application/json");
  const method = init.method ?? "POST";
  return new Request(`${SITE}/api/contact`, {
    method,
    headers,
    body: method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

let deps: ContactDeps;
let fetchMock: ReturnType<typeof vi.fn>;
let limitMock: ReturnType<typeof vi.fn<(options: RateLimitOptions) => Promise<RateLimitOutcome>>>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  limitMock = vi.fn<(options: RateLimitOptions) => Promise<RateLimitOutcome>>().mockResolvedValue({ success: true });
  deps = { webhookUrl: WEBHOOK, rateLimiter: { limit: limitMock }, fetch: fetchMock as unknown as typeof fetch };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function bodyOf(response: Response) {
  return (await response.json()) as { ok: boolean; error?: string };
}

describe("handleContact", () => {
  it("本文だけを、メンションにならない形で Discord に送る", async () => {
    const response = await handleContact(contactRequest({ message: "  鼎の保育園の数が違います @everyone  ", website: "" }), deps);
    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(WEBHOOK);
    const sent = JSON.parse(init.body as string);
    expect(sent).toEqual({
      content: "📮 DearLife へのお問い合わせ\n鼎の保育園の数が違います @everyone",
      allowed_mentions: { parse: [] },
    });
    // 接続元は数えるのに使うだけで、Discord には送らない
    expect(init.body).not.toContain("203.0.113.5");
    expect(limitMock).toHaveBeenCalledWith({ key: "203.0.113.5" });
  });

  it("ハニーポットに値があれば、送れたと返して捨てる", async () => {
    const response = await handleContact(contactRequest({ message: "こんにちは", website: "https://spam.example" }), deps);
    expect(await bodyOf(response)).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["空の本文", { message: "   " }],
    ["長すぎる本文", { message: "あ".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1) }],
    ["本文が文字列でない", { message: 1 }],
    ["ハニーポットが文字列でない", { message: "こんにちは", website: 1 }],
  ])("%sは弾く", async (_, body) => {
    const response = await handleContact(contactRequest(body), deps);
    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("上限ちょうどの長さは受ける（絵文字は1文字と数える）", async () => {
    const response = await handleContact(contactRequest({ message: "😀".repeat(CONTACT_MESSAGE_MAX_LENGTH) }), deps);
    expect(response.status).toBe(200);
  });

  it("JSON でない本文は弾く", async () => {
    expect((await handleContact(contactRequest("{", {}), deps)).status).toBe(400);
    expect((await handleContact(contactRequest("message=a", { contentType: "application/x-www-form-urlencoded" }), deps)).status).toBe(400);
  });

  it("ほかのサイトからの送信と Origin のない送信は弾く", async () => {
    for (const origin of ["https://evil.example", null]) {
      const response = await handleContact(contactRequest({ message: "こんにちは" }, { origin }), deps);
      expect(response.status).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POST 以外は受けない", async () => {
    const response = await handleContact(contactRequest(null, { method: "GET" }), deps);
    expect(response.status).toBe(405);
  });

  it("連続送信は弾く", async () => {
    limitMock.mockResolvedValue({ success: false });
    const response = await handleContact(contactRequest({ message: "こんにちは" }), deps);
    expect(response.status).toBe(429);
    expect(await bodyOf(response)).toEqual({ ok: false, error: "rate-limited" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Webhook が未登録・Discord が失敗・つながらないときは送れなかったと返す", async () => {
    const message = { message: "こんにちは" };
    expect((await handleContact(contactRequest(message), { ...deps, webhookUrl: undefined })).status).toBe(503);

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const failed = await handleContact(contactRequest(message), deps);
    expect(failed.status).toBe(502);
    expect(await bodyOf(failed)).toEqual({ ok: false, error: "unavailable" });

    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect((await handleContact(contactRequest(message), deps)).status).toBe(502);
  });
});
