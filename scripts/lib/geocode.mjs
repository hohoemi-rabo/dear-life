// 取り込みスクリプトで共通に使う、外部への問い合わせと、逆ジオコーダの結果をためる CSV の読み書き（010・026）
import { readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { parseCsv } from "../../src/lib/gtfs/csv.ts";
import { coordinateKey } from "../../src/lib/gtfs/import.ts";

const REVERSE_GEOCODER = "https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress";
// 国土地理院の逆ジオコーダは公開の無料サービスなので、間をあけて1件ずつ問い合わせる
const GEOCODER_INTERVAL_MS = 500;
const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const TOWNS_HEADER = "緯度,経度,市区町村コード,町名";

// 通信の失敗・429・5xx だけを、待ち時間を倍にしながら試し直す
export async function fetchWithRetry(url) {
  const label = `${new URL(url).host}${new URL(url).pathname}`;
  for (let attempt = 1; ; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${label} に届かなかった（${attempt}回試した）：${error.message}`);
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (response.ok) return response;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) throw new Error(`${label} が ${response.status} を返した（${attempt}回試した）`);
    await sleep(1000 * 2 ** attempt);
  }
}

// 緯度経度 → { muniCode, townName } をためた CSV（data/bus_stop_towns.csv など）を読む
export function readTowns(path) {
  const text = readFileSync(path, "utf8");
  if (text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] !== TOWNS_HEADER) {
    throw new Error(`${path} の見出しが ${TOWNS_HEADER} ではない`);
  }
  return new Map(
    parseCsv(text).map((record) => [
      coordinateKey(Number(record["緯度"]), Number(record["経度"])),
      { muniCode: record["市区町村コード"], townName: record["町名"] },
    ]),
  );
}

function writeTowns(path, towns) {
  const lines = [...towns.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, town]) => `${key},${town.muniCode},${town.townName}`);
  writeFileSync(path, `${TOWNS_HEADER}\n${lines.join("\n")}\n`);
}

// 結果のない位置（海の上など）は、市区町村コード・町名とも空にしてためる（飯田市外として扱う）
async function reverseGeocode(key) {
  const [lat, lon] = key.split(",");
  const body = await (await fetchWithRetry(`${REVERSE_GEOCODER}?lat=${lat}&lon=${lon}`)).json();
  const muniCode = body?.results?.muniCd ?? "";
  const townName = body?.results?.lv01Nm ?? "";
  if (/[,"\n]/.test(townName)) throw new Error(`町名にカンマや引用符が入っている: ${townName}`);
  return { muniCode, townName };
}

// まだ町名にしていない位置だけを問い合わせ、結果を towns に足して CSV に書き戻す
export async function geocodeMissing(path, towns, keys) {
  if (keys.length === 0) return;
  console.log(`新しい位置 ${keys.length} か所を町名にします…`);
  for (const key of keys) {
    towns.set(key, await reverseGeocode(key));
    await sleep(GEOCODER_INTERVAL_MS);
  }
  writeTowns(path, towns);
}
