"use client";

import Link from "next/link";
import { ChooseAgainLink, ConditionChips, ConditionsPanel } from "@/components/conditions/ConditionsPanel";
import { PixelIcon } from "@/components/pixel/PixelIcon";
import { PixelImage } from "@/components/pixel/PixelImage";
import { ScreenDataBoundary } from "@/components/data/ScreenDataBoundary";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DISTRICT_NAMES } from "@/lib/conditions/labels";
import type { Conditions } from "@/lib/conditions/model";
import type { Season } from "@/lib/conditions/scene";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { kurabeHref } from "@/lib/kurabe/links";
import { mapHref } from "@/lib/map/links";
import { karteHref } from "@/lib/kurashi/links";
import { SEASON_SLUGS } from "@/lib/kurashi/season";
import { useSeason } from "@/lib/kurashi/useSeason";
import { ERABU_PATH } from "@/lib/site";
import { EventsPanel } from "./EventsPanel";
import { SCENE_WIDTH_CLASS, ScenePanel } from "./ScenePanel";
import { SeasonTabs } from "./SeasonTabs";
import { SeasonThumbnails } from "./SeasonThumbnails";

// 02 くらしを見る（F-11〜F-14・F-04）。条件と季節は URL パラメータに持つ（F-02）。useSearchParams を使うので <Suspense> の中で使う。
// スマホは1列で、下に「選び直す」「カルテで確かめる」を固定する。PC（xl 以上）はデザインイメージ PC版の3列にする（見た目は 027）
export function KurashiView() {
  const { conditions, setConditions } = useConditions();
  const { season, setSeason } = useSeason();
  const { district } = conditions;
  if (district === null) return <NoDistrict conditions={conditions} />;

  const chosen = { ...conditions, district };
  return (
    <div className="flex flex-col gap-5">
      {/* 3列：左の設定・真ん中の場面・右の行事。真ん中の列の幅で場面の絵が 800px（5倍）まで入るようにする */}
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
        <aside aria-label="わが家の設定" className="hidden xl:row-span-2 xl:block">
          <ConditionsPanel conditions={chosen} onConditionsChange={setConditions} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1 xl:items-center xl:text-center">
            <h1 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl xl:text-3xl">
              <PixelIcon icon="icon-sprout" />
              {DISTRICT_NAMES[district]}で、わが家の{season}。
            </h1>
            <p className="hidden text-ink-muted xl:block">季節を選んで、飯田での暮らしをのぞいてみよう。</p>
          </div>
          <div className="xl:hidden">
            <ConditionChips conditions={chosen} onConditionsChange={setConditions} showAll={false} />
          </div>
          {/* 季節のタブは場面のカードの上にくっつける（デザインイメージ） */}
          <div className="flex flex-col">
            <SeasonTabs season={season} onSelect={setSeason} />
            <ScreenDataBoundary fallback={<SceneSkeleton />}>
              <ScenePanel season={season} conditions={chosen} />
            </ScreenDataBoundary>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ScreenDataBoundary fallback={<Skeleton className="h-40" />}>
            <EventsPanel season={season} conditions={chosen} />
          </ScreenDataBoundary>
          <KarteCard conditions={chosen} season={season} />
        </div>

        <div className="hidden xl:col-span-2 xl:block">
          <ScreenDataBoundary fallback={<Skeleton className="h-28" />}>
            <SeasonThumbnails season={season} conditions={chosen} onSelect={setSeason} />
          </ScreenDataBoundary>
        </div>
      </div>

      <ActionBar conditions={chosen} season={season} />
    </div>
  );
}

const SIDE_LINK = "flex min-h-tap items-center gap-2 border-t border-line pt-2 font-bold text-primary hover:underline";

// PC：右の「暮らしの根拠を確認」
function KarteCard({ conditions, season }: { conditions: Conditions; season: Season }) {
  return (
    <Card as="section" aria-labelledby="karte-title" className="relative hidden flex-col gap-3 pb-6 xl:flex">
      <h2 id="karte-title" className="flex items-center gap-2 text-lg font-bold">
        <PixelIcon icon="icon-book" />
        暮らしの根拠を確認
      </h2>
      <p className="text-sm">学校や住まいの情報を、出典とともに。</p>
      <ButtonLink href={karteHref(conditions, season)}>
        カルテで確かめる
        <span aria-hidden="true">→</span>
      </ButtonLink>
      <Link href={kurabeHref(conditions, SEASON_SLUGS[season])} className={SIDE_LINK}>
        <PixelIcon icon="icon-chart" />
        地区くらべ
        <span aria-hidden="true" className="ml-auto">
          ›
        </span>
      </Link>
      <Link href={mapHref(conditions, SEASON_SLUGS[season])} className={SIDE_LINK}>
        <PixelIcon icon="icon-map" />
        地図で見る
        <span aria-hidden="true" className="ml-auto">
          ›
        </span>
      </Link>
      <PixelImage asset="deco-tree" scale={2} decorative className="absolute -bottom-1 right-2" />
    </Card>
  );
}

// スマホ：画面の下に固定する「選び直す」と「カルテで確かめる」（F-14。どの季節からでも出す）
function ActionBar({ conditions, season }: { conditions: Conditions; season: Season }) {
  return (
    <BottomActionBar label="次の操作" className="justify-between xl:hidden">
      <ChooseAgainLink conditions={conditions} />
      <ButtonLink href={karteHref(conditions, season)} className="flex-1">
        カルテで確かめる
        <span aria-hidden="true">→</span>
      </ButtonLink>
    </BottomActionBar>
  );
}

function NoDistrict({ conditions }: { conditions: Conditions }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-extrabold">くらしを見る</h1>
      <Card className="flex flex-col items-start gap-3">
        <p>住む地区がまだ選ばれていません。「01 えらぶ」で地区を選ぶと、その地区の春夏秋冬の場面が見られます。</p>
        <ButtonLink href={conditionsHref(ERABU_PATH, conditions)}>
          地区をえらぶ
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </Card>
    </div>
  );
}

function SceneSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col items-center gap-4">
      <span className="sr-only">場面を読み込んでいます</span>
      <Skeleton className={`aspect-[16/9] ${SCENE_WIDTH_CLASS}`} />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
