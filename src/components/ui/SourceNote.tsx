import { formatJaDate } from "@/lib/format";

type SourceNoteProps = {
  source: string;
  // 対象時点（例：「2021年1Q〜2026年1Q」）
  period: string;
  date: string;
  // 自動で取ったデータは取得日、手で確かめたデータは確認日（要件 7.2）
  dateKind?: "取得日" | "確認日";
};

// すべての情報に出典・対象時点・確認日を付ける（要件 7.2）
export function SourceNote({ source, period, date, dateKind = "確認日" }: SourceNoteProps) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs text-ink-muted">
      <dt>出典</dt>
      <dd>{source}</dd>
      <dt>対象</dt>
      <dd>{period}</dd>
      <dt>{dateKind}</dt>
      <dd>
        <time dateTime={date}>{formatJaDate(date)}</time>
      </dd>
    </dl>
  );
}
