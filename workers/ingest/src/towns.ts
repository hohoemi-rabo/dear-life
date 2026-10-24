// 町名→地区の振り分け（004 の引き継ぎ）。対応表は Supabase から読み、振り分けは画面と同じ関数で行う
import { createTownResolver, townNameForRecord, type DistrictId, type TownMapEntry } from "../../../src/lib/town-district/resolve";
import type { SupabaseRest } from "./supabase";

export type TownResolver = ReturnType<typeof createTownResolver>;

type TownMapRow = { town_name: string; city_district: string; district_id: DistrictId | null };

export async function loadTownResolver(db: SupabaseRest): Promise<TownResolver> {
  const rows = await db.select<TownMapRow>("town_district_map", "select=town_name,city_district,district_id");
  if (rows.length === 0) throw new Error("town_district_map が空で、住所を地区に振り分けられない");
  const entries: TownMapEntry[] = rows.map((row) => ({
    townName: row.town_name,
    cityDistrict: row.city_district,
    districtId: row.district_id,
  }));
  return createTownResolver(entries);
}

// 対応表に当たらなかった住所を1回の取得の間ためておき、最後にまとめて記録する（出典ごとに呼び出し1回にするため）。
// 1つの処理が複数の出典を取り込むとき（008 の学校と保育施設など）は、add に出典を渡す
export class UnmappedTownCollector {
  private readonly entries: { townName: string; sourceId: string | null }[] = [];

  add(address: string, sourceId: string | null = null): void {
    this.entries.push({ townName: townNameForRecord(address), sourceId });
  }

  get size(): number {
    return this.entries.length;
  }

  // 出典を渡さずに足した町名は defaultSourceId（処理の sourceId）で記録する
  async flush(db: SupabaseRest, defaultSourceId: string | null): Promise<void> {
    const bySource = new Map<string, string[]>();
    for (const entry of this.entries) {
      const sourceId = entry.sourceId ?? defaultSourceId;
      if (sourceId === null) throw new Error(`出典がわからないまま、対応表にない町名を記録しようとした：${entry.townName}`);
      bySource.set(sourceId, [...(bySource.get(sourceId) ?? []), entry.townName]);
    }
    for (const [sourceId, townNames] of bySource) {
      await db.rpc("record_unmapped_towns", { p_source_id: sourceId, p_town_names: townNames });
    }
    this.entries.length = 0;
  }
}

export type UnresolvedTown = { town_name: string; source_id: string; occurrences: number; last_seen_at: string };

// 未反映の町名（通知に含める）。多すぎるときは新しいものから
export async function listUnresolvedTowns(db: SupabaseRest, limit: number): Promise<UnresolvedTown[]> {
  return db.select<UnresolvedTown>(
    "unmapped_towns",
    `select=town_name,source_id,occurrences,last_seen_at&resolved_at=is.null&order=last_seen_at.desc&limit=${limit}`,
  );
}
