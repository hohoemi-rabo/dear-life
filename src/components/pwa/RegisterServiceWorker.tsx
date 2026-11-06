"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "@/lib/pwa/install-prompt";
import { checkForUpdateOnReturn, serviceWorkerUpdate } from "@/lib/pwa/update";

// 画面の部品とドット絵を端末に残す Service Worker（024）を登録する。public にはなく、npm run build のあと scripts/build-sw.mjs が out/sw.js に書く。
// 開発サーバーでは登録しない（sw.js がなく、残した古い部品で画面の変更が見えなくなるため）。
// 新しい版が届いたら UpdatePrompt が「更新する」を出す（030）
export function RegisterServiceWorker() {
  useEffect(() => {
    listenForInstallPrompt();
    const updates = serviceWorkerUpdate();
    if (process.env.NODE_ENV !== "production" || !updates) return;
    let stopChecking: (() => void) | undefined;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;
        updates.watch(registration);
        stopChecking = checkForUpdateOnReturn(registration);
      })
      .catch((error: unknown) => {
        // 登録できなくても、つながっていれば画面はふつうに使える
        console.warn("Service Worker を登録できませんでした", error);
      });
    return () => {
      cancelled = true;
      stopChecking?.();
    };
  }, []);
  return null;
}
