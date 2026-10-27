"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { useScreenData } from "@/components/data/ScreenDataBoundary";
import { PixelScene } from "@/components/pixel/PixelScene";
import { Notice } from "@/components/ui/Notice";
import { KARTE_CARD_LABELS, type KarteCard } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import type { SourceInfo } from "@/lib/data/screen-data";
import { formatJaDate, formatJaDateWithWeekday } from "@/lib/format";
import { karteHref } from "@/lib/kurashi/links";
import { SCENE_AXIS_LABELS } from "@/lib/kurashi/season";
import { seasonView } from "@/lib/kurashi/view";
import type { TransitRef } from "@/lib/scenes/placeholders";
import type { Scene, SceneLine } from "@/lib/scenes/render";
import type { DistrictId } from "@/lib/town-district/resolve";
import { SEASON_STYLES } from "./season-styles";

type Props = { season: Season; conditions: Conditions & { district: DistrictId } };

// 1つの季節の場面（F-12）：ドット絵1枚と、会話ウィンドウ風の枠に入れた3〜5文と出典。ScreenDataBoundary の中で使う
export function ScenePanel({ season, conditions }: Props) {
  const { plan, district, layers, scene } = seasonView(season, conditions, useScreenData());
  return (
    <div className="flex flex-col gap-4">
      <figure className="pixel-frame relative mx-auto w-fit">
        <PixelScene layers={layers} widthClassName="w-[320px] sm:w-[480px]" />
        <figcaption className={`absolute left-2 top-2 px-2 py-0.5 text-sm font-bold text-white ${SEASON_STYLES[season].label}`}>
          {district.name}の{season}
        </figcaption>
        <span className="absolute bottom-2 right-2 bg-ink/75 px-2 py-0.5 text-xs text-white">想定の風景</span>
      </figure>

      <section aria-labelledby="scene-title" className="pixel-frame flex flex-col gap-3 p-4">
        <h2 id="scene-title" className="text-lg font-bold">
          {season}｜{SCENE_AXIS_LABELS[plan.axis].title}
        </h2>
        {scene ? (
          <SceneBody scene={scene} season={season} conditions={conditions} />
        ) : (
          <p className="text-ink-muted">この季節の場面の文章は準備中です。</p>
        )}
      </section>
    </div>
  );
}

function SceneBody({ scene, season, conditions }: { scene: Scene } & Props) {
  const sourceNumbers = new Map(scene.sources.map((source, index) => [source.id, index + 1]));
  const cards = [...new Set(scene.lines.flatMap((line) => (line.karteCard ? [line.karteCard] : [])))];
  // いつの時刻表かは、バス・電車それぞれ最初の文にだけ添える（おでかけはバス2文・電車1文に分かれている）
  const timetableNoteAt = new Map<TransitRef["mode"], number>();
  for (const line of scene.lines) {
    if (line.status === "shown" && line.transit && !timetableNoteAt.has(line.transit.mode)) {
      timetableNoteAt.set(line.transit.mode, line.position);
    }
  }
  return (
    <>
      <ul className="flex flex-col gap-2">
        {scene.lines.map((line) => (
          <li key={line.position}>
            <SceneLineView
              line={line}
              sourceNumbers={sourceNumbers}
              withTimetableNote={line.status === "shown" && line.transit !== null && timetableNoteAt.get(line.transit.mode) === line.position}
            />
          </li>
        ))}
      </ul>
      {cards.length > 0 && <KarteCardLinks cards={cards} season={season} conditions={conditions} />}
      {scene.notices.map((notice) => (
        <Notice key={notice}>{notice}</Notice>
      ))}
      <KindLegend />
      {scene.sources.length > 0 && <SceneSources sources={scene.sources} />}
    </>
  );
}

function SceneLineView({
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
          {withTimetableNote && line.transit && <TransitTimetableNote transit={line.transit} sources={line.sources} />}
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

// 文のあとに付ける印。凡例の中では文の後ろではないので、左を空けない（inline=false）
function KindMark({ className, inline = true, children }: { className: string; inline?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 align-middle text-xs font-bold ${inline ? "ml-2" : ""} ${className}`}>
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

// 場面の中のデータから、カルテの該当カードへ直接移る（F-14）
function KarteCardLinks({ cards, season, conditions }: { cards: readonly KarteCard[] } & Props) {
  return (
    <ul className="flex flex-wrap gap-x-4">
      {cards.map((card) => (
        <li key={card}>
          <Link
            href={karteHref(conditions, season, card)}
            className="inline-flex min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline"
          >
            {KARTE_CARD_LABELS[card]}をカルテで確認
            <span aria-hidden="true">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 文の種類の見分け方（要件 6.4）
function KindLegend() {
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-xs text-ink-muted">
      <dt>
        <KindMark inline={false} className="bg-kind-data-soft text-kind-data">出典</KindMark>
      </dt>
      <dd>公開データから入れた文です。番号は下の出典の番号です。</dd>
      <dt>
        <KindMark inline={false} className="bg-kind-local-soft text-kind-local">地区の情報</KindMark>
      </dt>
      <dd>地区の資料から集めた情報です。</dd>
      <dt>
        <KindMark inline={false} className="bg-kind-assumed-soft text-kind-assumed">想定</KindMark>
      </dt>
      <dd>暮らしをイメージするための文で、データではありません。</dd>
    </dl>
  );
}

function SceneSources({ sources }: { sources: readonly SourceInfo[] }) {
  return (
    <details className="group">
      <summary className="flex min-h-tap cursor-pointer items-center text-sm font-bold text-primary">出典・確認日を見る</summary>
      <ol className="flex flex-col gap-3">
        {sources.map((source, index) => (
          <li key={source.id} className="flex gap-2">
            <span className="text-xs font-bold text-kind-data">出典{index + 1}</span>
            <DataSourceNote source={source} />
          </li>
        ))}
      </ol>
    </details>
  );
}
