"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataSourceNote } from "@/components/data/DataSourceNote";
import { ScreenDataBoundary, useScreenData } from "@/components/data/ScreenDataBoundary";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { SourceNote } from "@/components/ui/SourceNote";
import type { Conditions } from "@/lib/conditions/model";
import { conditionsHref } from "@/lib/conditions/url";
import { useConditions } from "@/lib/conditions/useConditions";
import { kurashiHref } from "@/lib/karte/links";
import type { ScreenData } from "@/lib/data/screen-data";
import { compareSources, eventSources } from "@/lib/kurabe/compare";
import { karteFromKurabeHref } from "@/lib/kurabe/links";
import { ERABU_PATH } from "@/lib/site";
import type { DistrictId } from "@/lib/town-district/resolve";
import { CompareBySection, CompareTable } from "./CompareLayouts";

// 04 地区くらべ（F-05）。4地区を同じ項目で並べる。点数・順位・色の良し悪しは付けず、地区の並びも固定する。
// 選んだ地区（URL の d）は目印を付けるだけ。地区を選んでいなくても見られる。useSearchParams を使うので <Suspense> の中で使う
export function KurabeView() {
  const { conditions } = useConditions();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">4地区をくらべる</h1>
        <p className="text-sm text-ink-muted">上郷・鼎・伊賀良・中心市街地を、同じ項目で並べています。地区の並びは固定で、良し悪しの順ではありません。</p>
      </div>

      <ScreenDataBoundary fallback={<ScreenSkeleton label="地区くらべを読み込んでいます" />}>
        <Comparison selected={conditions.district} />
      </ScreenDataBoundary>

      <KurabeNavigation conditions={conditions} />
    </div>
  );
}

function Comparison({ selected }: { selected: DistrictId | null }) {
  const data = useScreenData();
  const districts = data.districtOrder.map((id) => data.districts[id]);
  return (
    <>
      <CompareBySection districts={districts} selected={selected} />
      <CompareTable districts={districts} selected={selected} />
      <Sources data={data} />
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
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="font-bold">該当なし</dt>
        <dd className="text-ink-muted">出典のデータに、その地区に当てはまるものはありません。</dd>
        <dt className="font-bold">データ未取得</dt>
        <dd className="text-ink-muted">このデータは準備中です。</dd>
      </dl>
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

// 下部：カルテ・くらしに戻る。地区を選んでいなければ、えらぶへ案内する
function KurabeNavigation({ conditions }: { conditions: Conditions }) {
  const searchParams = useSearchParams();
  if (conditions.district === null) {
    return (
      <nav aria-label="ほかの見方" className="flex flex-col items-center gap-3">
        <ButtonLink href={conditionsHref(ERABU_PATH, conditions)}>
          地区をえらんで、くらしを見る
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </nav>
    );
  }
  return (
    <nav aria-label="ほかの見方" className="flex flex-col items-center gap-3">
      <ButtonLink href={karteFromKurabeHref(conditions, searchParams)} variant="secondary" className="w-full max-w-sm">
        <span aria-hidden="true">←</span>
        カルテに戻る
      </ButtonLink>
      <Link
        href={kurashiHref(conditions, searchParams)}
        className="inline-flex min-h-tap items-center justify-center gap-1 font-bold text-primary underline underline-offset-4 hover:no-underline"
      >
        くらしを見る
      </Link>
    </nav>
  );
}
