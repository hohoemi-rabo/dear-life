// 管理者（まさゆきさん）への通知。Discord の Webhook に投稿する（005 で決定）
import type { HttpClient } from "./http";

// Discord のメッセージ本文の上限
const DISCORD_CONTENT_LIMIT = 2000;

export type Notifier = (message: string) => Promise<void>;

export function createDiscordNotifier(http: HttpClient, webhookUrl: string | undefined): Notifier {
  return async (message) => {
    // ローカル実行（npm run ingest:dev）で Webhook を登録していないときは、ログに出すだけにする
    if (!webhookUrl) {
      console.log(`ingest: notification (DISCORD_WEBHOOK_URL is not set)\n${message}`);
      return;
    }
    const content =
      message.length > DISCORD_CONTENT_LIMIT ? `${message.slice(0, DISCORD_CONTENT_LIMIT - 1)}…` : message;
    await http.request(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 取得したデータの文字列に @everyone などが入っていても、メンションにしない
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    });
  };
}
