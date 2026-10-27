"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "@/lib/pwa/install-prompt";

// 画面の部品とドット絵を端末に残す Service Worker（024）を登録する。public にはなく、npm run build のあと scripts/build-sw.mjs が out/sw.js に書く。
// 開発サーバーでは登録しない（sw.js がなく、残した古い部品で画面の変更が見えなくなるため）
export function RegisterServiceWorker() {
  useEffect(() => {
    listenForInstallPrompt();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      // 登録できなくても、つながっていれば画面はふつうに使える
      console.warn("Service Worker を登録できませんでした", error);
    });
  }, []);
  return null;
}
