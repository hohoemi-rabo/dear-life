import type { ReactNode } from "react";
import { GofreelyPanel } from "@/components/data/GofreelyPanel";
import type { SourceInfo } from "@/lib/data/screen-data";
import { formatJaDate, formatJaDateWithWeekday } from "@/lib/format";
import type { TransitRef } from "@/lib/scenes/placeholders";
import type { SceneLine } from "@/lib/scenes/render";

// 場面の文1つの見せ方（要件 6.4）。データ・地区の情報・想定で印を変える。ピンのシート（PinSheetContent）で使う。
// いつの時刻表か（とバスなら gofreely の枠）は、バス・電車それぞれ最初の文にだけ添える。
// 添える文の position を返す
export function timetableNotePositions(lines: readonly SceneLine[]): ReadonlySet<number> {
  const firstOf = new Map<TransitRef["mode"], number>();
  for (const line of lines) {
    if (line.status === "shown" && line.transit && !firstOf.has(line.transit.mode)) firstOf.set(line.transit.mode, line.position);
  }
  return new Set(firstOf.values());
}

export function SceneLineView({
  line,
  sourceNumbers,
  withTimetableNote,
}: {
  line: SceneLine;
  sourceNumbers: ReadonlyMap<string, number>;
  withTimetableNote: boolean;
}) {
  if (line.status !== "shown") {
    return (
      <p className="flex gap-2 text-sm text-ink-muted">
        <span aria-hidden="true">―</span>
        <span>{line.message}</span>
      </p>
    );
  }
  switch (line.kind) {
    case "データ":
      return (
        <div className="flex flex-col gap-1">
          <p>
            {line.text}
            {line.sources.map((source) => (
              <KindMark key={source.id} className="bg-kind-data-soft text-kind-data">
                出典{sourceNumbers.get(source.id)}
              </KindMark>
            ))}
          </p>
          {withTimetableNote && line.transit && (
            <>
              <TransitTimetableNote transit={line.transit} sources={line.sources} />
              {line.transit.mode === "bus" && <GofreelyPanel className="mt-2" />}
            </>
          )}
        </div>
      );
    case "地区の情報":
      return (
        <p>
          {line.text}
          <KindMark className="bg-kind-local-soft text-kind-local">
            地区の情報{line.checkedOn && `・確認日 ${formatJaDate(line.checkedOn)}`}
          </KindMark>
        </p>
      );
    case "想定":
      return (
        <p className="text-ink-muted">
          {line.text}
          <KindMark className="bg-kind-assumed-soft text-kind-assumed">想定</KindMark>
        </p>
      );
  }
}

// 文のあとに付ける印
function KindMark({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`ml-2 inline-block whitespace-nowrap rounded px-1.5 align-middle text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

// おでかけの便が、いつの時刻表のものか。バスは見た日、電車は時刻表の改正日（017 の引き継ぎ）
function TransitTimetableNote({ transit, sources }: { transit: TransitRef; sources: readonly SourceInfo[] }) {
  const note =
    transit.mode === "bus"
      ? `${formatJaDateWithWeekday(transit.outing.serviceDate)}の時刻表`
      : sources.find((source) => source.periodLabel)?.periodLabel;
  if (!note) return null;
  return <p className="text-xs text-ink-muted">{note}</p>;
}
