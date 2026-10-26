import { SourceNote } from "@/components/ui/SourceNote";
import type { SourceInfo } from "@/lib/data/screen-data";

// 出典の行（data_sources）から出典・対象・確認日を出す。手で確かめたデータは確認日、自動で取ったデータは取得日（要件 7.2）。
// period を渡すと、出典の対象期間の代わりにそれを出す（相場は集計の対象期間を出す）
export function DataSourceNote({ source, period }: { source: SourceInfo; period?: string }) {
  const date = source.checkedOn ?? source.fetchedOn;
  return (
    <SourceNote
      source={`${source.publisher}「${source.name}」`}
      period={period ?? source.periodLabel ?? "記載なし"}
      date={date}
      dateKind={source.checkedOn ? "確認日" : "取得日"}
    />
  );
}
