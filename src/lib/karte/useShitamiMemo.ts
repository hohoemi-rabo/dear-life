"use client";

import { useCallback, useSyncExternalStore } from "react";
import { deviceStorage } from "../device-storage.ts";
import type { DistrictId } from "../town-district/resolve.ts";
import { parseShitamiMemo, serializeShitamiMemo, shitamiStorageKey, type ShitamiItemId } from "./shitami-memo.ts";

// 下見プランを端末（localStorage）に地区ごとに残す（036・要件 8.2）。残すのは利用者が入れた項目の ID だけで、サーバーには送らない。
// 保存できない端末では、開いているあいだだけこのページの中に持つ（読み直すと消える）。
// 同じ画面の別の場所（詳細の「＋ 下見プランに入れる」とプランの欄など）と、別のタブの変更にもすぐ合わせる

const CHANGE_EVENT = "dearlife:shitami-memo-change";
const EMPTY: readonly ShitamiItemId[] = [];

// 端末に残せるか（canPersist が1回だけ確かめる）。null はまだ確かめていない
let persistable: boolean | null = null;
// 保存できなかったときの置き場所
const memoryFallback = new Map<string, string>();
// 同じ値なら同じ配列を返す（useSyncExternalStore は、値が変わっていないときに同じものを返す必要がある）
const snapshots = new Map<string, { raw: string | null; ids: readonly ShitamiItemId[] }>();

// 端末に残せない（または書けなかった）あとは、このページの中の値だけを使う
function readRaw(key: string): string | null {
  if (persistable !== false) {
    try {
      const storage = deviceStorage();
      if (storage !== null) return storage.getItem(key);
    } catch {
      // 読めないときは、このページの中の値を使う
    }
  }
  return memoryFallback.get(key) ?? null;
}

// 端末に残せたら true
function writeRaw(key: string, value: string): boolean {
  try {
    const storage = deviceStorage();
    if (storage !== null) {
      storage.setItem(key, value);
      return true;
    }
  } catch {
    // 容量が足りない・保存が禁止されているなど。開いているあいだはメモを使える
  }
  persistable = false;
  memoryFallback.set(key, value);
  return false;
}

export function readShitamiMemo(district: DistrictId): readonly ShitamiItemId[] {
  const key = shitamiStorageKey(district);
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.ids;
  const ids = parseShitamiMemo(raw);
  snapshots.set(key, { raw, ids });
  return ids;
}

function writeShitamiMemo(district: DistrictId, ids: readonly ShitamiItemId[]): boolean {
  const saved = writeRaw(shitamiStorageKey(district), serializeShitamiMemo(ids));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return saved;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  // 別のタブで変えたとき
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// 端末に残せるか。プライベートブラウズなどでは書くと止まるので、試しに書いて確かめる。
// 書くと別のタブに storage のお知らせが飛ぶ（そのタブがまた書くと行き来が続く）ので、確かめるのはページを開いて1回だけ
function canPersist(): boolean {
  if (persistable !== null) return persistable;
  const storage = deviceStorage();
  try {
    const probe = "dearlife:storage-probe";
    storage?.setItem(probe, "1");
    storage?.removeItem(probe);
    persistable = storage !== null;
  } catch {
    persistable = false;
  }
  return persistable;
}

export type ShitamiMemo = {
  ids: readonly ShitamiItemId[];
  has: (id: ShitamiItemId) => boolean;
  add: (id: ShitamiItemId) => void;
  remove: (id: ShitamiItemId) => void;
  // false なら、読み直すとメモが消える端末
  persistent: boolean;
};

// 静的書き出しの HTML（と最初の描画）では、端末の値を読まずに空のメモで出す。読み込んだあとで端末の値に合わせる
export function useShitamiMemo(district: DistrictId): ShitamiMemo {
  const ids = useSyncExternalStore(
    subscribe,
    () => readShitamiMemo(district),
    () => EMPTY,
  );
  const persistent = useSyncExternalStore(subscribe, canPersist, () => true);
  const add = useCallback(
    (id: ShitamiItemId) => {
      const current = readShitamiMemo(district);
      if (!current.includes(id)) writeShitamiMemo(district, [...current, id]);
    },
    [district],
  );
  const remove = useCallback(
    (id: ShitamiItemId) => writeShitamiMemo(district, readShitamiMemo(district).filter((item) => item !== id)),
    [district],
  );
  return { ids, has: (id) => ids.includes(id), add, remove, persistent };
}
