// 定期取得の Worker の入口（005）。Cron は1個だけで、その日に何をやるかは runner が決める
import type { Env } from "./job";
import { runIngest } from "./runner";

export type { Env };

export default {
  async scheduled(controller, env) {
    console.log(`ingest: cron ${controller.cron} fired at ${new Date(controller.scheduledTime).toISOString()}`);
    await runIngest(env, controller.scheduledTime);
  },
} satisfies ExportedHandler<Env>;
