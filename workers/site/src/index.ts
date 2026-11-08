// 画面を配信する Worker（dear-life）の入口（035）。画面は out/ の静的ファイルをそのまま配り、
// ここに来るのは wrangler.jsonc の run_worker_first に書いた /api/* だけ
import { CONTACT_API_PATH } from "../../../src/lib/contact/rules";
import { handleContact } from "./contact";

export type Env = {
  ASSETS: Fetcher;
  CONTACT_RATE_LIMITER: RateLimit;
  // 定期取得の Worker と同じ Webhook URL。`npx wrangler secret put DISCORD_WEBHOOK_URL` で登録する
  DISCORD_WEBHOOK_URL?: string;
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === CONTACT_API_PATH) {
      return handleContact(request, {
        webhookUrl: env.DISCORD_WEBHOOK_URL,
        rateLimiter: env.CONTACT_RATE_LIMITER,
        fetch: (input, init) => fetch(input, init),
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
