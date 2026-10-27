"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { installState, promptInstall, subscribeInstallState, type InstallState } from "@/lib/pwa/install-prompt";

const serverState = (): InstallState => "none";

// ホーム画面への追加の案内（要件 8.2）。Android は追加ボタン、iPhone は共有メニューからの手順を出す。
// ホーム画面から開いているときと、追加できないブラウザでは何も出さない
export function InstallGuide() {
  const state = useSyncExternalStore(subscribeInstallState, () => installState(), serverState);
  if (state === "installed" || state === "none") return null;
  return (
    <section aria-label="ホーム画面に追加" className="space-y-2">
      <p>ホーム画面に追加すると、アプリのように開けます。圏外でも、最後に見た場面やカルテを表示できます。</p>
      {state === "prompt" ? (
        <Button variant="secondary" onClick={() => void promptInstall()}>
          ホーム画面に追加する
        </Button>
      ) : (
        <p>iPhone・iPad では、Safari の共有ボタン（四角から上向きの矢印）を押し、「ホーム画面に追加」を選んでください。</p>
      )}
    </section>
  );
}
