"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateLegend } from "@/components/data/DataStateMessage";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { SourceNote } from "@/components/ui/SourceNote";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { karteBackHref } from "@/lib/karte/links";
import type { ScreenData } from "@/lib/data/screen-data";
import { compareSources, COMPARE_TOPICS, eventSources, type CompareTopic } from "@/lib/kurabe/compare";
import { compareViewHref, COMPARE_VIEW_PARAM, parseCompareView, type CompareView } from "@/lib/kurabe/links";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CompareBySection, CompareTable } from "./CompareLayouts";
import { CompareTopicView } from "./CompareTopicView";
import { KurabeIcon } from "./KurabeIcon";

// 04 地区くらべ（F-05）。4地区を同じ項目で並べる。点数・順位・色の良し悪しは付けず、地区の並びも固定する。
// 選んだ地区（URL の d）は目印を付けるだけ。地区を選んでいなくても見られる。useSearchParams を使うので <Suspense> の中で使う。
// PC はタブで項目を切りかえ、「すべての項目を一覧で見る」で今の表も見られる（028 見本 docs/design/kurabe-pc.png）。
// スマホは見本を待っているので、項目ごとに4地区を縦に並べた形のまま
export function KurabeView() {
  const { conditions } = useConditions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = parseCompareView(searchParams.get(COMPARE_VIEW_PARAM));
  const hrefFor = (next: CompareView) => compareViewHref(searchParams, next);
  // タブを変えても履歴は増やさず、位置もそのまま（くらしの季節と同じ）
  const selectTopic = (topic: CompareTopic) => router.replace(hrefFor(topic), { scroll: false });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {conditions.district !== null && (
          <Link href={karteBackHref(conditions, searchParams)} className="inline-flex min-h-tap items-center gap-2 self-start font-bold hover:underline">
            <span aria-hidden="true">←</span>
            わが家のカルテ
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-extrabold lg:text-4xl">4地区をくらべる</h1>
          {view === "all" ? (
            <ViewSwitch href={hrefFor(COMPARE_TOPICS[0])} label="項目を切りかえて見る" />
          ) : (
            <ViewSwitch href={hrefFor("all")} label="すべての項目を一覧で見る" />
          )}
        </div>
        <p className="flex flex-col gap-x-4 lg:flex-row lg:items-baseline">
          <span className="font-bold">同じ項目を横に並べて、暮らしの違いを確かめよう。</span>
          <span className="text-sm text-ink-muted">地区の並びは固定です。優劣・おすすめ順ではありません。</span>
        </p>
      </div>

      <ScreenDataBoundary fallback={<ScreenSkeleton label="地区くらべを読み込んでいます" />}>
        <Comparison selected={conditions.district} view={view} hrefFor={hrefFor} onSelect={selectTopic} />
      </ScreenDataBoundary>

      <KurabeNavigation conditions={conditions} />
    </div>
  );
}

function ViewSwitch({ href, label }: { href: string; label: string }) {
  return (
    <ButtonLink href={href} variant="secondary" className="hidden shrink-0 border lg:inline-flex">
      <KurabeIcon name="list" />
      {label}
    </ButtonLink>
  );
}

function Comparison({
  selected,
  view,
  hrefFor,
  onSelect,
}: {
  selected: DistrictId | null;
  view: CompareView;
  hrefFor: (view: CompareView) => string;
  onSelect: (topic: CompareTopic) => void;
}) {
  const data = useScreenData();
  const districts = data.districtOrder.map((id) => data.districts[id]);
  return (
    <>
      <CompareBySection districts={districts} selected={selected} />
      {view === "all" ? (
        <CompareTable districts={districts} selected={selected} />
      ) : (
        <CompareTopicView data={data} topic={view} selected={selected} hrefFor={hrefFor} onSelect={onSelect} />
      )}
      {/* タブの PC 表示では、出典はタブの中で開いて読む */}
      <Sources data={data} className={view === "all" ? "" : "lg:hidden"} />
    </>
  );
}

// 出典・対象時点は表の下にまとめて出す（020）。マスの「該当なし」「データ未取得」の意味もここで1回だけ説明する
function Sources({ data, className }: { data: ScreenData; className: string }) {
  const sources = compareSources(data);
  const events = eventSources(data);
  return (
    <Card as="section" aria-labelledby="kurabe-sources" className={`flex flex-col gap-3 ${className}`}>
      <h2 id="kurabe-sources" className="text-lg font-bold">
        出典と対象時点
      </h2>
      <DataStateLegend place="その地区" />
      <ul className="flex flex-col divide-y divide-line">
        {sources.map(({ source, period }) => (
          <li key={source.id} className="py-2">
            <DataSourceNote source={source} period={period} />
          </li>
        ))}
        {events.map((event) => (
          <li key={`${event.note}-${event.checkedOn}`} className="py-2">
            <SourceNote source={`地区の行事：${event.note}`} period="確認日の時点の内容" date={event.checkedOn} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

// 下部：カルテに戻る・地図で場所を見る（028 見本）。地区を選んでいなければ、カルテの代わりにえらぶへ案内する
function KurabeNavigation({ conditions }: { conditions: Conditions }) {
  const searchParams = useSearchParams();
  const buttonClass = "w-full max-w-sm lg:w-80";
  return (
    <nav aria-label="ほかの見方" className="flex flex-col items-center justify-center gap-3 lg:flex-row">
      {conditions.district === null ? (
        <ButtonLink href={conditionsHref(ERABU_PATH, conditions)} className={buttonClass}>
          地区をえらんで、くらしを見る
          <span aria-hidden="true">→</span>
        </ButtonLink>
      ) : (
        <ButtonLink href={karteBackHref(conditions, searchParams)} className={buttonClass}>
          {DISTRICT_NAMES[conditions.district]}のカルテに戻る
        </ButtonLink>
      )}
      <ButtonLink href={mapHref(conditions, searchParams.get(SEASON_PARAM))} variant="secondary" className={buttonClass}>
        地図で場所を見る
      </ButtonLink>
    </nav>
  );
}
