// お問い合わせ（035・要件 F-15）を受けて、管理者（まさゆきさん）の Discord に届ける。
// 本文はどこにも保存しない。送り元の IP は送信の回数を数えるのに使うだけで、Discord にも送らず、保存もしない
import {
  CONTACT_HONEYPOT_FIELD,
  type ContactError,
  contactMessageProblem,
} from "../../../src/lib/contact/rules";

// JSON の本文の上限（バイト）。1,000 文字の日本語（1文字3バイト）と欄の名前が入る大きさ
const MAX_BODY_BYTES = 8 * 1024;
const DISCORD_TIMEOUT_MS = 10_000;

export type ContactDeps = {
  webhookUrl: string | undefined;
  rateLimiter: Pick<RateLimit, "limit">;
  fetch: typeof fetch;
};

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  // 同じサイトの画面からの送信だけ受ける
  if (request.headers.get("Origin") !== new URL(request.url).origin) return failure(403, "forbidden");
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return failure(400, "invalid");

  const payload = await readPayload(request);
  if (payload === null) return failure(400, "invalid");

  // 自動で欄を埋めるプログラムには、送れたと返して捨てる（弾いたと分かると、やり方を変えてくるため）
  if (payload.honeypot !== "") return success();
  if (contactMessageProblem(payload.message) !== null) return failure(400, "invalid");

  const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success: allowed } = await deps.rateLimiter.limit({ key });
  if (!allowed) return failure(429, "rate-limited");

  if (!deps.webhookUrl) {
    console.error("contact: DISCORD_WEBHOOK_URL is not set");
    return failure(503, "unavailable");
  }
  try {
    const response = await deps.fetch(deps.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 本文に @everyone などが入っていても、メンションにしない
      body: JSON.stringify({ content: discordContent(payload.message), allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`contact: Discord responded with HTTP ${response.status}`);
      return failure(502, "unavailable");
    }
  } catch (error) {
    console.error("contact: failed to reach Discord", error);
    return failure(502, "unavailable");
  }
  return success();
}

export function discordContent(message: string): string {
  return `📮 DearLife へのお問い合わせ\n${message.trim()}`;
}

async function readPayload(request: Request): Promise<{ message: string; honeypot: string } | null> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const honeypot = record[CONTACT_HONEYPOT_FIELD] ?? "";
  if (typeof record.message !== "string" || typeof honeypot !== "string") return null;
  return { message: record.message, honeypot };
}

function success(): Response {
  return Response.json({ ok: true });
}

function failure(status: number, error: ContactError): Response {
  return Response.json({ ok: false, error }, { status });
}
