export interface Env {
  SUPABASE_URL: string;
  REINFOLIB_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  // 取得処理の中身はチケット 005 以降で実装する
  async scheduled(controller) {
    console.log(`ingest: cron ${controller.cron} fired at ${new Date(controller.scheduledTime).toISOString()}`);
  },
} satisfies ExportedHandler<Env>;
