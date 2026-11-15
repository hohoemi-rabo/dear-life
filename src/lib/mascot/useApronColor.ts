"use client";

import { useCallback, useSyncExternalStore } from "react";
import { deviceStorage } from "../device-storage.ts";
import { DEFAULT_APRON_COLOR, isApronColorId, type ApronColorId } from "./recolor.ts";

// マスコット（042）のエプロンの色を端末（localStorage）に残す。くらしで替えた色が、カルテ・地区くらべでも同じになる。
// 残すのは色の名前だけで、サーバーには送らない（要件 8.2）。保存できない端末では、開いているあいだだけこのページの中に持つ。
// 同じ画面の別のマスコットと、別のタブの変更にもすぐ合わせる
export const APRON_COLOR_STORAGE_KEY = "dearlife:mascot-apron";
const CHANGE_EVENT = "dearlife:mascot-apron-change";

let memoryFallback: ApronColorId | null = null;

export function readApronColor(): ApronColorId {
  if (memoryFallback !== null) return memoryFallback;
  try {
    const value = deviceStorage()?.getItem(APRON_COLOR_STORAGE_KEY);
    return isApronColorId(value) ? value : DEFAULT_APRON_COLOR;
  } catch {
    return DEFAULT_APRON_COLOR;
  }
}

function writeApronColor(color: ApronColorId) {
  try {
    const storage = deviceStorage();
    if (storage === null) throw new Error("no storage");
    storage.setItem(APRON_COLOR_STORAGE_KEY, color);
  } catch {
    // 保存できない端末（プライベートブラウズなど）。開いているあいだはこのページの中の色を使う
    memoryFallback = color;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// 静的書き出しの HTML（と最初の描画）では元の色で出し、読み込んだあとで端末の色に合わせる
export function useApronColor(): [ApronColorId, (color: ApronColorId) => void] {
  const color = useSyncExternalStore(subscribe, readApronColor, () => DEFAULT_APRON_COLOR);
  const setColor = useCallback((next: ApronColorId) => writeApronColor(next), []);
  return [color, setColor];
}
