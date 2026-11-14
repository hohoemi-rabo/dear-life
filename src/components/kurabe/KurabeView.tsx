"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { DataStateLegend } from "@/components/data/DataStateMessage";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { ScreenTabBar } from "@/components/layout/ScreenTabBar";
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
import { compareCityOptions } from "@/lib/kurabe/city";
import { compareSources, COMPARE_TOPICS, eventSources, type CompareTab } from "@/lib/kurabe/compare";
import {
  COMPARE_CITY_PARAM,
  COMPARE_TARGET_PARAM,
  compareViewHref,
  COMPARE_VIEW_PARAM,
  parseCompareCity,
  parseCompareTarget,
  parseCompareView,
  type CompareTarget,
  type CompareView,
} from "@/lib/kurabe/links";
import { SEASON_PARAM } from "@/lib/kurashi/season";
import { mapHref } from "@/lib/map/links";
import { ERABU_PATH, KURABE_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CompareBySection, CompareTable } from "./CompareLayouts";
import { CompareTopicView } from "./CompareTopicView";
import { KurabeIcon } from "./KurabeIcon";
import { KurabePrintButton } from "./KurabePrint";

// 04 地区くらべ（F-05）。4地区を同じ項目で並べる。点数・順位・色の良し悪しは付けず、地区の並びも固定する。
// 選んだ地区（URL の d）は目印を付けるだけ。地区を選んでいなくても見られる。useSearchParams を使うので <Suspense> の中で使う。
// タブで項目を切りかえる（見本 docs/design/kurabe-pc.png・kurabe-mobile.png。029）。PC は「すべての項目を一覧で見る」で全項目も見られ、
// スマホは選んだ地区と比べる地区の2つを並べ、「4地区を一覧」でそのタブの4地区を見る
export function KurabeView() {
  const { conditions } = useConditions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = parseCompareView(searchParams.get(COMPARE_VIEW_PARAM));
  const hrefFor = (next: CompareView) => compareViewHref(searchParams, next);
  // タブを変えても履歴は増やさず、位置もそのまま（くらしの季節と同じ）
  const selectTopic = (topic: CompareTab) => router.replace(hrefFor(topic), { scroll: false });
  const target = parseCompareTarget(searchParams.get(COMPARE_TARGET_PARAM), conditions.district);
  // null は比較相手の指定を外す（既定の相手に戻す）
  const selectTarget = (next: CompareTarget | null) => {
    const params = new URLSearchParams(searchParams);
    if (next === null) params.delete(COMPARE_TARGET_PARAM);
    else params.set(COMPARE_TARGET_PARAM, next);
    router.replace(`${KURABE_PATH}?${params.toString()}`, { scroll: false });
  };
  // いまの街と（041）で比べる都市
  const cityParam = searchParams.get(COMPARE_CITY_PARAM);
  const selectCity = (cityId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(COMPARE_CITY_PARAM, cityId);
    router.replace(`${KURABE_PATH}?${params.toString()}`, { scroll: false });
  };
  const viewSwitch = (className: string) =>
    view === "all" ? (
      <ViewSwitch href={hrefFor(COMPARE_TOPICS[0])} label="項目を切りかえて見る" className={className} />
    ) : (
      <ViewSwitch href={hrefFor("all")} label="すべての項目を一覧で見る" className={className} />
    );

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
          <h1 className="text-2xl font-extrabold lg:text-4xl">
            <span className="hidden lg:inline">4</span>地区をくらべる
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {viewSwitch("hidden shrink-0 border lg:inline-flex")}
            {/* 見出しの右上の「印刷する」（023） */}
            <KurabePrintButton conditions={conditions} />
          </div>
        </div>
        <p className="lg:hidden">選んだ地区と、気になる地区を比較。</p>
        <p className="hidden gap-x-4 lg:flex lg:items-baseline">
          <span className="font-bold">4地区の暮らしや、いまの街との違いを確かめよう。</span>
          <span className="text-sm text-ink-muted">地区の並びは固定です。優劣・おすすめ順ではありません。</span>
        </p>
      </div>

      <ScreenDataBoundary fallback={<ScreenSkeleton label="地区くらべを読み込んでいます" />}>
        <Comparison
          selected={conditions.district}
          view={view}
          hrefFor={hrefFor}
          onSelect={selectTopic}
          target={target}
          onTargetChange={selectTarget}
          cityParam={cityParam}
          onCityChange={selectCity}
          conditions={conditions}
        />
      </ScreenDataBoundary>

      {/* スマホの切りかえは「4地区を一覧」。全項目の一覧を URL で開いたときだけ、タブへ戻る道を残す */}
      {view === "all" && <div className="flex justify-center lg:hidden">{viewSwitch("w-full max-w-sm border")}</div>}
      <KurabeNavigation conditions={conditions} />
      {conditions.district !== null && <ScreenTabBar current="kurabe" conditions={conditions} seasonSlug={searchParams.get(SEASON_PARAM)} />}
    </div>
  );
}

function ViewSwitch({ href, label, className }: { href: string; label: string; className: string }) {
  return (
    <ButtonLink href={href} variant="secondary" className={className}>
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
  target,
  onTargetChange,
  cityParam,
  onCityChange,
  conditions,
}: {
  selected: DistrictId | null;
  view: CompareView;
  hrefFor: (view: CompareView) => string;
  onSelect: (topic: CompareTab) => void;
  target: CompareTarget;
  onTargetChange: (target: CompareTarget | null) => void;
  cityParam: string | null;
  onCityChange: (cityId: string) => void;
  conditions: Conditions;
}) {
  const data = useScreenData();
  const cityId = parseCompareCity(
    cityParam,
    compareCityOptions(data).map((city) => city.id),
  );
  const districts = data.districtOrder.map((id) => data.districts[id]);
  return (
    <>
      {view === "all" ? (
        <>
          <CompareBySection districts={districts} selected={selected} />
          <CompareTable districts={districts} selected={selected} />
          <Sources data={data} />
        </>
      ) : (
        <CompareTopicView
          data={data}
          topic={view}
          selected={selected}
          hrefFor={hrefFor}
          onSelect={onSelect}
          target={target}
          onTargetChange={onTargetChange}
          cityId={cityId}
          onCityChange={onCityChange}
          conditions={conditions}
          erabuHref={conditionsHref(ERABU_PATH, conditions)}
        />
      )}
    </>
  );
}

// 出典・対象時点は表の下にまとめて出す（020）。マスの「該当なし」「データ未取得」の意味もここで1回だけ説明する
function Sources({ data }: { data: ScreenData }) {
  const sources = compareSources(data);
  const events = eventSources(data);
  return (
    <Card as="section" aria-labelledby="kurabe-sources" className="flex flex-col gap-3">
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
      <ButtonLink href={mapHref(conditions, searchParams.get(SEASON_PARAM))} variant="secondary" className={`${buttonClass} hidden lg:inline-flex`}>
        地図で場所を見る
      </ButtonLink>
    </nav>
  );
}
