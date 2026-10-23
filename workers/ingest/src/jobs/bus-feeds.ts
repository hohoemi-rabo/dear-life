// バス（GTFS-JP）の新しい版の確認（010・要件 7章「年1回＋ダイヤ改正時」）。
// 取り込みは手元の npm run bus:sql で行う（乗り場の町名を国土地理院の逆ジオコーダで引くのに、Worker の呼び出し回数の上限では足りないため）。
// Worker は毎日、取り込んだ版（gtfs_feeds）と GTFS データリポジトリの今の版を比べ、取り直しが要るときに処理を失敗にして知らせる。
// 取り直すまで毎日知らせる
import type { Job } from "../job";

export const BUS_SOURCE_ID = "gtfs_minamishinshu_bus";
export const GTFS_REPOSITORY_API = "https://api.gtfs-data.jp/v2";

// 有効期間の終わりがこの日数以内に近づいたら知らせる（次の版が出ていないか確かめてもらう）
export const EXPIRY_WARNING_DAYS = 30;

type StoredFeed = { feed_id: string; organization_id: string; file_uid: string; valid_to: string };

type FeedDetail = {
  body?: {
    feed_license?: string;
    is_discontinued?: boolean;
    gtfs_files?: { rid: string; gtfs_file_uid: string; from_date: string; to_date: string }[];
  };
};

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export const busFeeds: Job = {
  name: "bus_feeds",
  sourceId: BUS_SOURCE_ID,
  shouldRun: () => true,
  async run({ db, external, today }) {
    const stored = await db.select<StoredFeed>(
      "gtfs_feeds",
      `select=feed_id,organization_id,file_uid,valid_to&source_id=eq.${BUS_SOURCE_ID}&order=feed_id`,
    );
    if (stored.length === 0) throw new Error("gtfs_feeds が空。npm run bus:sql で取り込む（docs/010_ingest-bus-gtfs.md）");

    const reasons: string[] = [];
    for (const feed of stored) {
      const response = await external.request(`${GTFS_REPOSITORY_API}/organizations/${feed.organization_id}/feeds/${feed.feed_id}`);
      const detail = ((await response.json()) as FeedDetail).body;
      const current = detail?.gtfs_files?.find((file) => file.rid === "current");
      if (!detail || !current) throw new Error(`${feed.feed_id}：リポジトリの応答に今の版（rid=current）がない`);

      if (detail.is_discontinued) reasons.push(`${feed.feed_id} の配布が終わった`);
      if (detail.feed_license !== "CC BY 4.0") reasons.push(`${feed.feed_id} のライセンスが変わった（${detail.feed_license}）。表記を確かめ直す`);
      if (current.gtfs_file_uid !== feed.file_uid) {
        reasons.push(`${feed.feed_id} に新しい版が出た（${current.from_date}〜${current.to_date}）`);
      } else {
        const daysLeft = daysBetween(today.iso, feed.valid_to);
        if (daysLeft < 0) reasons.push(`${feed.feed_id} の有効期間（${feed.valid_to}まで）が切れた。画面はデータ未取得になっている`);
        else if (daysLeft <= EXPIRY_WARNING_DAYS) reasons.push(`${feed.feed_id} の有効期間が ${feed.valid_to} で終わる（あと${daysLeft}日）`);
      }
    }

    if (reasons.length > 0) {
      throw new Error(`バスの時刻表の取り直しが必要：${reasons.join("／")}。npm run bus:sql で取り直す（docs/010_ingest-bus-gtfs.md）`);
    }
    return { rowsWritten: 0 };
  },
};
